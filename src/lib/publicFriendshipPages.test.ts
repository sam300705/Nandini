import { describe, expect, it } from "vitest";
import { parseFriendshipPages } from "./friendshipLetter";
import { publicFriendshipPages } from "./publicFriendshipPages";

describe("public friendship gift", () => {
  it("has three ordered, readable Dronacharya friendship pages", () => {
    expect(parseFriendshipPages(publicFriendshipPages).map((page) => page.page_number)).toEqual([
      1, 2, 3,
    ]);
    expect(publicFriendshipPages[0].paragraphs.join(" ")).toContain("Dronacharya");
    expect(publicFriendshipPages[2].paragraphs.join(" ")).toContain("always stay my friends");
  });

  it("contains only recognized highlighter markers", () => {
    const allText = publicFriendshipPages.flatMap((page) => page.paragraphs).join(" ");
    const cleaned = allText.replace(/\[\[(?:lilac|blue|mint|yellow):[^\]]{1,100}\]\]/g, "");
    expect(cleaned).not.toContain("[[");
    expect(cleaned).not.toContain("]]");
  });
});
