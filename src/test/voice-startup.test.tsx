import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import VoiceCompanion from "@/components/nandini/VoiceCompanion";

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({ session: { access_token: "test-session" } }),
}));
const trackStop = vi.fn();
const stream = { getTracks: () => [{ stop: trackStop }] } as unknown as MediaStream;
let resolveHealth: (response: Response) => void;
let resolveMic: (stream: MediaStream) => void;
const getUserMedia = vi.fn();
let starts = 0;
class Recorder {
  static isTypeSupported() {
    return true;
  }
  state = "inactive";
  mimeType = "audio/webm;codecs=opus";
  onstop: (() => void) | null = null;
  start() {
    this.state = "recording";
    starts++;
  }
  stop() {
    this.state = "inactive";
    this.onstop?.();
  }
}
class Audio {
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
  createMediaStreamSource() {
    return { connect: vi.fn() };
  }
  createAnalyser() {
    return {
      frequencyBinCount: 256,
      disconnect: vi.fn(),
      getByteTimeDomainData: (data: Uint8Array) => data.fill(128),
    };
  }
}
beforeEach(() => {
  starts = 0;
  trackStop.mockClear();
  getUserMedia.mockReset();
  getUserMedia.mockResolvedValue(stream);
  vi.stubEnv("VITE_NANDINI_SUPABASE_URL", "https://mkmejcplhumumfxvlesa.supabase.co");
  vi.stubGlobal("MediaRecorder", Recorder);
  vi.stubGlobal("AudioContext", Audio);
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveHealth = resolve;
        }),
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function open() {
  render(<VoiceCompanion />);
  fireEvent.click(screen.getByRole("button", { name: "Open Nandini's voice companion" }));
  fireEvent.click(screen.getByRole("button", { name: "Start talking" }));
}
it("starts listening while a slow health request is still pending", async () => {
  open();
  expect(await screen.findByText("I'm listening…")).toBeVisible();
  expect(getUserMedia).toHaveBeenCalledTimes(1);
  expect(starts).toBe(1);
  fireEvent.click(screen.getByRole("button", { name: "End" }));
  expect(trackStop).toHaveBeenCalledTimes(1);
  await act(async () => resolveHealth(new Response(JSON.stringify({ ready: true }))));
  expect(screen.getByText("Your little companion")).toBeVisible();
  expect(starts).toBe(1);
});
it("stops the microphone when the background health check fails", async () => {
  open();
  await screen.findByText("I'm listening…");
  await act(async () =>
    resolveHealth(new Response(JSON.stringify({ ready: false }), { status: 503 })),
  );
  expect(screen.getByText("Voice isn’t ready")).toBeVisible();
  expect(trackStop).toHaveBeenCalledTimes(1);
});
it("disposes a microphone that arrives after End without restarting listening", async () => {
  getUserMedia.mockImplementation(
    () =>
      new Promise<MediaStream>((resolve) => {
        resolveMic = resolve;
      }),
  );
  open();
  fireEvent.click(screen.getByRole("button", { name: "End" }));
  await act(async () => resolveMic(stream));
  expect(trackStop).toHaveBeenCalledTimes(1);
  expect(starts).toBe(0);
  expect(screen.getByText("Your little companion")).toBeVisible();
});
