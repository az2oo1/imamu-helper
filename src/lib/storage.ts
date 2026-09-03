import fs from 'fs';
import path from 'path';
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  HeadBucketCommand, 
  CreateBucketCommand 
} from '@aws-sdk/client-s3';

let s3Client: S3Client | null = null;
let bucketInitialized = false;

export function isS3Configured(): boolean {
  return !!(
    (process.env.S3_ENDPOINT || process.env.RUSTFS_ENDPOINT) &&
    (process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || process.env.RUSTFS_ACCESS_KEY) &&
    (process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || process.env.RUSTFS_SECRET_KEY)
  );
}

export function getS3BucketName(): string {
  return (
    process.env.S3_BUCKET_NAME || 
    process.env.RUSTFS_BUCKET || 
    'imamu-uploads'
  );
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
    console.log(`[Storage] Initialized S3 client for RustFS / Object Storage at ${endpoint}`);
  }

  return s3Client;
}

export async function ensureBucketExists(): Promise<void> {
  const client = getS3Client();
  if (!client || bucketInitialized) return;

  const bucketName = getS3BucketName();
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    bucketInitialized = true;
    console.log(`[Storage] S3 Bucket "${bucketName}" exists and is ready.`);
  } catch (err: any) {
    bucketInitialized = true;
    const name = err.name || err.code;
    const status = err.$metadata?.httpStatusCode;

    if (name === 'NotFound' || status === 404) {
      console.log(`[Storage] S3 Bucket "${bucketName}" does not exist. Creating...`);
      try {
        await client.send(new CreateBucketCommand({ Bucket: bucketName }));
        console.log(`[Storage] Successfully created S3 Bucket "${bucketName}".`);
      } catch (createErr: any) {
        const cName = createErr.name || createErr.code;
        if (cName === 'BucketAlreadyOwnedByYou' || cName === 'BucketAlreadyExists') {
          console.log(`[Storage] S3 Bucket "${bucketName}" already exists.`);
        } else {
          console.warn(`[Storage] Could not create bucket "${bucketName}":`, createErr.message || createErr);
        }
      }
    } else if (name === 'BucketAlreadyOwnedByYou' || name === 'BucketAlreadyExists') {
      console.log(`[Storage] S3 Bucket "${bucketName}" already exists.`);
    } else {
      console.warn(`[Storage] Notice checking S3 bucket "${bucketName}":`, err.message || err);
    }
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
 * Uploads a file to RustFS Object Storage (or local disk fallback).
 */
export async function uploadFileToStorage(
  fileBuffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<{ url: string; key: string }> {
  const client = getS3Client();

  if (client) {
    try {
      await ensureBucketExists();
      const bucketName = getS3BucketName();
      const key = filename;

      await client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: mimeType || 'application/octet-stream',
        })
      );

      console.log(`[Storage] Uploaded "${key}" to RustFS S3 bucket "${bucketName}".`);

      if (process.env.S3_PUBLIC_URL) {
        const publicBaseUrl = process.env.S3_PUBLIC_URL.replace(/\/$/, '');
        return { url: `${publicBaseUrl}/${key}`, key };
      }

      return { url: `/uploads/${key}`, key };
    } catch (s3Err: any) {
      console.warn(`[Storage] S3 upload failed, falling back to local persistent disk storage:`, s3Err.message || s3Err);
    }
  }

  // Local persistent disk fallback (stored in /uploads outside public/ so next build/rebuild won't wipe it)
  const uploadsDir = getPersistentUploadsDir();
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, fileBuffer);

  // Copy to public/uploads as well for immediate static serving if needed
  try {
    const legacyPublicDir = path.join(process.cwd(), 'public/uploads');
    if (!fs.existsSync(legacyPublicDir)) {
      fs.mkdirSync(legacyPublicDir, { recursive: true });
    }
    fs.writeFileSync(path.join(legacyPublicDir, filename), fileBuffer);
  } catch (e) {}

  console.log(`[Storage] Uploaded "${filename}" to persistent disk storage.`);

  return { url: `/uploads/${filename}`, key: filename };
}

/**
 * Retrieves a file buffer and content type from RustFS S3 or local disk.
 */
export async function getFileFromStorage(
  filename: string
): Promise<{ buffer: Buffer; mimeType?: string } | null> {
  const client = getS3Client();

  if (client) {
    try {
      const bucketName = getS3BucketName();
      const response = await client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: filename,
        })
      );

      if (!response.Body) return null;

      const bytes = await response.Body.transformToByteArray();
      const buffer = Buffer.from(bytes);
      return {
        buffer,
        mimeType: response.ContentType,
      };
    } catch (err: any) {
      console.error(`[Storage] Error fetching "${filename}" from S3:`, err.message || err);
      // Fallback to persistent disk
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
  } else {
    // Read from persistent local disk
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
}

/**
 * Deletes a file from RustFS S3 or local disk.
 */
export async function deleteFileFromStorage(filename: string): Promise<void> {
  const client = getS3Client();

  if (client) {
    try {
      const bucketName = getS3BucketName();
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: filename,
        })
      );
      console.log(`[Storage] Deleted "${filename}" from RustFS S3.`);
    } catch (err: any) {
      console.error(`[Storage] Error deleting "${filename}" from S3:`, err.message || err);
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
 * and uploads it directly to Garage S3 Object Storage (or local disk fallback).
 */
export async function downloadAndUploadToStorage(
  rawUrl: string,
  prefix: string = 'img'
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
        // Silently return null for external CDN URLs (e.g. telesco.pe) that return 404 or expire
        return null;
      }

      contentTypeHeader(resp.headers.get('content-type'));
      function contentTypeHeader(ct: string | null) {
        if (ct) {
          mimeType = ct.split(';')[0].trim();
          if (mimeType.includes('png')) ext = 'png';
          else if (mimeType.includes('webp')) ext = 'webp';
          else if (mimeType.includes('gif')) ext = 'gif';
          else if (mimeType.includes('svg')) ext = 'svg';
          else ext = 'jpg';
        }
      }

      const arrayBuffer = await resp.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      return null;
    }

    if (!buffer || buffer.length === 0) return null;

    const filename = `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const result = await uploadFileToStorage(buffer, filename, mimeType);
    return result.url;
  } catch (err: any) {
    console.error(`[Storage] Error downloading and storing image from "${rawUrl}":`, err.message || err);
    return null;
  }
}

