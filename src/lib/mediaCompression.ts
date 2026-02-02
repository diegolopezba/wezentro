/**
 * Client-side media compression utilities
 * Uses Canvas API for image compression (works in all WebViews including Capacitor)
 */

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export interface CompressionProgress {
  status: 'loading' | 'compressing' | 'done';
  progress: number;
}

/**
 * Get image dimensions from a File
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Check if WebP format is supported
 */
const isWebPSupported = (): boolean => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').startsWith('data:image/webp');
};

/**
 * Compress an image file using Canvas API
 * 
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param quality - Compression quality 0-1 (default: 0.8)
 * @param onProgress - Optional callback for progress updates
 * @returns Compressed blob with metadata
 */
export const compressImage = async (
  file: File,
  maxWidth: number = 1920,
  quality: number = 0.8,
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> => {
  onProgress?.({ status: 'loading', progress: 0 });

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      onProgress?.({ status: 'compressing', progress: 30 });

      try {
        // Calculate new dimensions maintaining aspect ratio
        let { naturalWidth: width, naturalHeight: height } = img;
        
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height / width) * maxWidth);
            width = maxWidth;
          } else {
            width = Math.round((width / height) * maxWidth);
            height = maxWidth;
          }
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Use high-quality image scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        onProgress?.({ status: 'compressing', progress: 70 });

        // Try WebP first, fallback to JPEG
        const outputFormat = isWebPSupported() ? 'image/webp' : 'image/jpeg';

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            onProgress?.({ status: 'done', progress: 100 });

            resolve({
              blob,
              originalSize: file.size,
              compressedSize: blob.size,
              compressionRatio: Math.round((1 - blob.size / file.size) * 100),
            });
          },
          outputFormat,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = objectUrl;
  });
};

/**
 * Convert a Blob to a File object
 */
export const blobToFile = (blob: Blob, originalFileName: string): File => {
  // Determine new extension based on blob type
  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const baseName = originalFileName.replace(/\.[^.]+$/, '');
  const newFileName = `${baseName}.${extension}`;

  return new File([blob], newFileName, { type: blob.type });
};

/**
 * Format bytes to human-readable string
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
