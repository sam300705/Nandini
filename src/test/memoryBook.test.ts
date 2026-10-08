import { beforeEach, expect, it, vi } from "vitest";
import { Blob as NodeBlob } from "node:buffer";
import { loadMemoryBook, parseMemoryManifest, preloadPage } from "@/lib/memoryBook";
const mocks = vi.hoisted(() => ({ download: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({ download: mocks.download }) } },
}));
const manifest = {
  pages: [3, 1, 2].map((number) => ({
    number,
    path: `memory-book/page-${number}.png`,
    alt: `Handwritten page ${number}`,
  })),
};
beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi
    .fn()
    .mockReturnValueOnce("blob:1")
    .mockReturnValueOnce("blob:2")
    .mockReturnValueOnce("blob:3");
  URL.revokeObjectURL = vi.fn();
  mocks.download.mockImplementation(async (path: string) => ({
    error: null,
    data: path.endsWith(".json")
      ? new NodeBlob([JSON.stringify(manifest)])
      : new NodeBlob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" }),
  }));
});
it("uses validated numeric page order, never Storage list order", () => {
  expect(parseMemoryManifest(manifest).map((p) => p.number)).toEqual([1, 2, 3]);
});
it("rejects wrong counts, duplicate numbers and unsafe or mismatched paths", () => {
  for (const pages of [
    manifest.pages.slice(1),
    [manifest.pages[0], manifest.pages[0], manifest.pages[2]],
    manifest.pages.map((p) => ({ ...p, path: "../secret.png" })),
    manifest.pages.map((p) => ({ ...p, path: "memory-book/page-1.png" })),
  ]) {
    expect(() => parseMemoryManifest({ pages })).toThrow();
  }
});
it("downloads only owner-scoped private paths and preloads every page", async () => {
  const preload = vi.fn(async () => {});
  const book = await loadMemoryBook("owner", new AbortController().signal, preload);
  expect(mocks.download.mock.calls.map((c) => c[0])).toEqual([
    "owner/memory-book/manifest.json",
    "owner/memory-book/page-1.png",
    "owner/memory-book/page-2.png",
    "owner/memory-book/page-3.png",
  ]);
  expect(book.pages.map((p) => p.number)).toEqual([1, 2, 3]);
  expect(preload).toHaveBeenCalledTimes(3);
  book.dispose();
  book.dispose();
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
});
it("does not request pages without an owner or after cancellation", async () => {
  const c = new AbortController();
  c.abort();
  await expect(loadMemoryBook("", new AbortController().signal)).rejects.toThrow();
  await expect(loadMemoryBook("owner", c.signal)).rejects.toThrow();
  expect(mocks.download).not.toHaveBeenCalled();
});
it("fails safely on a missing page without creating partial Blob URLs", async () => {
  mocks.download
    .mockResolvedValueOnce({ data: new NodeBlob([JSON.stringify(manifest)]), error: null })
    .mockResolvedValue({ data: null, error: Error("secret backend detail") });
  await expect(loadMemoryBook("owner", new AbortController().signal)).rejects.toThrow(
    "Book unavailable",
  );
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
it("cleans every created URL after an image decode failure", async () => {
  await expect(
    loadMemoryBook("owner", new AbortController().signal, async () => {
      throw Error("decode");
    }),
  ).rejects.toThrow();
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
});
it("cleans URLs if the session ends while images are preloading", async () => {
  const c = new AbortController();
  await expect(
    loadMemoryBook("owner", c.signal, async () => {
      c.abort();
    }),
  ).rejects.toThrow();
  expect(URL.revokeObjectURL).toHaveBeenCalled();
});
it("rejects unsupported page content", async () => {
  mocks.download
    .mockResolvedValueOnce({ data: new NodeBlob([JSON.stringify(manifest)]), error: null })
    .mockResolvedValue({ data: new NodeBlob(["<svg/>"], { type: "image/svg+xml" }), error: null });
  await expect(loadMemoryBook("owner", new AbortController().signal)).rejects.toThrow();
});
it("preloading responds to abort and does not retain image handlers", async () => {
  const c = new AbortController();
  const pending = preloadPage("blob:test", c.signal);
  c.abort();
  await expect(pending).rejects.toThrow("Cancelled");
});
