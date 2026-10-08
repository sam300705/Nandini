import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("uploaded friendship photo", () => {
  it("ships a sharp AVIF with the real 1050×591 image dimensions", () => {
    const bytes = readFileSync(join(process.cwd(), "public", "nandini-friendship-photo-hq.avif"));
    expect(bytes.byteLength).toBeGreaterThan(9000);
    expect(bytes.byteLength).toBeLessThan(50000);
    expect(bytes.toString("ascii", 4, 12)).toBe("ftypavif");

    const offset = bytes.indexOf(Buffer.from("ispe"));
    expect(offset).toBeGreaterThan(0);
    expect(bytes.readUInt32BE(offset + 8)).toBe(1050);
    expect(bytes.readUInt32BE(offset + 12)).toBe(591);
  });

  it("is a valid, optimized JPEG bundled with Nandini only", () => {
    const bytes = readFileSync(join(process.cwd(), "public", "nandini-friendship-photo.jpg"));
    expect(bytes.byteLength).toBeGreaterThan(3000);
    expect(bytes.byteLength).toBeLessThan(40000);
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xd8);
    expect(bytes[bytes.length - 2]).toBe(0xff);
    expect(bytes[bytes.length - 1]).toBe(0xd9);
  });
});
