import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Nandini guest teddy conversation contract", () => {
  const source = readFileSync(
    join(process.cwd(), "supabase", "functions", "guest-sarvam-companion", "index.ts"),
    "utf8",
  );

  it("answers the user's specific request, including joking when asked", () => {
    expect(source).toContain("Answer the user's most recent request first.");
    expect(source).toContain("actually give it");
    expect(source).toContain("Don't substitute generic reassurance");
  });

  it("preserves casual platonic identity and does not impersonate a college student", () => {
    expect(source).toContain("not a romantic partner");
    expect(source).toContain("Don't pretend you attend Dronacharya");
    expect(source).toContain("Don't invent personal facts");
  });
});
