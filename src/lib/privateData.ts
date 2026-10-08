export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export function validateImage(file: Blob) {
  if (!extensions[file.type]) throw new Error("Only JPEG, PNG and WebP images are supported.");
  if (!file.size || file.size > MAX_IMAGE_BYTES)
    throw new Error("Each image must be between 1 byte and 20 MiB.");
}
export async function validateImageBytes(file: Blob) {
  validateImage(file);
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const valid =
    file.type === "image/jpeg"
      ? b[0] === 255 && b[1] === 216 && b[2] === 255
      : file.type === "image/png"
        ? [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => b[i] === n)
        : new TextDecoder().decode(b.slice(0, 4)) === "RIFF" &&
          new TextDecoder().decode(b.slice(8, 12)) === "WEBP";
  if (!valid) throw new Error("Image bytes do not match its file type.");
}
