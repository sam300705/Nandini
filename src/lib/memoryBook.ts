import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { validateImageBytes } from "@/lib/privateData";

const pageSchema = z
  .object({
    number: z.number().int().min(1).max(3),
    path: z.string().regex(/^memory-book\/page-[123]\.(png|jpg|webp)$/),
    alt: z.string().min(1).max(200),
  })
  .strict();
export const memoryManifestSchema = z
  .object({ pages: z.array(pageSchema).length(3) })
  .strict()
  .superRefine(({ pages }, ctx) => {
    if (
      new Set(pages.map((p) => p.number)).size !== 3 ||
      pages.some((p) => !p.path.startsWith(`memory-book/page-${p.number}.`))
    ) {
      ctx.addIssue({ code: "custom", message: "Invalid page order or paths." });
    }
  });
export type MemoryPage = z.infer<typeof pageSchema>;
export type LoadedMemoryPage = MemoryPage & { url: string };
export function parseMemoryManifest(value: unknown): MemoryPage[] {
  return memoryManifestSchema.parse(value).pages.sort((a, b) => a.number - b.number);
}

export function preloadPage(url: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const finish = (error?: Error) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      image.onload = null;
      image.onerror = null;
      if (error) {
        image.src = "";
        reject(error);
      } else resolve();
    };
    const abort = () => finish(new Error("Cancelled"));
    const timer = setTimeout(() => finish(new Error("Image timed out")), 15000);
    image.onload = () => finish();
    image.onerror = () => finish(new Error("Invalid image"));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    else image.src = url;
  });
}

export async function loadMemoryBook(uid: string, signal: AbortSignal, preload = preloadPage) {
  if (!uid || signal.aborted) throw new Error("Sign in required");
  const bucket = supabase.storage.from("home-private");
  const manifest = await bucket.download(`${uid}/memory-book/manifest.json`);
  if (signal.aborted || manifest.error || !manifest.data || manifest.data.size > 10000)
    throw new Error("Book unavailable");
  const pages = parseMemoryManifest(JSON.parse(await manifest.data.text()));
  const results = await Promise.allSettled(
    pages.map(async (page) => {
      const result = await bucket.download(`${uid}/${page.path}`);
      if (result.error || !result.data || signal.aborted) throw new Error("Page unavailable");
      await validateImageBytes(result.data);
      return { ...page, blob: result.data };
    }),
  );
  if (signal.aborted || results.some((r) => r.status === "rejected"))
    throw new Error("Book unavailable");
  const urls: string[] = [];
  const dispose = () => {
    urls.splice(0).forEach((url) => URL.revokeObjectURL(url));
  };
  try {
    const loaded = await Promise.all(
      results.map(async (result) => {
        if (result.status !== "fulfilled" || signal.aborted) throw new Error("Cancelled");
        const { blob, ...page } = result.value;
        const url = URL.createObjectURL(blob);
        urls.push(url);
        await preload(url, signal);
        return { ...page, url };
      }),
    );
    if (signal.aborted) throw new Error("Cancelled");
    return { pages: loaded, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
