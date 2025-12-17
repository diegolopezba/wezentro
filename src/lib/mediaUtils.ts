/**
 * Media utility functions for handling video and image files
 */

const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'quicktime'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

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
 * Validate a video file for upload
 * @param file - The video file to validate
 * @param maxDurationSeconds - Maximum allowed duration in seconds (default: 15)
 * @param maxSizeMB - Maximum allowed file size in MB (default: 50)
 */
export const validateVideoFile = async (
  file: File,
  maxDurationSeconds: number = 15,
  maxSizeMB: number = 50
): Promise<{ valid: boolean; error?: string; duration?: number }> => {
  // Check file size
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return { valid: false, error: `Video must be less than ${maxSizeMB}MB` };
  }
  
  // Check duration
  try {
    const duration = await getVideoDuration(file);
    if (duration > maxDurationSeconds) {
      return { 
        valid: false, 
        error: `Video must be ${maxDurationSeconds} seconds or less (yours is ${Math.ceil(duration)}s)`,
        duration 
      };
    }
    return { valid: true, duration };
  } catch (error) {
    return { valid: false, error: 'Failed to read video file' };
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
    return { valid: false, error: `Image must be less than ${maxSizeMB}MB` };
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
