import fs from 'fs';
import path from 'path';
import { ListObjectsV2Command, DeleteObjectCommand, ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import { 
  users, 
  majors, 
  subjects, 
  course_resources, 
  news, 
  news_sources, 
  tutorials, 
  tools, 
  contributors,
  app_feedback
} from '../db/schema';
import { getS3Client, getAllBucketNames, getPersistentUploadsDir } from './storage';

export interface CleanupResult {
  deletedFiles: {
    key: string;
    source: 's3' | 'local';
    bucket?: string;
    size?: number;
  }[];
  totalDeletedCount: number;
  totalFreedBytes: number;
  referencedCount: number;
}

/**
 * Extracts clean storage keys or file basenames from any URL, path, or string.
 */
function extractStorageKeys(value: any, keysSet: Set<string>): void {
  if (!value) return;

  if (typeof value === 'object') {
    try {
      const str = JSON.stringify(value);
      extractStorageKeys(str, keysSet);
    } catch {}
    return;
  }

  if (typeof value !== 'string') return;
  const text = value.trim();
  if (!text) return;

  // Extract /uploads/... or uploads/... matches
  const uploadMatches = text.matchAll(/(?:\/uploads\/|uploads\/|^\/)([a-zA-Z0-9_\-\.\/]+)/gi);
  for (const m of uploadMatches) {
    if (m[1]) {
      const cleanKey = m[1].replace(/^\/+/, '').trim();
      if (cleanKey) {
        keysSet.add(cleanKey.toLowerCase());
        keysSet.add(path.basename(cleanKey).toLowerCase());
      }
    }
  }

  // Also extract markdown/HTML image & link URLs (e.g. <img src="...">, ![alt](url))
  const urlMatches = text.matchAll(/(?:src|href)=["']([^"']+)["']|!\[.*?\]\(([^)]+)\)/gi);
  for (const m of urlMatches) {
    const rawUrl = m[1] || m[2];
    if (rawUrl) {
      const basename = path.basename(rawUrl).split('?')[0].split('#')[0].toLowerCase();
      if (basename && (basename.includes('.') || basename.includes('_'))) {
        keysSet.add(basename);
      }
    }
  }

  // Also store raw basename & key
  const basename = path.basename(text).split('?')[0].split('#')[0].toLowerCase();
  if (basename && (basename.includes('.') || basename.includes('_'))) {
    keysSet.add(basename);
  }
}

/**
 * Scans all database tables to compile a comprehensive set of all registered file keys & paths.
 */
export async function getRegisteredStorageKeys(db: any): Promise<Set<string>> {
  const registeredSet = new Set<string>();

  // Helper to query and extract from a table column
  const harvest = async (table: any, columns: (keyof typeof table)[]): Promise<void> => {
    try {
      const rows = await db.select().from(table);
      for (const row of rows) {
        for (const col of columns) {
          const val = (row as any)[col];
          if (val) {
            extractStorageKeys(val, registeredSet);
          }
        }
      }
    } catch (err) {
      console.warn(`[Cleanup] Error harvesting table columns:`, err);
    }
  };

  await Promise.all([
    harvest(users, ['profilePicUrl']),
    harvest(majors, ['pdfUrl']),
    harvest(subjects, ['avatarUrl', 'bannerUrl', 'driveLink', 'freeResourcesUrl', 'paidResourcesUrl', 'syllabus', 'description']),
    harvest(course_resources, ['url', 'driveLink', 'boxLink', 'freeResourcesUrl', 'paidResourcesUrl', 'avatarUrl', 'bannerUrl', 'description']),
    harvest(news, ['imageUrl', 'images', 'authorAvatar', 'videoUrl', 'content', 'excerpt']),
    harvest(news_sources, ['profilePicUrl', 'bannerUrl', 'links', 'bio']),
    harvest(tutorials, ['imageUrl', 'videoUrl', 'linkUrl', 'steps', 'text']),
    harvest(tools, ['link', 'icon', 'description']),
    harvest(contributors, ['photoUrl', 'socialLinks', 'bio']),
    harvest(app_feedback, ['comment', 'targetUrl'])
  ]);

  console.log(`[Cleanup] Compiled ${registeredSet.size} registered file keys & references from database.`);
  return registeredSet;
}


/**
 * Scans storage (Garage S3 Object Storage + local disk) and deletes any file NOT registered in the DB.
 */
export async function cleanupUnregisteredStorageFiles(db: any): Promise<CleanupResult> {
  const registeredKeys = await getRegisteredStorageKeys(db);
  const deletedFiles: CleanupResult['deletedFiles'] = [];
  let totalFreedBytes = 0;

  // 1. Clean Garage S3 Object Storage Buckets
  const s3Client = getS3Client();
  if (s3Client) {
    const buckets = getAllBucketNames();
    for (const bucketName of buckets) {
      try {
        let isTruncated = true;
        let continuationToken: string | undefined = undefined;

        while (isTruncated) {
          const command = new ListObjectsV2Command({
            Bucket: bucketName,
            ContinuationToken: continuationToken,
          });

          const response = (await s3Client.send(command)) as ListObjectsV2CommandOutput;
          const contents = response.Contents || [];

          for (const obj of contents) {
            if (!obj.Key || obj.Key.endsWith('/')) continue;

            const keyLower = obj.Key.toLowerCase();
            const basenameLower = path.basename(obj.Key).toLowerCase();

            // Check if object key or basename is registered in database
            const isRegistered = registeredKeys.has(keyLower) || registeredKeys.has(basenameLower);

            if (!isRegistered) {
              console.log(`[Cleanup] Deleting unregistered S3 object "${obj.Key}" from bucket "${bucketName}"...`);
              try {
                await s3Client.send(
                  new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: obj.Key,
                  })
                );
                const size = obj.Size || 0;
                totalFreedBytes += size;
                deletedFiles.push({
                  key: obj.Key,
                  source: 's3',
                  bucket: bucketName,
                  size,
                });
              } catch (delErr: any) {
                console.warn(`[Cleanup] Failed to delete S3 key "${obj.Key}" from "${bucketName}":`, delErr.message || delErr);
              }
            }
          }

          isTruncated = !!response.IsTruncated;
          continuationToken = response.NextContinuationToken;
        }
      } catch (bucketErr: any) {
        console.warn(`[Cleanup] Error scanning S3 bucket "${bucketName}":`, bucketErr.message || bucketErr);
      }
    }
  }

  // 2. Clean Local Disk Storage (`uploads/` and `public/uploads/`)
  const localDirs = [
    getPersistentUploadsDir(),
    path.join(process.cwd(), 'public/uploads')
  ];

  const walkDir = (dirPath: string, rootDir: string): void => {
    if (!fs.existsSync(dirPath)) return;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath, rootDir);
        // Remove empty directory if clean
        try {
          if (fs.readdirSync(fullPath).length === 0) {
            fs.rmdirSync(fullPath);
          }
        } catch (e) {}
      } else if (entry.isFile()) {
        const relKey = path.relative(rootDir, fullPath).replace(/\\/g, '/');
        const relKeyLower = relKey.toLowerCase();
        const basenameLower = entry.name.toLowerCase();

        // Preserve system files like .gitkeep or .gitignore
        if (basenameLower.startsWith('.')) continue;

        const isRegistered = registeredKeys.has(relKeyLower) || registeredKeys.has(basenameLower);

        if (!isRegistered) {
          try {
            const stat = fs.statSync(fullPath);
            const size = stat.size;
            fs.unlinkSync(fullPath);
            totalFreedBytes += size;
            deletedFiles.push({
              key: relKey,
              source: 'local',
              size,
            });
            console.log(`[Cleanup] Deleted unregistered local file: ${relKey}`);
          } catch (unlinkErr: any) {
            console.warn(`[Cleanup] Could not delete local file ${fullPath}:`, unlinkErr.message || unlinkErr);
          }
        }
      }
    }
  };

  for (const dir of localDirs) {
    walkDir(dir, dir);
  }

  return {
    deletedFiles,
    totalDeletedCount: deletedFiles.length,
    totalFreedBytes,
    referencedCount: registeredKeys.size,
  };
}
