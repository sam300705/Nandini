export type GalleryMediaKind = "image" | "video";

export type GalleryMediaInfo = {
  kind: GalleryMediaKind;
  extension: string;
  contentType: string;
};

const MIME_INFO: Record<string, GalleryMediaInfo> = {
  "image/jpeg": { kind: "image", extension: "jpg", contentType: "image/jpeg" },
  "image/png": { kind: "image", extension: "png", contentType: "image/png" },
  "image/webp": { kind: "image", extension: "webp", contentType: "image/webp" },
  "video/mp4": { kind: "video", extension: "mp4", contentType: "video/mp4" },
  "video/webm": { kind: "video", extension: "webm", contentType: "video/webm" },
  "video/quicktime": { kind: "video", extension: "mov", contentType: "video/quicktime" },
  "video/x-m4v": { kind: "video", extension: "m4v", contentType: "video/x-m4v" },
  "video/3gpp": { kind: "video", extension: "3gp", contentType: "video/3gpp" },
};

const EXTENSION_INFO: Record<string, GalleryMediaInfo> = {
  jpg: MIME_INFO["image/jpeg"],
  jpeg: MIME_INFO["image/jpeg"],
  png: MIME_INFO["image/png"],
  webp: MIME_INFO["image/webp"],
  mp4: MIME_INFO["video/mp4"],
  webm: MIME_INFO["video/webm"],
  mov: MIME_INFO["video/quicktime"],
  m4v: MIME_INFO["video/x-m4v"],
  "3gp": MIME_INFO["video/3gpp"],
};

export const galleryAccept =
  "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,video/x-m4v,video/3gpp";

function fileExtension(name: string) {
  return name.toLowerCase().split(".").pop() ?? "";
}

export function galleryMediaInfo(file: File): GalleryMediaInfo {
  const byMime = MIME_INFO[file.type.toLowerCase()];
  const byExtension = EXTENSION_INFO[fileExtension(file.name)];
  const info = byMime ?? byExtension;
  if (!info) {
    throw new Error("Use JPEG, PNG, WebP, MP4, WebM, MOV, M4V or 3GP files.");
  }
  if (!file.size) throw new Error("Empty files cannot be uploaded.");
  return info;
}

export async function validateGalleryMediaBytes(file: File) {
  const info = galleryMediaInfo(file);
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const text = new TextDecoder().decode(bytes);

  const valid =
    info.contentType === "image/jpeg"
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : info.contentType === "image/png"
        ? [137, 80, 78, 71, 13, 10, 26, 10].every((n, index) => bytes[index] === n)
        : info.contentType === "image/webp"
          ? text.slice(0, 4) === "RIFF" && text.slice(8, 12) === "WEBP"
          : info.contentType === "video/webm"
            ? bytes[0] === 0x1a &&
              bytes[1] === 0x45 &&
              bytes[2] === 0xdf &&
              bytes[3] === 0xa3
            : text.slice(4, 8) === "ftyp";

  if (!valid) throw new Error("This file's contents do not match its media type.");
  return info;
}

export function galleryMediaKindFromPath(path: string): GalleryMediaKind {
  const info = EXTENSION_INFO[fileExtension(path)];
  return info?.kind ?? "image";
}
