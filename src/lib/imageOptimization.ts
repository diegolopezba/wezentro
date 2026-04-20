/**
 * Image optimization helpers for Supabase Storage.
 * 
 * Supabase storage URLs follow this pattern:
 *   https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
 * 
 * They support transformation via query params:
 *   ?width=480&quality=70&resize=cover
 * 
 * Non-storage URLs (lovable-uploads, external) are returned unchanged.
 */

const STORAGE_PATH = "/storage/v1/object/public/";

export const isSupabaseStorageUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return url.includes(STORAGE_PATH);
};

/**
 * Returns an optimized variant of a Supabase storage URL.
 * @param url Original image URL
 * @param width Target render width (CSS px). The transform serves a 2x DPR-friendly size internally.
 * @param quality 1-100, defaults to 75
 */
export const getOptimizedImageUrl = (
  url: string | null | undefined,
  width: number,
  quality: number = 75
): string => {
  if (!url) return "";
  if (!isSupabaseStorageUrl(url)) return url;
  // Strip any existing query params to avoid duplication.
  const base = url.split("?")[0];
  return `${base}?width=${width}&quality=${quality}&resize=cover`;
};

/**
 * Common preset sizes used across the app.
 */
export const ImageSizes = {
  avatarXs: 40,    // notification rows, tiny avatars
  avatarSm: 80,    // standard avatars
  avatarMd: 160,   // profile header
  thumb: 320,      // chat thumbnails, message previews
  card: 480,       // event cards in feed
  hero: 1080,      // event detail hero
} as const;
