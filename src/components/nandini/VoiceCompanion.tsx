import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Mic, PhoneOff, X } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import teddy3d from "@/assets/nandini/teddy3d";
import TeddyScene from "./TeddyScene";
import "./voice-companion.css";

type CompanionState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

type SarvamTurnResponse = {
  transcript?: string;
  reply?: string;
  audio?: string;
  content_type?: string;
  error?: string;
  stage?: string;
};

const stateCopy: Record<CompanionState, { label: string; hint: string }> = {
  idle: { label: "Your little companion", hint: "Tap to chat like friends anytime." },
  connecting: { label: "Just a sec…", hint: "Waking up your teddy." },
  listening: { label: "I'm listening…", hint: "English, Hindi, or Hinglish — all okay." },
  thinking: { label: "Hmm…", hint: "Thinking about what you said." },
  speaking: { label: "Chatting with you", hint: "I’ll listen again as soon as I finish." },
  error: { label: "Couldn't connect", hint: "Tap Start to try again." },
};

function getRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  return "";
}

function decodeBase64(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function TeddyFace({
  state,
  stageRef,
  expanded,
  analyserRef,
}: {
  state: CompanionState;
  stageRef: RefObject<HTMLDivElement | null>;
  expanded: boolean;
  analyserRef: RefObject<AnalyserNode | null>;
}) {
  return (
    <div ref={stageRef} className="vc-teddy3d-stage" data-state={state} aria-hidden="true">
      <div className="vc-teddy3d-glow" />
      <div className="vc-teddy3d-rings">
        <i />
        <i />
        <i />
      </div>

      {expanded ? (
        <TeddyScene state={state} analyserRef={analyserRef} />
      ) : (
        <div className="vc-teddy3d-wrap">
          <img src={teddy3d} alt="" className="vc-teddy3d-img" draggable={false} />
        </div>
      )}

      <div className="vc-teddy3d-thinking">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

export default function VoiceCompanion({ visible = true }: { visible?: boolean }) {
  const { session } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<CompanionState>("idle");
  const [error, setError] = useState("");
  const [errorStage, setErrorStage] = useState("health");
  const generationRef = useRef(0);
  const startingRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const healthRequestRef = useRef<AbortController | null>(null);
  const [introActive, setIntroActive] = useState(true);
  const guestHistoryRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const stateRef = useRef<CompanionState>("idle");
  const stageRef = useRef<HTMLDivElement | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const recorderStartedAtRef = useRef(0);
  const speechSeenRef = useRef(false);
  const speechCandidateAtRef = useRef(0);
  const firstSpeechAtRef = useRef(0);
  const lastSpeechAtRef = useRef(0);
  const processingRef = useRef(false);
  const listeningRef = useRef(false);

  const micAudioContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const vadRafRef = useRef<number | null>(null);

  const playbackAudioContextRef = useRef<AudioContext | null>(null);
  const playbackSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const playbackRafRef = useRef<number | null>(null);

  const startRecorderRef = useRef<((stream: MediaStream, accessToken: string) => void) | null>(
    null,
  );

  const setCompanionState = useCallback((next: CompanionState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const cleanupResources = useCallback(() => {
    generationRef.current += 1;
    startingRef.current = false;
    healthRequestRef.current?.abort();
    healthRequestRef.current = null;
    requestRef.current?.abort();
    requestRef.current = null;
    listeningRef.current = false;
    processingRef.current = false;

    if (vadRafRef.current !== null) cancelAnimationFrame(vadRafRef.current);
    vadRafRef.current = null;

    if (playbackRafRef.current !== null) cancelAnimationFrame(playbackRafRef.current);
    playbackRafRef.current = null;

    micAnalyserRef.current?.disconnect();
    micAnalyserRef.current = null;

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.onstop = null;
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore recorder close races.
      }
    }
    mediaRecorderRef.current = null;
    recorderChunksRef.current = [];
    speechSeenRef.current = false;
    speechCandidateAtRef.current = 0;
    firstSpeechAtRef.current = 0;

    try {
      playbackSourceRef.current?.stop();
    } catch {
      // Ignore playback close races.
    }
    playbackSourceRef.current = null;
    playbackAnalyserRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (micAudioContextRef.current) {
      void micAudioContextRef.current.close().catch(() => undefined);
      micAudioContextRef.current = null;
    }

    if (playbackAudioContextRef.current) {
      void playbackAudioContextRef.current.close().catch(() => undefined);
      playbackAudioContextRef.current = null;
    }
  }, []);

  useEffect(() => cleanupResources, [cleanupResources]);

  useEffect(() => {
    if (!visible || !introActive) return;
    const timer = window.setTimeout(() => setIntroActive(false), 2600);
    return () => window.clearTimeout(timer);
  }, [introActive, visible]);

  useEffect(() => {
    if (visible) return;
    setExpanded(false);
    if (stateRef.current !== "idle") {
      setCompanionState("idle");
      cleanupResources();
      setError("");
    }
  }, [cleanupResources, setCompanionState, visible]);

  const playReply = useCallback(
    async (audioBase64: string, stream: MediaStream, accessToken: string) => {
      const generation = generationRef.current;
      const context = playbackAudioContextRef.current;
      if (!context) throw new Error("Audio playback is unavailable.");

      const bytes = decodeBase64(audioBase64);
      const audioBuffer = await context.decodeAudioData(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      );

      if (generation !== generationRef.current || !listeningRef.current) return;
      const source = context.createBufferSource();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(context.destination);
      playbackSourceRef.current = source;
      playbackAnalyserRef.current = analyser;

      setCompanionState("speaking");

      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });

      source.disconnect();
      analyser.disconnect();
      if (generation !== generationRef.current) return;
      if (playbackRafRef.current !== null) cancelAnimationFrame(playbackRafRef.current);
      playbackRafRef.current = null;
      playbackSourceRef.current = null;
      playbackAnalyserRef.current = null;

      analyser.disconnect();
      if (listeningRef.current && generation === generationRef.current) {
        processingRef.current = false;
        setCompanionState("listening");
        window.setTimeout(() => startRecorderRef.current?.(stream, accessToken), 60);
      }
    },
    [setCompanionState],
  );

  const processTurn = useCallback(
    async (
      audio: Blob,
      stream: MediaStream,
      accessToken: string,
      recorderMimeType: string,
      durationMs: number,
    ) => {
      const generation = generationRef.current;
      let failedStage = "network";
      try {
        const controller = new AbortController();
        requestRef.current = controller;
        const supabaseUrl = import.meta.env["VITE_NANDINI_SUPABASE_URL"] as string | undefined;
        if (!supabaseUrl) throw new Error("Nandini voice configuration is missing.");
        const voicePath = accessToken ? "sarvam-companion" : "guest-sarvam-companion";

        const body = new FormData();
        body.append("audio", audio, "utterance.webm");
        body.append("recorder_mime_type", recorderMimeType);
        body.append("duration_ms", String(Math.round(durationMs)));
        if (!accessToken) body.append("history", JSON.stringify(guestHistoryRef.current));

        const response = await fetch(`${supabaseUrl}/functions/v1/${voicePath}`, {
          method: "POST",
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          body,
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => ({}))) as SarvamTurnResponse;

        if (generation !== generationRef.current || !listeningRef.current) return;
        failedStage = payload.stage ?? "network";
        if (response.status === 422) {
          processingRef.current = false;
          setError("");
          setCompanionState("listening");
          window.setTimeout(() => startRecorderRef.current?.(stream, accessToken), 60);
          return;
        }

        if (!response.ok || !payload.audio) {
          throw new Error(payload.error ?? "Teddy couldn't answer that.");
        }

        if (!accessToken && payload.transcript && payload.reply) {
          guestHistoryRef.current = [
            ...guestHistoryRef.current,
            { role: "user", content: payload.transcript.slice(0, 450) },
            { role: "assistant", content: payload.reply.slice(0, 450) },
          ].slice(-6);
        }
        failedStage = "tts";
        await playReply(payload.audio, stream, accessToken);
      } catch {
        if (generation !== generationRef.current) return;
        cleanupResources();
        setErrorStage(failedStage);
        setError("Tap Start talking to try again.");
        setCompanionState("error");
      }
    },
    [cleanupResources, playReply, setCompanionState],
  );

  const startRecorder = useCallback(
    (stream: MediaStream, accessToken: string) => {
      if (!listeningRef.current || processingRef.current || localStreamRef.current !== stream)
        return;
      if (mediaRecorderRef.current?.state === "recording") return;

      const mimeType = getRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderChunksRef.current = [];
      speechSeenRef.current = false;
      speechCandidateAtRef.current = 0;
      firstSpeechAtRef.current = 0;
      lastSpeechAtRef.current = 0;
      recorderStartedAtRef.current = performance.now();
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recorderChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        mediaRecorderRef.current = null;
        if (!listeningRef.current) return;

        const chunks = recorderChunksRef.current;
        recorderChunksRef.current = [];

        const heardSpeech = speechSeenRef.current;
        const durationMs = performance.now() - recorderStartedAtRef.current;
        const actualMimeType = recorder.mimeType || mimeType || "audio/webm";
        speechSeenRef.current = false;
        speechCandidateAtRef.current = 0;
        firstSpeechAtRef.current = 0;

        const blob = new Blob(chunks, {
          type: actualMimeType,
        });

        if (!heardSpeech || blob.size < 700) {
          processingRef.current = false;
          window.setTimeout(() => startRecorderRef.current?.(stream, accessToken), 80);
          return;
        }

        void processTurn(blob, stream, accessToken, actualMimeType, durationMs);
      };

      recorder.start(250);
    },
    [processTurn],
  );

  startRecorderRef.current = startRecorder;

  const startVad = useCallback(
    (stream: MediaStream, accessToken: string) => {
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.25;
      source.connect(analyser);

      micAudioContextRef.current = context;
      micAnalyserRef.current = analyser;

      const samples = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!listeningRef.current) return;

        analyser.getByteTimeDomainData(samples);

        let sum = 0;
        for (const value of samples) {
          const normalized = (value - 128) / 128;
          sum += normalized * normalized;
        }

        const rms = Math.sqrt(sum / samples.length);
        const now = performance.now();
        const recorder = mediaRecorderRef.current;

        if (recorder?.state === "recording" && !processingRef.current) {
          if (rms > 0.024) {
            if (!speechCandidateAtRef.current) speechCandidateAtRef.current = now;

            if (now - speechCandidateAtRef.current >= 180) {
              if (!speechSeenRef.current) firstSpeechAtRef.current = now;
              speechSeenRef.current = true;
              lastSpeechAtRef.current = now;
            }
          } else if (!speechSeenRef.current) {
            speechCandidateAtRef.current = 0;
          }

          const enoughSpeechCaptured =
            firstSpeechAtRef.current > 0 && now - firstSpeechAtRef.current >= 450;

          const silenceAfterSpeech =
            speechSeenRef.current &&
            enoughSpeechCaptured &&
            lastSpeechAtRef.current > 0 &&
            now - lastSpeechAtRef.current > 1050;

          const maxUtteranceReached =
            speechSeenRef.current && now - recorderStartedAtRef.current > 25_000;

          const idleRotation =
            !speechSeenRef.current && now - recorderStartedAtRef.current > 15_000;

          if (silenceAfterSpeech || maxUtteranceReached) {
            processingRef.current = true;
            setCompanionState("thinking");
            try {
              recorder.stop();
            } catch {
              processingRef.current = false;
            }
          } else if (idleRotation) {
            try {
              recorder.stop();
            } catch {
              // The next animation frame will retry.
            }
          }
        }

        vadRafRef.current = requestAnimationFrame(tick);
      };

      void context.resume().catch(() => undefined);
      startRecorderRef.current?.(stream, accessToken);
      tick();
    },
    [setCompanionState],
  );

  const startSession = useCallback(async () => {
    if (localStreamRef.current || startingRef.current) return;
    startingRef.current = true;
    const generation = generationRef.current;

    setExpanded(true);
    setError("");
    setCompanionState("connecting");

    try {
      if (typeof MediaRecorder === "undefined") {
        throw new Error("This browser doesn't support the voice recorder.");
      }

      const supabaseUrl = import.meta.env["VITE_NANDINI_SUPABASE_URL"] as string | undefined;
      if (!supabaseUrl) throw new Error("Nandini voice configuration is missing.");
      const accessToken = session?.access_token ?? "";
      const voicePath = accessToken ? "sarvam-companion" : "guest-sarvam-companion";

      const controller = new AbortController();
      healthRequestRef.current = controller;
      // Readiness is diagnostic; the authenticated turn endpoint still validates
      // auth/config. A cold network check must not delay opening the microphone.
      void fetch(`${supabaseUrl}/functions/v1/${voicePath}`, {
        method: "POST",
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
          : { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "health" }),
        signal: controller.signal,
      })
        .then(async (health) => {
          const payload = (await health.json().catch(() => ({}))) as {
            ready?: boolean;
            error?: string;
          };
          if (!health.ok || !payload.ready) throw new Error(payload.error ?? "Voice is not ready.");
        })
        .catch(() => {
          if (generation !== generationRef.current) return;
          cleanupResources();
          setErrorStage("health");
          setError("Voice is not configured yet. Please try again later.");
          setCompanionState("error");
        });

      // Unlock playback in the tap gesture, rather than after a network await.
      const playbackContext = new AudioContext();
      playbackAudioContextRef.current = playbackContext;
      const playbackReady = playbackContext.resume();
      // Consume early rejections while the microphone permission prompt is open.
      void playbackReady.catch(() => undefined);

      if (generation !== generationRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      if (generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      localStreamRef.current = stream;
      listeningRef.current = true;
      processingRef.current = false;

      await playbackReady;

      if (generation !== generationRef.current) return;
      startingRef.current = false;
      setCompanionState("listening");
      startVad(stream, accessToken);
    } catch {
      if (generation !== generationRef.current) return;
      cleanupResources();
      setErrorStage("health");
      setError("Please check microphone access and try again.");
      setCompanionState("error");
    }
  }, [cleanupResources, session?.access_token, setCompanionState, startVad]);

  const stopSession = useCallback(() => {
    setCompanionState("idle");
    cleanupResources();
    setError("");
  }, [cleanupResources, setCompanionState]);

  const errorTitles: Record<string, string> = {
    health: "Voice isn’t ready",
    stt: "I couldn’t hear that",
    llm: "I got stuck thinking",
    tts: "I couldn’t say that out loud",
    network: "Connection hiccup",
  };
  const copy =
    state === "error"
      ? {
          label: errorTitles[errorStage] ?? errorTitles["network"],
          hint: "We can try again whenever you’re ready.",
        }
      : stateCopy[state];
  const active = state !== "idle" && state !== "error";

  return (
    <div
      className={`voice-companion ${expanded ? "is-open" : ""} ${visible ? "" : "vc-hidden"}`}
      aria-hidden={!visible}
    >
      {!expanded ? (
        <button
          type="button"
          className={`vc-fab ${introActive ? "vc-intro" : ""}`}
          aria-label="Open Nandini's voice companion"
          onClick={() => setExpanded(true)}
        >
          <TeddyFace
            state={state}
            stageRef={stageRef}
            expanded={false}
            analyserRef={playbackAnalyserRef}
          />
          <span>Chal baat karein 👋</span>
        </button>
      ) : (
        <section className="vc-panel" aria-label="Nandini's voice companion">
          <button
            type="button"
            className="vc-close"
            aria-label="Minimize voice companion"
            onClick={() => setExpanded(false)}
          >
            <X size={17} />
          </button>

          <TeddyFace state={state} stageRef={stageRef} expanded analyserRef={playbackAnalyserRef} />

          <div className="vc-copy" aria-live="polite">
            <strong>{copy.label}</strong>
            <span>{copy.hint}</span>
          </div>

          {error ? <p className="vc-error">{error}</p> : null}

          <div className="vc-actions">
            {!active ? (
              <button type="button" className="vc-start" onClick={() => void startSession()}>
                <Mic size={17} />
                Start talking
              </button>
            ) : (
              <button type="button" className="vc-end" onClick={stopSession}>
                <PhoneOff size={17} />
                End
              </button>
            )}
          </div>

          <p className="vc-privacy">
            {session
              ? "Private chat · saved to your account"
              : "Guest chat · only remembered while this page is open · daily usage limits apply"}
          </p>
        </section>
      )}
    </div>
  );
}
