import fs from 'fs';
import path from 'path';
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  HeadBucketCommand, 
  CreateBucketCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput
} from '@aws-sdk/client-s3';

let s3Client: S3Client | null = null;
const initializedBuckets = new Set<string>();

export function isS3Configured(): boolean {
  return !!(
    (process.env.S3_ENDPOINT || process.env.RUSTFS_ENDPOINT) &&
    (process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || process.env.RUSTFS_ACCESS_KEY) &&
    (process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || process.env.RUSTFS_SECRET_KEY)
  );
}

/**
 * Resolves the appropriate S3 Bucket Name based on file category, filename, or mimeType.
 * Supported Buckets:
 * 1. plans -> imamu-plans (S3_BUCKET_PLANS)
 * 2. pfp -> imamu-pfps (S3_BUCKET_PFPS)
 * 3. dalilah -> imamu-dalilah (S3_BUCKET_DALILAH)
 * 4. resources -> imamu-resources (S3_BUCKET_RESOURCES)
 * 5. news -> imamu-news (S3_BUCKET_NEWS)
 * 6. fallback -> imamu-uploads (S3_BUCKET_NAME)
 */
export function getS3BucketName(category?: string, filename?: string, mimeType?: string): string {
  const cat = (category || '').toLowerCase().trim();
  const file = (filename || '').toLowerCase().trim();
  const mime = (mimeType || '').toLowerCase().trim();

  // 1. Study Plans & PDF Bucket (imamu-plans)
  if (
    cat === 'plan' || cat === 'plans' || cat === 'study_plan' || cat === 'pdf' || cat === 'pdfs' || cat === 'major' || cat === 'majors' ||
    file.endsWith('.pdf') || mime === 'application/pdf'
  ) {
    return process.env.S3_BUCKET_PLANS || process.env.S3_BUCKET_PDFS || 'imamu-plans';
  }

  // 2. Profile Pictures (PFP / Avatars)
  if (
    cat === 'pfp' || cat === 'pfps' || cat === 'avatar' || cat === 'avatars' || cat === 'profile' || cat === 'tg_avatar' || cat === 'wa_avatar' || cat === 'user_pfp' || cat === 'user' || cat === 'users'
  ) {
    return process.env.S3_BUCKET_PFPS || 'imamu-pfps';
  }

  // 3. Dalilah (الدليلة / دليل الطالب)
  if (
    cat === 'dalilah' || cat === 'guide' || cat === 'guides' || cat === 'dalila'
  ) {
    return process.env.S3_BUCKET_DALILAH || 'imamu-dalilah';
  }

  // 4. Resources (المصادر والملفات الدراسية)
  if (
    cat === 'resource' || cat === 'resources' || cat === 'course' || cat === 'courses' || cat === 'subject' || cat === 'subjects' || cat === 'subj_avatar'
  ) {
    return process.env.S3_BUCKET_RESOURCES || 'imamu-resources';
  }

  // 5. News (الأخبار والإعلانات)
  if (
    cat === 'news' || cat === 'announcement' || cat === 'announcements' || cat === 'article' || cat === 'articles' || cat === 'tg_photo' || cat === 'news_source'
  ) {
    return process.env.S3_BUCKET_NEWS || 'imamu-news';
  }

  // Fallback bucket
  return process.env.S3_BUCKET_NAME || process.env.RUSTFS_BUCKET || 'imamu-uploads';
}

export function getAllBucketNames(): string[] {
  return Array.from(new Set([
    process.env.S3_BUCKET_PLANS || process.env.S3_BUCKET_PDFS || 'imamu-plans',
    process.env.S3_BUCKET_PFPS || 'imamu-pfps',
    process.env.S3_BUCKET_DALILAH || 'imamu-dalilah',
    process.env.S3_BUCKET_RESOURCES || 'imamu-resources',
    process.env.S3_BUCKET_NEWS || 'imamu-news',
    process.env.S3_BUCKET_NAME || process.env.RUSTFS_BUCKET || 'imamu-uploads'
  ]));
}

export function getS3Client(): S3Client | null {
  if (!isS3Configured()) return null;

  if (!s3Client) {
    const endpoint = process.env.S3_ENDPOINT || process.env.RUSTFS_ENDPOINT;
    const accessKeyId = (
      process.env.S3_ACCESS_KEY_ID || 
      process.env.AWS_ACCESS_KEY_ID || 
      process.env.RUSTFS_ACCESS_KEY || 
      ''
    );
    const secretAccessKey = (
      process.env.S3_SECRET_ACCESS_KEY || 
      process.env.AWS_SECRET_ACCESS_KEY || 
      process.env.RUSTFS_SECRET_KEY || 
      ''
    );
    const region = process.env.S3_REGION || 'us-east-1';
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== 'false';

    s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle,
    });
    console.log(`[Storage] Initialized S3 client for Garage Object Storage at ${endpoint}`);
  }

  return s3Client;
}

export async function ensureBucketExists(bucketName?: string): Promise<void> {
  const client = getS3Client();
  if (!client) return;

  const targetBucket = bucketName || getS3BucketName();
  if (initializedBuckets.has(targetBucket)) return;

  try {
    await client.send(new HeadBucketCommand({ Bucket: targetBucket }));
    initializedBuckets.add(targetBucket);
    console.log(`[Storage] S3 Bucket "${targetBucket}" exists and is ready.`);
  } catch (err: any) {
    initializedBuckets.add(targetBucket);
    const name = err.name || err.code;
    const status = err.$metadata?.httpStatusCode;

    if (name === 'NotFound' || status === 404) {
      console.log(`[Storage] S3 Bucket "${targetBucket}" does not exist. Creating...`);
      try {
        await client.send(new CreateBucketCommand({ Bucket: targetBucket }));
        console.log(`[Storage] Successfully created S3 Bucket "${targetBucket}".`);
      } catch (createErr: any) {
        const cName = createErr.name || createErr.code;
        if (cName === 'BucketAlreadyOwnedByYou' || cName === 'BucketAlreadyExists') {
          console.log(`[Storage] S3 Bucket "${targetBucket}" already exists.`);
        } else {
          console.warn(`[Storage] Could not create bucket "${targetBucket}":`, createErr.message || createErr);
        }
      }
    } else if (name === 'BucketAlreadyOwnedByYou' || name === 'BucketAlreadyExists') {
      console.log(`[Storage] S3 Bucket "${targetBucket}" already exists.`);
    } else {
      console.warn(`[Storage] Notice checking S3 bucket "${targetBucket}":`, err.message || err);
    }
  }
}

export async function ensureAllBucketsExist(): Promise<void> {
  const buckets = getAllBucketNames();
  for (const bucket of buckets) {
    await ensureBucketExists(bucket);
  }
}

export function getPersistentUploadsDir(): string {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

/**
 * Uploads a file to Garage Object Storage in its category-specific S3 Bucket (or local disk fallback).
 */
export async function uploadFileToStorage(
  fileBuffer: Buffer,
  filename: string,
  mimeType?: string,
  category?: string
): Promise<{ url: string; key: string; bucket: string }> {
  const client = getS3Client();
  const bucketName = getS3BucketName(category, filename, mimeType);

  if (client) {
    try {
      await ensureBucketExists(bucketName);
      const key = filename;

      await client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: mimeType || 'application/octet-stream',
        })
      );

      console.log(`[Storage] Uploaded "${key}" to S3 bucket "${bucketName}".`);

      if (process.env.S3_PUBLIC_URL) {
        const publicBaseUrl = process.env.S3_PUBLIC_URL.replace(/\/$/, '');
        return { url: `${publicBaseUrl}/${key}`, key, bucket: bucketName };
      }

      return { url: `/uploads/${key}`, key, bucket: bucketName };
    } catch (s3Err: any) {
      console.warn(`[Storage] S3 upload to bucket "${bucketName}" failed, falling back to disk:`, s3Err.message || s3Err);
    }
  }

  // Local persistent disk fallback (stored in /uploads outside public/ so next build/rebuild won't wipe it)
  const uploadsDir = getPersistentUploadsDir();
  const filePath = path.join(uploadsDir, filename);
  const fileDir = path.dirname(filePath);
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true });
  }
  fs.writeFileSync(filePath, fileBuffer);

  // Copy to public/uploads as well for immediate static serving if needed
  try {
    const legacyPublicDir = path.join(process.cwd(), 'public/uploads', path.dirname(filename));
    if (!fs.existsSync(legacyPublicDir)) {
      fs.mkdirSync(legacyPublicDir, { recursive: true });
    }
    fs.writeFileSync(path.join(process.cwd(), 'public/uploads', filename), fileBuffer);
  } catch (e) {}

  console.log(`[Storage] Uploaded "${filename}" to persistent disk storage.`);

  return { url: `/uploads/${filename}`, key: filename, bucket: bucketName };
}

/**
 * Retrieves a file buffer and content type from Garage S3 (checking target & candidate buckets) or local disk.
 */
export async function getFileFromStorage(
  filename: string,
  category?: string
): Promise<{ buffer: Buffer; mimeType?: string; bucket?: string } | null> {
  const client = getS3Client();

  if (client) {
    const targetBucket = getS3BucketName(category, filename);
    const candidateBuckets = Array.from(new Set([targetBucket, ...getAllBucketNames(), 'imamu-pdfs']));

    for (const bucketName of candidateBuckets) {
      try {
        const response = await client.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: filename,
          })
        );

        if (response.Body) {
          const bytes = await response.Body.transformToByteArray();
          const buffer = Buffer.from(bytes);
          return {
            buffer,
            mimeType: response.ContentType,
            bucket: bucketName,
          };
        }
      } catch (err: any) {
        // Continue searching in candidate buckets if not found in current one
      }
    }
  }

  // Fallback to local persistent disk
  const uploadsDir = getPersistentUploadsDir();
  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) {
    const buffer = fs.readFileSync(filePath);
    return { buffer };
  }
  const legacyPath = path.join(process.cwd(), 'public/uploads', filename);
  if (fs.existsSync(legacyPath)) {
    const buffer = fs.readFileSync(legacyPath);
    return { buffer };
  }
  return null;
}

/**
 * Deletes a file from Garage S3 (across all category buckets) or local disk.
 */
export async function deleteFileFromStorage(filename: string, category?: string): Promise<void> {
  const client = getS3Client();

  if (client) {
    const targetBucket = getS3BucketName(category, filename);
    const candidateBuckets = Array.from(new Set([targetBucket, ...getAllBucketNames(), 'imamu-pdfs']));

    for (const bucketName of candidateBuckets) {
      try {
        await client.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: filename,
          })
        );
        console.log(`[Storage] Deleted "${filename}" from S3 bucket "${bucketName}".`);
      } catch (err: any) {}
    }
  }

  // Clean up persistent local files if present
  const uploadsDir = getPersistentUploadsDir();
  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (e) {}
  }
  const legacyPath = path.join(process.cwd(), 'public/uploads', filename);
  if (fs.existsSync(legacyPath)) {
    try { fs.unlinkSync(legacyPath); } catch (e) {}
  }
}

/**
 * Downloads an external image URL (or decodes base64 image data)
 * and uploads it directly to Garage S3 Object Storage under its appropriate bucket.
 */
export async function downloadAndUploadToStorage(
  rawUrl: string,
  prefix: string = 'file',
  category?: string
): Promise<string | null> {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();

  // If already saved in local/S3 uploads, return as is
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  try {
    let buffer: Buffer;
    let mimeType = 'image/jpeg';
    let ext = 'jpg';

    if (trimmed.startsWith('data:image/')) {
      const match = trimmed.match(/^data:(image\/([a-zA-Z0-9+-]+));base64,(.+)$/);
      if (!match) return null;
      mimeType = match[1];
      ext = match[2] === 'jpeg' ? 'jpg' : match[2];
      buffer = Buffer.from(match[3], 'base64');
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const resp = await fetch(trimmed, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      });

      if (!resp.ok) {
        return null;
      }

      const ct = resp.headers.get('content-type');
      if (ct) {
        mimeType = ct.split(';')[0].trim();
        if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('webp')) ext = 'webp';
        else if (mimeType.includes('gif')) ext = 'gif';
        else if (mimeType.includes('svg')) ext = 'svg';
        else ext = 'jpg';
      }

      const arrayBuffer = await resp.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      return null;
    }

    if (!buffer || buffer.length === 0) return null;

    const filename = `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const result = await uploadFileToStorage(buffer, filename, mimeType, category || prefix);
    return result.url;
  } catch (err: any) {
    console.error(`[Storage] Error downloading and storing image from "${rawUrl}":`, err.message || err);
    return null;
  }
}

export interface StorageFileItem {
  id: string;
  title: string;
  url: string;
  key: string;
  size?: number;
  lastModified?: Date;
}

/**
 * Dynamically queries Garage S3 imamu-plans bucket for all PDF files matching a major ID/name.
 */
export async function listMajorPlansFromS3(
  majorId: string | number,
  majorName?: string,
  fallbackPdfUrl?: string | null
): Promise<StorageFileItem[]> {
  const client = getS3Client();
  const bucketName = process.env.S3_BUCKET_PLANS || process.env.S3_BUCKET_PDFS || 'imamu-plans';
  const idStr = String(majorId);
  const items: StorageFileItem[] = [];
  const seenKeys = new Set<string>();

  if (client) {
    try {
      await ensureBucketExists(bucketName);

      // 1. List objects with prefix majors/${idStr}/ and majors/${majorName}/
      const prefixesToList = [`majors/${idStr}/`];
      if (majorName) {
        prefixesToList.push(`majors/${majorName}/`);
      }

      for (const prefix of prefixesToList) {
        let isTruncated = true;
        let continuationToken: string | undefined = undefined;

        while (isTruncated) {
          const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          });

          const response = (await client.send(command)) as ListObjectsV2CommandOutput;
          const contents = response.Contents || [];

          for (const obj of contents) {
            if (!obj.Key || obj.Key.endsWith('/')) continue;
            if (seenKeys.has(obj.Key)) continue;
            seenKeys.add(obj.Key);

            const rawFilename = path.basename(obj.Key);
            const title = rawFilename
              .replace(/\.pdf$/i, '')
              .replace(/_/g, ' ')
              .replace(/^[0-9]+_/, '')
              .replace(/_[0-9a-f]{4,8}$/i, '')
              .trim() || (majorName ? `خطة ${majorName}` : `خطة ${idStr}`);

            const url = obj.Key.startsWith('/') ? obj.Key : `/uploads/${obj.Key}`;

            items.push({
              id: obj.Key,
              title,
              url,
              key: obj.Key,
              size: obj.Size,
              lastModified: obj.LastModified,
            });
          }

          isTruncated = !!response.IsTruncated;
          continuationToken = response.NextContinuationToken;
        }
      }

      // 2. Also check root/all objects in imamu-plans matching majorId or majorName
      let isTruncated = true;
      let continuationToken: string | undefined = undefined;

      while (isTruncated) {
        const command = new ListObjectsV2Command({
          Bucket: bucketName,
          ContinuationToken: continuationToken,
        });

        const response = (await client.send(command)) as ListObjectsV2CommandOutput;
        const contents = response.Contents || [];

        for (const obj of contents) {
          if (!obj.Key || obj.Key.endsWith('/')) continue;
          if (seenKeys.has(obj.Key)) continue;

          const keyLower = obj.Key.toLowerCase();
          const nameLower = (majorName || '').toLowerCase();
          const isMatch = keyLower.includes(idStr) || (nameLower && keyLower.includes(nameLower));

          if (isMatch) {
            seenKeys.add(obj.Key);
            const rawFilename = path.basename(obj.Key);
            const title = rawFilename
              .replace(/\.pdf$/i, '')
              .replace(/_/g, ' ')
              .replace(/^[0-9]+_/, '')
              .replace(/_[0-9a-f]{4,8}$/i, '')
              .trim() || `خطة ${majorName || idStr}`;

            const url = obj.Key.startsWith('/') ? obj.Key : `/uploads/${obj.Key}`;

            items.push({
              id: obj.Key,
              title,
              url,
              key: obj.Key,
              size: obj.Size,
              lastModified: obj.LastModified,
            });
          }
        }

        isTruncated = !!response.IsTruncated;
        continuationToken = response.NextContinuationToken;
      }
    } catch (err: any) {
      console.warn(`[Storage] Failed to list plans from S3 bucket "${bucketName}":`, err.message || err);
    }
  }

  // 3. Fallback / DB pdfUrl check
  if (fallbackPdfUrl && fallbackPdfUrl.trim()) {
    const cleanUrl = fallbackPdfUrl.trim();
    const key = cleanUrl.replace(/^\/uploads\//, '');
    if (!seenKeys.has(key) && !seenKeys.has(cleanUrl)) {
      items.unshift({
        id: 'official-db-pdf',
        title: majorName ? `${majorName} (الخطة الرسمية)` : 'الخطة الرسمية',
        url: cleanUrl,
        key: key
      });
    }
  }

  return items;
}

/**
 * Uploads a study plan PDF into imamu-plans under majors/{majorId}/{filename}
 */
export async function uploadMajorPlanToStorage(
  fileBuffer: Buffer,
  filename: string,
  majorId: string | number,
  mimeType: string = 'application/pdf'
): Promise<{ url: string; key: string; bucket: string }> {
  const rawBase = path.basename(filename, path.extname(filename));
  const cleanName = rawBase
    .normalize('NFC')
    .replace(/[^\w\u0600-\u06FF\s-]/g, '')
    .trim()
    .replace(/[\s+]+/g, '_');

  const objectKey = `majors/${majorId}/${cleanName || 'Plan'}_${crypto.randomUUID().slice(0, 4)}.pdf`;
  return uploadFileToStorage(fileBuffer, objectKey, mimeType, 'plan');
}

