export function isIdentityBoilerplate(role: string, content: string) {
  if (role !== "assistant") return false;
  const value = content.toLowerCase();
  return (
    /\b(i\s*am|i'm|im)\b.{0,40}\b(ai\s*companion|little\s+ai|companion\s+inside\s+the\s+app)\b/i.test(value) ||
    /\b(your|ur)\s+(little\s+)?ai\s*companion\b/i.test(value) ||
    /\b(main|mai|mein)\b.{0,35}\b(ai\s*companion|companion)\b/i.test(value) ||
    /छोटा\s*सा\s*ai.{0,40}(companion|ऐप|app)/iu.test(content) ||
    /चोटा\s*सा\s*ai.{0,40}(companion|ऐप|app)/iu.test(content) ||
    /ai\s*companion.{0,45}app\s*(mein|me)\s*(rehta|rahta|rehata|rehti|rahti)/i.test(content) ||
    /ai\s*companion.{0,45}ऐप\s*(में|मे).*रहत/iu.test(content)
  );
}

export function isIdentityQuestion(text: string) {
  const value = text.trim().toLowerCase();
  return (
    /\b(who are you|what are you|are you (an? )?(ai|bot)|tell me about yourself)\b/i.test(value) ||
    /\b(tu|tum|aap)\s+(kaun|kon)\s+(hai|ho)\b/i.test(value) ||
    /\b(kya|kia)\s+(tu|tum|aap)\s+(ai|bot)\b/i.test(value) ||
    /तुम\s+कौन\s+हो|तू\s+कौन\s+है|आप\s+कौन\s+हैं|क्या\s+तुम\s+(एआई|AI)/u.test(text)
  );
}

export function isOverconfidentRelationshipConclusion(role: string, content: string) {
  if (role !== "assistant") return false;
  const value = content.toLowerCase();

  const uncertain =
    /\b(maybe|perhaps|possibly|could be|might be|ho sakta|ho skta|shayad|lag raha|lagta hai)\b/i.test(
      value,
    ) || /हो सकता|शायद|लगता है/u.test(content);

  if (uncertain) return false;

  return (
    /\b(she|he|they|wo|woh|vo)\b.{0,45}\b(ignore|ignoring|not interested|interested nahi|interest nahi)\b/i.test(
      value,
    ) ||
    /\b(ignore kar (rahi|rhi|raha|rha) hai|interested nahi hai|interest nahi hai)\b/i.test(value) ||
    /(इग्नोर|ignore).{0,20}(कर रही है|कर रहा है)|इंटरेस्टेड नहीं है|दिलचस्पी नहीं है/iu.test(content)
  );
}
