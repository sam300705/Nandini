export const BIRTHDAY: { month: number; day: number } | null = (() => {
  const value = import.meta.env["VITE_NANDINI_BIRTHDAY"] || "";
  const match = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.exec(value);
  if (!match) return null;
  const month = Number(match[1]) - 1;
  const day = Number(match[2]);
  const sample = new Date(2024, month, day);
  return sample.getMonth() === month && sample.getDate() === day ? { month, day } : null;
})();
// Only generic, platonic notes until Nandini shares her own preferences.
export const tags = ["Good vibes only 😎", "Little wins ✨", "Memories with friends 🤝"];
export const friendshipNotes = [
  "Real friends make ordinary days funnier. 😄",
  "Good company, random jokes, and a lot of memories — that is the vibe. 🌟",
  "Ek achhi friendship mein bakwaas jokes bhi legendary lagte hain. 😂",
  "Cheers to the people who make life a little more fun! 🎉",
];
export const littleNotes = [
  "New day, new stories. Kya scene hai? 👋",
  "Take your time and enjoy the small wins today. 🌈",
  "Some days need good music and a solid laugh. 🎧",
];
export const compliments = [
  "You're a genuinely fun person to have around. 🙌",
  "Great friends deserve great days. 🌟",
  "Aaj ek extra high-five banta hai! ✋",
  "Your energy can make an ordinary day better. 😄",
];
