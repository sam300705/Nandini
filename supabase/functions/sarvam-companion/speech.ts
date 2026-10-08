const seriousContext =
  /\b(sad|upset|anxious|anxiety|depressed|lonely|grief|died|crying|hurt|suicide|dukhi|udaas|udas|pareshan|tension|rona)\b|उदास|दुख|दुःख|परेशान|अकेल|रो रही|रो रहा|डर लग|घबरा|मौत|मर ग|आत्महत्या|तनाव/iu;

export type SarvamTtsRequest = {
  text: string;
  language_code: string;
  speaker: string;
  model: "bulbul:v3";
  pace: number;
  speech_sample_rate: 24000;
  output_audio_codec: "wav";
  temperature: number;
};

export function buildSarvamTtsRequest(
  reply: string,
  speaker = "kavya",
  languageCode = "hi-IN",
  context = "",
): SarvamTtsRequest {
  const empathetic = seriousContext.test(`${context} ${reply}`);
  return {
    text: reply.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, 2500),
    language_code: languageCode,
    speaker,
    model: "bulbul:v3",
    pace: empathetic ? 0.96 : 1.04,
    speech_sample_rate: 24000,
    output_audio_codec: "wav",
    temperature: empathetic ? 0.5 : 0.68,
  };
}
