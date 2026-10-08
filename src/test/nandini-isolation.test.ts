import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Nandini data isolation", () => {
  it("does not read legacy data from another application's browser diary", () => {
    const diary = readFileSync("src/components/nandini/DiaryTab.tsx", "utf-8");
    expect(diary).not.toContain("recoverPreviousDiary");
    expect(diary).not.toContain("legacyDiaryRecovery");
  });
  it("requires dedicated new Supabase environment variables", () => {
    const client = readFileSync("src/integrations/supabase/client.ts", "utf-8");
    expect(client).toContain("VITE_NANDINI_SUPABASE_PROJECT_ID");
    expect(client).toContain("VITE_NANDINI_SUPABASE_URL");
    expect(client).toContain("VITE_NANDINI_SUPABASE_PUBLISHABLE_KEY");
    expect(client).not.toContain('import.meta.env["VITE_SUPABASE_URL"]');
  });
  it("has Sambhav and Nandini in the separate shared diary", () => {
    const diary = readFileSync("src/components/nandini/TogetherDiaryTab.tsx", "utf-8");
    expect(diary).toContain("Sambhav");
    expect(diary).toContain("Nandini");
    expect(diary).toContain("together_diary_entries");
  });
});
