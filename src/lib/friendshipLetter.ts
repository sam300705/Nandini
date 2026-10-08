import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const privatePageSchema = z
  .object({
    page_number: z.number().int().min(1).max(3),
    heading: z.string().min(1).max(100),
    paragraphs: z.array(z.string().min(1).max(800)).min(1).max(8),
  })
  .strict();

export type FriendshipPage = z.infer<typeof privatePageSchema>;

export function parseFriendshipPages(value: unknown): FriendshipPage[] {
  const pages = z.array(privatePageSchema).length(3).parse(value);
  const ordered = [...pages].sort((a, b) => a.page_number - b.page_number);
  if (ordered.some((page, index) => page.page_number !== index + 1)) {
    throw new Error("Invalid friendship letter page numbering");
  }
  return ordered;
}

export async function loadFriendshipPages(ownerId: string): Promise<FriendshipPage[]> {
  if (!ownerId) throw new Error("Sign in to read this letter");
  const { data, error } = await supabase
    .from("friendship_letter_pages")
    .select("page_number,heading,paragraphs")
    .eq("owner_id", ownerId)
    .order("page_number", { ascending: true });
  if (error) throw new Error("The letter could not be loaded");
  // An unassigned letter is never shown to the wrong account.
  if (!data?.length) return [];
  return parseFriendshipPages(data);
}
