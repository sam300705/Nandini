import { describe, expect, it } from "vitest";
import { buildSarvamTtsRequest } from "../../supabase/functions/sarvam-companion/speech";

describe("Sarvam Bulbul v3 speech delivery", () => {
  it("builds a Hindi/Hinglish WAV request with Bulbul v3", () => {
    const request = buildSarvamTtsRequest("हाँ बोल ना, आज क्या scene है?", "kavya");
    expect(request).toMatchObject({
      language_code: "hi-IN",
      speaker: "kavya",
      model: "bulbul:v3",
      speech_sample_rate: 24000,
      output_audio_codec: "wav",
    });
    expect(request.pace).toBeGreaterThan(1);
    expect(request.temperature).toBeGreaterThan(0.5);
  });

  it.each(["आज मैं बहुत उदास हूँ", "I'm feeling lonely", "yaar bahut pareshan hoon"])(
    "uses a calmer delivery for sensitive context: %s",
    (context) => {
      const request = buildSarvamTtsRequest("मैं यहीं हूँ, बता क्या हुआ?", "kavya", "hi-IN", context);
      expect(request.pace).toBeLessThan(1);
      expect(request.temperature).toBeLessThan(0.6);
    },
  );

  it("removes control characters and respects the Bulbul v3 text limit", () => {
    const request = buildSarvamTtsRequest(`hello\u0000${"x".repeat(3000)}`);
    expect(request.text).not.toContain("\u0000");
    expect(request.text.length).toBe(2500);
  });

  it("keeps the configured speaker and language explicit", () => {
    const request = buildSarvamTtsRequest("नमस्ते", "suhani", "hi-IN");
    expect(request.speaker).toBe("suhani");
    expect(request.language_code).toBe("hi-IN");
  });
});
