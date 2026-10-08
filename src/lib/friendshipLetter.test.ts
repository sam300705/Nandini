import { describe, expect, it } from "vitest";
import { parseFriendshipPages } from "./friendshipLetter";

const valid = [
  { page_number: 3, heading: "A friendship worth keeping", paragraphs: ["Always friends."] },
  { page_number: 1, heading: "From strangers to friends", paragraphs: ["First year."] },
  { page_number: 2, heading: "Little things", paragraphs: ["College memories."] },
];

describe("private friendship letter", () => {
  it("sorts three valid pages", () => {
    expect(parseFriendshipPages(valid).map((page) => page.page_number)).toEqual([1, 2, 3]);
  });

  it("rejects incomplete, duplicate, and unexpected page data", () => {
    expect(() => parseFriendshipPages(valid.slice(0, 2))).toThrow();
    expect(() => parseFriendshipPages([valid[0], valid[0], valid[2]])).toThrow();
    expect(() =>
      parseFriendshipPages([{ ...valid[0], secret: "unexpected" }, valid[1], valid[2]]),
    ).toThrow();
  });
});
