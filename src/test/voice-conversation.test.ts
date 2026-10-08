import { describe, expect, it } from "vitest";
import {
  isIdentityBoilerplate,
  isIdentityQuestion,
  isOverconfidentRelationshipConclusion,
} from "../../supabase/functions/sarvam-companion/conversation";

describe("voice conversation anti-repetition rules", () => {
  it.each([
    "chota sa AI companion hu jo app me rehta hai",
    "छोटा सा AI companion हूँ जो app में रहता है",
    "I'm your little AI companion inside the app",
  ])("recognizes repeated identity boilerplate: %s", (value) => {
    expect(isIdentityBoilerplate("assistant", value)).toBe(true);
  });

  it("does not suppress ordinary casual replies", () => {
    expect(isIdentityBoilerplate("assistant", "अरे बढ़िया, फिर आगे क्या हुआ?")).toBe(false);
    expect(isIdentityBoilerplate("user", "I am building an AI companion")).toBe(false);
  });

  it.each(["who are you?", "tum kaun ho", "तुम कौन हो?", "are you an AI?"])(
    "allows identity disclosure only for direct identity questions: %s",
    (value) => {
      expect(isIdentityQuestion(value)).toBe(true);
    },
  );

  it("does not mistake normal conversation for an identity question", () => {
    expect(isIdentityQuestion("aaj kya karu yaar")).toBe(false);
    expect(isIdentityQuestion("mera din mast tha")).toBe(false);
  });

  it.each(["woh mujhe ignore kar rahi hai", "she is ignoring you", "interested nahi hai"])(
    "flags categorical relationship conclusions: %s",
    (value) => {
      expect(isOverconfidentRelationshipConclusion("assistant", value)).toBe(true);
    },
  );

  it.each([
    "ho sakta hai woh busy ho, sirf reply se pakka nahi bol sakte",
    "maybe she is not interested, but we can't know that from one reply",
  ])("keeps uncertain relationship language available: %s", (value) => {
    expect(isOverconfidentRelationshipConclusion("assistant", value)).toBe(false);
  });

  it("does not apply relationship filtering to user messages", () => {
    expect(isOverconfidentRelationshipConclusion("user", "interested nahi hai")).toBe(false);
  });
});
