import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export interface ResumableUploadOptions {
  bucket: string;
  objectPath: string; // e.g. `${userId}/${Date.now()}.mp4`
  file: File;
  onProgress?: (percent: number) => void;
  upsert?: boolean;
  chunkSizeBytes?: number; // Supabase requires exactly 6 MB except final chunk
}

/**
 * Upload a file to Supabase Storage via TUS resumable protocol.
 * Handles retries, resumes on network drop, and reports progress.
 * Returns the public URL of the uploaded object.
 */
export async function resumableUpload({
  bucket,
  objectPath,
  file,
  onProgress,
  upsert = true,
  chunkSizeBytes = 6 * 1024 * 1024,
}: ResumableUploadOptions): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("No autenticado");
  }

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "x-upsert": upsert ? "true" : "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: objectPath,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      chunkSize: chunkSizeBytes,
      onError: (err) => {
        console.error("[resumableUpload] error:", err);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        if (onProgress && bytesTotal > 0) {
          onProgress(Math.round((bytesUploaded / bytesTotal) * 100));
        }
      },
      onSuccess: () => {
        const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
        resolve(data.publicUrl);
      },
    });

    // Resume prior attempt for same file if present
    upload.findPreviousUploads().then((previous) => {
      if (previous.length > 0) {
        upload.resumeFromPreviousUpload(previous[0]);
      }
      upload.start();
    });
  });
}
