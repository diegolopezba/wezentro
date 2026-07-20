/**
 * Media utility functions for handling video and image files
 */

const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'quicktime'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

// Video constraints for native app optimization
const MAX_VIDEO_SIZE_MB = 50; // Allows ~60s at 720p with headroom
const MAX_VIDEO_RESOLUTION = 720; // 720p max

/**
 * Check if a URL points to a video file
 */
export const isVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const extension = url.split('.').pop()?.toLowerCase();
  return VIDEO_EXTENSIONS.includes(extension || '');
};

/**
 * Check if a URL points to an image file
 */
export const isImageUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const extension = url.split('.').pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.includes(extension || '');
};

/**
 * Check if a File is a video
 */
export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/');
};

/**
 * Check if a File is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Get video duration in seconds using HTML5 video element
 */
export const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
};

/**
 * Get video dimensions (width and height)
 */
export const getVideoDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({ width: video.videoWidth, height: video.videoHeight });
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
};

export interface VideoValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  duration?: number;
  dimensions?: { width: number; height: number };
}

/**
 * Validate a video file for upload
 * @param file - The video file to validate
 * @param maxDurationSeconds - Maximum allowed duration in seconds (default: 15)
 * @param maxSizeMB - Maximum allowed file size in MB (default: 20)
 */
export const validateVideoFile = async (
  file: File,
  maxDurationSeconds: number = 60,
  maxSizeMB: number = MAX_VIDEO_SIZE_MB
): Promise<VideoValidationResult> => {
  // Check file size
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return { valid: false, error: `El video debe ser menor a ${maxSizeMB}MB (el tuyo es ${sizeMB.toFixed(1)}MB)` };
  }
  
  // Check duration and dimensions
  try {
    const [duration, dimensions] = await Promise.all([
      getVideoDuration(file),
      getVideoDimensions(file),
    ]);

    if (duration > maxDurationSeconds) {
      return { 
        valid: false, 
        error: `El video debe ser de ${maxDurationSeconds} segundos o menos (el tuyo es ${Math.ceil(duration)}s)`,
        duration,
        dimensions,
      };
    }

    // Check resolution - warn but don't block
    const maxDimension = Math.max(dimensions.width, dimensions.height);
    let warning: string | undefined;
    if (maxDimension > MAX_VIDEO_RESOLUTION) {
      warning = `Videos en alta resolución (${dimensions.width}x${dimensions.height}) pueden tardar más en subir`;
    }

    return { valid: true, duration, dimensions, warning };
  } catch (error) {
    return { valid: false, error: 'No se pudo leer el archivo de video' };
  }
};

/**
 * Validate an image file for upload
 * @param file - The image file to validate
 * @param maxSizeMB - Maximum allowed file size in MB (default: 5)
 */
export const validateImageFile = (
  file: File,
  maxSizeMB: number = 5
): { valid: boolean; error?: string } => {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return { valid: false, error: `La imagen debe ser menor a ${maxSizeMB}MB` };
  }
  return { valid: true };
};

/**
 * Format duration in seconds to a readable string (e.g., "0:15")
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
