export const BIRTHDAY: { month: number; day: number } | null = (() => {
  const value = import.meta.env["VITE_NANDINI_BIRTHDAY"] || "";
  const match = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.exec(value);
  if (!match) return null;
  const month = Number(match[1]) - 1;
  const day = Number(match[2]);
  const sample = new Date(2024, month, day);
  return sample.getMonth() === month && sample.getDate() === day ? { month, day } : null;
})();
export const tags = ["Your own little space 💖", "Moments worth keeping ✨", "Just for you 🎀"];
export const shayaris = [
  "Chaand bhi sharma jaaye, jab tum muskurao 🌙",
  "Tum ho toh har din Sunday lagta hai ☀️",
  "Dil ki baat kya kahein, tum khud ek dua ho 💕",
  "Sitaaron se zyada chamakti ho tum ✨",
];
export const littleNotes = [
  "Some days deserve a little extra sparkle. ✨",
  "Small moments often make the best memories. 💗",
  "A little corner of the internet, made just for you. ♡",
];
export const compliments = [
  "Your smile deserves its own sunshine ☀️",
  "Keep being your wonderful self ✨",
  "Tum ho toh din thoda aur bright lagta hai 💕",
  "Aaj tumhare naam ek extra smile! 🎀",
];
