/**
 * Extracts dominant colors from an image or video frame
 * Returns RGB values that can be used for dynamic backgrounds
 */

export interface ExtractedColors {
  primary: string;
  secondary: string;
  tertiary: string;
}

const DEFAULT_COLORS: ExtractedColors = {
  primary: 'rgba(20, 20, 25, 0.85)',
  secondary: 'rgba(15, 15, 20, 0.9)',
  tertiary: 'rgba(10, 10, 15, 0.95)',
};

/**
 * Samples a color from a specific position in the canvas
 */
function sampleColor(ctx: CanvasRenderingContext2D, x: number, y: number, sampleSize: number = 10): [number, number, number] {
  const imageData = ctx.getImageData(
    Math.max(0, x - sampleSize / 2),
    Math.max(0, y - sampleSize / 2),
    sampleSize,
    sampleSize
  );
  
  let r = 0, g = 0, b = 0, count = 0;
  
  for (let i = 0; i < imageData.data.length; i += 4) {
    r += imageData.data[i];
    g += imageData.data[i + 1];
    b += imageData.data[i + 2];
    count++;
  }
  
  return [
    Math.round(r / count),
    Math.round(g / count),
    Math.round(b / count)
  ];
}

/**
 * Darkens a color by a factor (0-1)
 */
function darkenColor(r: number, g: number, b: number, factor: number = 0.3): [number, number, number] {
  return [
    Math.round(r * factor),
    Math.round(g * factor),
    Math.round(b * factor)
  ];
}

/**
 * Extracts colors from an HTMLImageElement
 */
export function extractColorsFromImage(img: HTMLImageElement): ExtractedColors {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return DEFAULT_COLORS;
    
    // Use a smaller canvas for performance
    const maxSize = 100;
    const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight);
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;
    
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Sample from different regions (bottom-left, bottom-center, bottom-right)
    const bottomY = canvas.height * 0.85;
    
    const [r1, g1, b1] = sampleColor(ctx, canvas.width * 0.2, bottomY, 20);
    const [r2, g2, b2] = sampleColor(ctx, canvas.width * 0.5, bottomY, 20);
    const [r3, g3, b3] = sampleColor(ctx, canvas.width * 0.8, bottomY, 20);
    
    // Darken the colors for the glass effect
    const [dr1, dg1, db1] = darkenColor(r1, g1, b1, 0.35);
    const [dr2, dg2, db2] = darkenColor(r2, g2, b2, 0.3);
    const [dr3, dg3, db3] = darkenColor(r3, g3, b3, 0.25);
    
    return {
      primary: `rgba(${dr1}, ${dg1}, ${db1}, 0.85)`,
      secondary: `rgba(${dr2}, ${dg2}, ${db2}, 0.9)`,
      tertiary: `rgba(${dr3}, ${dg3}, ${db3}, 0.95)`,
    };
  } catch (error) {
    console.error('Error extracting colors from image:', error);
    return DEFAULT_COLORS;
  }
}

/**
 * Extracts colors from an HTMLVideoElement
 */
export function extractColorsFromVideo(video: HTMLVideoElement): ExtractedColors {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return DEFAULT_COLORS;
    
    // Use a smaller canvas for performance
    const maxSize = 100;
    const scale = Math.min(maxSize / video.videoWidth, maxSize / video.videoHeight);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Sample from different regions (bottom-left, bottom-center, bottom-right)
    const bottomY = canvas.height * 0.85;
    
    const [r1, g1, b1] = sampleColor(ctx, canvas.width * 0.2, bottomY, 20);
    const [r2, g2, b2] = sampleColor(ctx, canvas.width * 0.5, bottomY, 20);
    const [r3, g3, b3] = sampleColor(ctx, canvas.width * 0.8, bottomY, 20);
    
    // Darken the colors for the glass effect
    const [dr1, dg1, db1] = darkenColor(r1, g1, b1, 0.35);
    const [dr2, dg2, db2] = darkenColor(r2, g2, b2, 0.3);
    const [dr3, dg3, db3] = darkenColor(r3, g3, b3, 0.25);
    
    return {
      primary: `rgba(${dr1}, ${dg1}, ${db1}, 0.85)`,
      secondary: `rgba(${dr2}, ${dg2}, ${db2}, 0.9)`,
      tertiary: `rgba(${dr3}, ${dg3}, ${db3}, 0.95)`,
    };
  } catch (error) {
    console.error('Error extracting colors from video:', error);
    return DEFAULT_COLORS;
  }
}

/**
 * Creates a CSS gradient string from extracted colors
 */
export function createGradientFromColors(colors: ExtractedColors): string {
  return `linear-gradient(to bottom, ${colors.primary} 0%, ${colors.secondary} 50%, ${colors.tertiary} 100%)`;
}
