export type TeddyMotionState =
  "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

export function shouldAnimateMouth(state: TeddyMotionState, reducedMotion: boolean) {
  return state === "speaking" && !reducedMotion;
}

export function shouldScheduleGestures(state: TeddyMotionState, reducedMotion: boolean) {
  return state === "speaking" && !reducedMotion;
}

export function neutralJawTarget(state: TeddyMotionState) {
  return state === "speaking" ? null : 0;
}
