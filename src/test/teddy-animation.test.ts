import { describe, expect, it } from "vitest";
import {
  neutralJawTarget,
  shouldAnimateMouth,
  shouldScheduleGestures,
} from "@/components/nandini/teddy-animation";

describe("teddy animation state safety", () => {
  it.each(["idle", "connecting", "listening", "thinking", "error"] as const)(
    "keeps the mouth neutral outside speaking: %s",
    (state) => {
      expect(shouldAnimateMouth(state, false)).toBe(false);
      expect(neutralJawTarget(state)).toBe(0);
    },
  );

  it("drives mouth and gestures only while speaking", () => {
    expect(shouldAnimateMouth("speaking", false)).toBe(true);
    expect(shouldScheduleGestures("speaking", false)).toBe(true);
    expect(shouldScheduleGestures("listening", false)).toBe(false);
  });

  it("suppresses continuous character motion for reduced-motion users", () => {
    expect(shouldAnimateMouth("speaking", true)).toBe(false);
    expect(shouldScheduleGestures("speaking", true)).toBe(false);
  });

  it("returns to a closed jaw immediately when playback state ends", () => {
    expect(neutralJawTarget("speaking")).toBeNull();
    expect(neutralJawTarget("listening")).toBe(0);
    expect(neutralJawTarget("error")).toBe(0);
    expect(neutralJawTarget("idle")).toBe(0);
  });
});
