/**
 * Client-Side Image Resizing & Compression Utility
 * Resizes large image files (e.g. 10MB+ high-res camera banners) in browser canvas
 * to an optimal web size (~150KB - 400KB) before uploading to server/object storage.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
  maxSizeBytes?: number;
}

/**
 * Compresses an image File or Blob using HTML Canvas.
 */
export async function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    mimeType = 'image/jpeg',
    maxSizeBytes = 800 * 1024 // 800 KB limit trigger
  } = options;

  // Skip non-image files or SVG vector graphics
  if (!file || !file.type || !file.type.startsWith('image/') || file.type.includes('svg')) {
    return file;
  }

  // If already under 300KB and reasonable size, return as is
  if (file.size <= 300 * 1024 && !options.maxWidth) {
    return file;
  }

  return new Promise<File>((resolve) => {
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      return resolve(file);
    }

    const img = new Image();
    img.src = objectUrl;

    const cleanup = () => {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
        objectUrl = '';
      }
    };

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (!width || !height) {
        cleanup();
        return resolve(file);
      }

      // Calculate aspect ratio scaling to fit within maxWidth x maxHeight
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        return resolve(file);
      }

      // Enable high quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          cleanup();
          if (!blob) {
            return resolve(file);
          }

          // Only use compressed blob if it actually reduced file size or file exceeded maxSizeBytes
          if (blob.size < file.size || file.size > maxSizeBytes) {
            const newFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            const compressedFile = new File([blob], newFileName, {
              type: mimeType,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      cleanup();
      resolve(file);
    };
  });
}

/**
 * Specifically tuned compression helper for Banners (max 1920x1080).
 */
export function compressBannerFile(file: File): Promise<File> {
  return compressImageFile(file, {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.85,
    maxSizeBytes: 500 * 1024
  });
}

/**
 * Specifically tuned compression helper for Avatars / Profile Pics (max 800x800).
 */
export function compressAvatarFile(file: File): Promise<File> {
  return compressImageFile(file, {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.85,
    maxSizeBytes: 300 * 1024
  });
}
