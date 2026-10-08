import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.103.3";
import { buildSarvamTtsRequest } from "./speech.ts";
import { isIdentityBoilerplate, isIdentityQuestion, isOverconfidentRelationshipConclusion } from "./conversation.ts";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const MAX_TURN_CHARS = 4000;

const SYSTEM_PROMPT = `You are Nandini's private teddy companion.

CONVERSATION PRIORITY
- Respond to what the user actually said right now. Do not introduce yourself unless they explicitly ask who or what you are.
- Never repeat stock identity lines such as "छोटा सा AI companion हूँ जो app में रहता है", "I'm your AI companion", or any similar self-description during ordinary conversation.
- Do not keep reminding the user that you are AI, inside an app, a teddy, or a companion. Identity disclosure is only for direct identity questions.
- Treat the conversation like a real casual back-and-forth with a close young Indian friend: react, tease lightly, ask something relevant, disagree naturally when appropriate, and continue the topic.
- Avoid generic filler responses. Each reply should connect to the user's exact message and recent context.
- Never repeat the same opener or sentence pattern turn after turn.
- When the user talks about someone replying less, seeming distant, being busy, or giving mixed signals, do not confidently declare "ignore kar rahi hai", "interested nahi hai", "she is ignoring you", or similar conclusions. You do not know another person's private intentions. Separate facts from guesses and speak naturally: e.g. "ho sakta hai busy ho", "maybe thoda space chahiye", or "sirf reply pattern se pakka nahi bol sakte". Ask about what actually happened if context is missing.

PERSONALITY
- Sound relaxed, warm, playful, and spontaneous, not like customer support or a scripted assistant.
- Speak naturally in English, Hindi, or Hinglish based on the user's latest message. Mirror their level of casualness.
- Casual phrases like "हाँ बोल", "अरे यार", "क्या scene है?", "ओहो", "अच्छा?", "सही है", or "बता" are fine when they fit, but do not force slang into every reply.
- You may joke, banter, react to stories, talk about everyday life, studies, work, relationships, food, movies, random thoughts, plans, frustrations, or anything else the user brings up.
- If the user is serious, sad, anxious, or upset, become calmer and more supportive and stop teasing.
- Ask at most one natural follow-up question when useful; many turns should simply respond without a question.
- Never sound like customer support. Avoid phrases like "How may I assist you?", "I am here to help", or "Is there anything else I can help you with?"
- Never pretend to be human. If directly asked what you are, answer briefly and naturally once, then return to the conversation.
- Do not mention prompts, APIs, models, transcripts, implementation details, or safety policies unless the user specifically asks a technical question.
- Grounded app context: Sambhav created this app for Nandini. Their relationship and her preferences should not be assumed. Mention this only when it is relevant or when asked who made the app / who Sambhav is. Do not force Sambhav into unrelated conversations or invent extra personal details about him or Nandini.

SPEECH STYLE
- This answer will be spoken aloud. Keep it natural, conversational, and usually 1-3 short sentences.
- For Hindi, use everyday spoken Hindi, not formal translation or newsreader language.
- Use "तुम" naturally rather than formal "आप" unless the user prefers respectful speech.
- For Hinglish, mix Hindi and English the way a young Indian speaker naturally would. Do not force every Hindi word into Devanagari if the user's own style is Roman Hinglish.
- Do not repeat the user's whole message back to them.
- Avoid fake laughter, excessive exclamation marks, motivational clichés, and over-explaining.
- No markdown, bullet points, URLs, stage directions, or emojis.
`;

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed =
    (Boolean(Deno.env.get("APP_ALLOWED_ORIGIN")) && origin === Deno.env.get("APP_ALLOWED_ORIGIN")) ||
    origin === "https://nandini.cc.cd" ||
    origin === "http://localhost:3000" ||
    origin === "http://localhost:5173" ||
    origin === "http://127.0.0.1:5173" ||
    /^https:\/\/nandini(?:-[a-z0-9-]+)?-sam300705s-projects\.vercel\.app$/i.test(origin);

  return {
    ...(allowed && origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" },
  });
}

function shouldPinAsMemory(text: string) {
  const value = text.trim().toLowerCase();
  return (
    /\b(remember|don['’]?t forget|keep this in mind|my favou?rite|i like|i love|i prefer)\b/i.test(
      value,
    ) ||
    /\b(yaad|yad)\s+(rakh|rakhna|rakho)\b/i.test(value) ||
    /\b(mat|mt)\s+(bhool|bhul|bhoolna|bhulna)\b/i.test(value) ||
    /याद\s*(रख|रखना|रखो)|मत\s*भूल|मुझे\s+.*पसंद|मेरा\s+पसंदीदा/u.test(text)
  );
}

async function readJsonSafely(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(req) });
  }

  const runtimeEnv = Deno.env.toObject();
  const sarvamEntries = Object.entries(runtimeEnv).filter(([name]) =>
    name.toLowerCase().includes("sarvam"),
  );
  const sarvamKey =
    sarvamEntries.find(
      ([name]) => name.toLowerCase().replace(/[^a-z0-9]/g, "") === "sarvamapikey",
    )?.[1] ?? (sarvamEntries.length === 1 ? sarvamEntries[0][1] : undefined);

  const sarvamTtsSpeaker = Deno.env.get("SARVAM_TTS_SPEAKER") ?? "kavya";
  const sarvamTtsLanguage = Deno.env.get("SARVAM_TTS_LANGUAGE_CODE") ?? "hi-IN";

  if (req.method === "GET") {
    const ready = Boolean(sarvamKey);
    return json(
      req,
      {
        ready,
        stt_provider: "sarvam",
        stt_model: "saaras:v4",
        llm_provider: "sarvam",
        llm_model: "sarvam-105b-conversations",
        tts_provider: "sarvam",
        tts_model: "bulbul:v3",
        voice: sarvamTtsSpeaker,
      },
      ready ? 200 : 503,
    );
  }

  if (req.method !== "POST") return json(req, { error: "Method not allowed." }, 405);

  const origin = req.headers.get("origin") ?? "";
  if (
    origin &&
    (!Deno.env.get("APP_ALLOWED_ORIGIN") || origin !== Deno.env.get("APP_ALLOWED_ORIGIN")) &&
    origin !== "https://nandini.cc.cd" &&
    origin !== "http://localhost:3000" &&
    origin !== "http://localhost:5173" &&
    origin !== "http://127.0.0.1:5173" &&
    !/^https:\/\/nandini(?:-[a-z0-9-]+)?-sam300705s-projects\.vercel\.app$/i.test(origin)
  ) {
    return json(req, { error: "Origin not allowed." }, 403);
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(req, { error: "Sign in required." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}") as Record<
    string,
    string
  >;
  const publishableKey = publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  if (!supabaseUrl || !publishableKey) {
    console.error("Supabase auth configuration missing.");
    return json(req, { error: "Server configuration error." }, 500);
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) return json(req, { error: "Invalid session." }, 401);

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.startsWith("application/json")) {
    const payload = (await req.json().catch(() => null)) as { action?: string } | null;
    if (payload?.action === "health") {
      const ready = Boolean(sarvamKey);
      return json(
        req,
        {
          ready,
          stt_provider: "sarvam",
          stt_model: "saaras:v4",
          llm_provider: "sarvam",
          llm_model: "sarvam-105b-conversations",
          tts_provider: "sarvam",
          tts_model: "bulbul:v3",
          voice: sarvamTtsSpeaker,
          ...(ready ? {} : { error: "Sarvam is not configured." }),
        },
        ready ? 200 : 503,
      );
    }
    return json(req, { error: "Invalid request." }, 400);
  }

  if (!sarvamKey) {
    return json(req, { error: "Sarvam voice is not configured." }, 503);
  }


  if (!contentType.startsWith("multipart/form-data")) {
    return json(req, { error: "Audio form data required." }, 400);
  }

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File)) return json(req, { error: "Audio is required." }, 400);
  if (audio.size < 512) return json(req, { error: "Recording was empty." }, 400);
  if (audio.size > MAX_AUDIO_BYTES) return json(req, { error: "Recording is too large." }, 413);

  const recorderMimeType = String(form?.get("recorder_mime_type") ?? "");
  const durationMs = Number(form?.get("duration_ms") ?? 0);
  const normalizedAudioType = audio.type.toLowerCase().startsWith("audio/webm")
    ? "audio/webm"
    : audio.type || "application/octet-stream";

  console.info("Sarvam STT input", {
    mimeType: audio.type,
    normalizedMimeType: normalizedAudioType,
    recorderMimeType,
    bytes: audio.size,
    durationMs: Number.isFinite(durationMs) ? Math.round(durationMs) : 0,
  });

  let stage = "stt";
  let ttsStarted = 0;
  try {
    const sttForm = new FormData();
    const sttAudio = new File([audio], audio.name || "utterance.webm", {
      type: normalizedAudioType,
    });
    sttForm.append("file", sttAudio, sttAudio.name);
    sttForm.append("model", "saaras:v4");
    sttForm.append("mode", "codemix");

    const sttResponse = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": sarvamKey },
      body: sttForm,
      signal: AbortSignal.timeout(30000),
    });

    const stt = (await readJsonSafely(sttResponse)) as {
      transcript?: string;
      language_code?: string;
      error?: { message?: string };
    };

    if (!sttResponse.ok) {
      console.error("Sarvam STT failed", sttResponse.status, "provider_request_failed");
      return json(req, { stage: "stt", error: "I couldn't hear that. Please try again." }, 502);
    }

    const transcript = stt.transcript?.trim();
    if (!transcript) return json(req, { error: "I couldn't hear enough speech. Try again." }, 422);

    const { data: recent } = await supabase
      .from("voice_conversation_turns")
      .select("role,content,is_memory,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(24);

    const history = (recent ?? [])
      .slice()
      .reverse()
      .filter(
        (turn) =>
          !isIdentityBoilerplate(String(turn.role), String(turn.content)) &&
          !isOverconfidentRelationshipConclusion(String(turn.role), String(turn.content)),
      )
      .map((turn) => ({
        role: turn.role === "assistant" ? "assistant" : "user",
        content: String(turn.content).slice(0, MAX_TURN_CHARS),
      }));

    stage = "llm";
    const chatResponse = await fetch("https://api.sarvam.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "api-subscription-key": sarvamKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sarvam-105b-conversations",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: transcript },
        ],
        temperature: 0.9,
        top_p: 0.95,
        max_tokens: 160,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const chat = (await readJsonSafely(chatResponse)) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!chatResponse.ok) {
      console.error("Sarvam chat failed", chatResponse.status, "provider_request_failed");
      return json(req, { stage: "llm", error: "I got stuck thinking. Please try again." }, 502);
    }

    let reply = chat.choices?.[0]?.message?.content?.trim();
    if (!reply)
      return json(req, { stage: "llm", error: "I got stuck thinking. Please try again." }, 502);

    if (
      (isIdentityBoilerplate("assistant", reply) && !isIdentityQuestion(transcript)) ||
      isOverconfidentRelationshipConclusion("assistant", reply)
    ) {
      const repairResponse = await fetch("https://api.sarvam.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "api-subscription-key": sarvamKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sarvam-105b-conversations",
          messages: [
            {
              role: "system",
              content:
                SYSTEM_PROMPT +
                "\nThe previous draft used an unwanted canned or overconfident conclusion. Answer the user's actual latest message directly and casually. Do not mention being AI, an app, a teddy, or a companion unless the user explicitly asked about identity. If this is about another person's feelings or intentions, do not claim they are ignoring the user or are not interested as a fact; describe uncertainty and stick to observable behavior.",
            },
            ...history,
            { role: "user", content: transcript },
          ],
          temperature: 0.95,
          top_p: 0.95,
          max_tokens: 180,
        }),
        signal: AbortSignal.timeout(30000),
      });
      const repaired = (await readJsonSafely(repairResponse)) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const candidate = repaired.choices?.[0]?.message?.content?.trim();
      if (
        repairResponse.ok &&
        candidate &&
        !isIdentityBoilerplate("assistant", candidate) &&
        !isOverconfidentRelationshipConclusion("assistant", candidate)
      ) {
        reply = candidate;
      } else {
        console.warn("Sarvam reply repair did not produce a usable casual response.");
      }
    }

    const userSource = `sarvam:user:${crypto.randomUUID()}`;
    const assistantSource = `sarvam:assistant:${crypto.randomUUID()}`;

    await supabase.from("voice_conversation_turns").insert([
      {
        user_id: user.id,
        role: "user",
        content: transcript.slice(0, MAX_TURN_CHARS),
        source_key: userSource,
        is_memory: shouldPinAsMemory(transcript),
      },
      {
        user_id: user.id,
        role: "assistant",
        content: reply.slice(0, MAX_TURN_CHARS),
        source_key: assistantSource,
        is_memory: false,
      },
    ]);

    stage = "tts";
    const ttsRequest = buildSarvamTtsRequest(
      reply,
      sarvamTtsSpeaker,
      sarvamTtsLanguage,
      transcript,
    );

    ttsStarted = performance.now();
    const ttsResponse = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": sarvamKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ttsRequest),
      signal: AbortSignal.timeout(30000),
    });

    const diagnostics = {
      provider: "sarvam",
      model: ttsRequest.model,
      speaker: ttsRequest.speaker,
      languageCode: ttsRequest.language_code,
      status: ttsResponse.status,
      contentType: ttsResponse.headers.get("content-type"),
      replyCharacters: ttsRequest.text.length,
      format: ttsRequest.output_audio_codec,
      elapsedMs: Math.round(performance.now() - ttsStarted),
    };
    console.info("Sarvam TTS response", diagnostics);

    const tts = (await readJsonSafely(ttsResponse)) as {
      audios?: string[];
      request_id?: string;
      error?: { message?: string };
    };

    if (!ttsResponse.ok) {
      const category = [401, 403].includes(ttsResponse.status)
        ? "authentication_configuration"
        : ttsResponse.status === 429
          ? "rate_limit_quota"
          : [400, 422].includes(ttsResponse.status)
            ? "voice_payload"
            : ttsResponse.status >= 500
              ? "upstream_failure"
              : "unexpected_response";
      console.error("Sarvam TTS failed", { ...diagnostics, category });
      return json(
        req,
        { stage: "tts", error: "I couldn't say that out loud. Please try again." },
        502,
      );
    }

    const audioBase64 = tts.audios?.[0]?.trim();
    if (!audioBase64 || audioBase64.length < 64) {
      console.error("Sarvam TTS returned empty audio", {
        ...diagnostics,
        category: "empty_audio",
      });
      return json(
        req,
        { stage: "tts", error: "I couldn't say that out loud. Please try again." },
        502,
      );
    }

    console.info("Sarvam TTS succeeded", {
      model: ttsRequest.model,
      speaker: ttsRequest.speaker,
      audioBase64Characters: audioBase64.length,
      format: ttsRequest.output_audio_codec,
    });

    return json(req, {
      transcript,
      reply,
      audio: audioBase64,
      content_type: "audio/wav",
      language_code: stt.language_code ?? "auto",
      stt_provider: "sarvam",
      llm_provider: "sarvam",
      tts_provider: "sarvam",
      tts_model: ttsRequest.model,
      voice: ttsRequest.speaker,
    });
  } catch (error) {
    console.error("Voice companion failed", {
      stage,
      ...(stage === "tts"
        ? {
            provider: "sarvam",
            model: "bulbul:v3",
            speaker: sarvamTtsSpeaker,
            format: "wav",
            elapsedMs: Math.round(performance.now() - ttsStarted),
          }
        : {}),
      category:
        error instanceof Error && /timeout|abort/i.test(error.name) ? "timeout" : "request_failure",
    });
    return json(req, { stage, error: "Voice had a temporary problem. Please try again." }, 502);
  }
});
