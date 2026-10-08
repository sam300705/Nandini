import { supabase } from "@/integrations/supabase/client";

const TUS_VERSION = "1.0.0";
const CHUNK_SIZE = 6 * 1024 * 1024;
const RETRY_DELAYS = [0, 1500, 3000, 6000, 10000];

type UploadOptions = {
  bucket: string;
  objectPath: string;
  file: File;
  contentType: string;
  onProgress?: (uploaded: number, total: number) => void;
};

function toBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function resumableEndpoint() {
  const projectId = String(import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "").trim();
  const projectUrl = String(import.meta.env["VITE_SUPABASE_URL"] ?? "").trim();

  if (projectId) {
    return `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
  }

  const url = new URL(projectUrl);
  const ref = url.hostname.split(".")[0];
  if (!ref) throw new Error("Storage upload configuration is missing.");
  return `https://${ref}.storage.supabase.co/storage/v1/upload/resumable`;
}

async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Please sign in again before uploading.");

  const key = String(import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "").trim();
  return {
    Authorization: `Bearer ${session.access_token}`,
    ...(key ? { apikey: key } : {}),
  };
}

async function sleep(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

function uploadError(status: number) {
  if (status === 413) {
    return new Error(
      "This video is larger than the Supabase project's current global file limit. The Gallery itself has no app-level size cap.",
    );
  }
  if (status === 401 || status === 403) return new Error("Upload permission expired. Please sign in again.");
  if (status === 409) return new Error("That upload already exists. Please try again.");
  return new Error("The media upload could not be completed. Please try again.");
}

async function currentOffset(uploadUrl: string) {
  const response = await fetch(uploadUrl, {
    method: "HEAD",
    headers: {
      ...(await authHeaders()),
      "Tus-Resumable": TUS_VERSION,
    },
  });

  if (!response.ok) throw uploadError(response.status);
  const offset = Number(response.headers.get("Upload-Offset") ?? "0");
  if (!Number.isFinite(offset) || offset < 0) throw new Error("Upload resume state was invalid.");
  return offset;
}

async function createUpload(options: UploadOptions) {
  const response = await fetch(resumableEndpoint(), {
    method: "POST",
    headers: {
      ...(await authHeaders()),
      "Tus-Resumable": TUS_VERSION,
      "Upload-Length": String(options.file.size),
      "Upload-Metadata": [
        `bucketName ${toBase64(options.bucket)}`,
        `objectName ${toBase64(options.objectPath)}`,
        `contentType ${toBase64(options.contentType)}`,
        `cacheControl ${toBase64("3600")}`,
      ].join(","),
      "x-upsert": "false",
    },
  });

  if (!response.ok) throw uploadError(response.status);
  const location = response.headers.get("Location");
  if (!location) throw new Error("Storage did not return a resumable upload URL.");
  return new URL(location, resumableEndpoint()).toString();
}

export async function uploadGalleryMediaResumable(options: UploadOptions) {
  const uploadUrl = await createUpload(options);
  let offset = 0;
  options.onProgress?.(0, options.file.size);

  while (offset < options.file.size) {
    const chunk = options.file.slice(offset, Math.min(offset + CHUNK_SIZE, options.file.size));
    let completed = false;
    let lastError: unknown = null;

    for (const delay of RETRY_DELAYS) {
      if (delay) await sleep(delay);

      try {
        const response = await fetch(uploadUrl, {
          method: "PATCH",
          headers: {
            ...(await authHeaders()),
            "Tus-Resumable": TUS_VERSION,
            "Upload-Offset": String(offset),
            "Content-Type": "application/offset+octet-stream",
          },
          body: chunk,
        });

        if (response.ok) {
          const next = Number(response.headers.get("Upload-Offset") ?? offset + chunk.size);
          offset = Number.isFinite(next) ? next : offset + chunk.size;
          options.onProgress?.(Math.min(offset, options.file.size), options.file.size);
          completed = true;
          break;
        }

        if ([409, 412, 423, 429, 500, 502, 503, 504].includes(response.status)) {
          offset = await currentOffset(uploadUrl);
          if (offset >= options.file.size) {
            completed = true;
            break;
          }
          continue;
        }

        throw uploadError(response.status);
      } catch (error) {
        lastError = error;
        try {
          offset = await currentOffset(uploadUrl);
          if (offset >= options.file.size) {
            completed = true;
            break;
          }
        } catch {
          // Retry the same chunk; the final retry surfaces the original network/storage error.
        }
      }
    }

    if (!completed) {
      if (lastError instanceof Error) throw lastError;
      throw new Error("The upload was interrupted too many times. Please try again.");
    }
  }
}
