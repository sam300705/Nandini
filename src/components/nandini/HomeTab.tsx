import MemoryBook from "./MemoryBook";
import { BookHeart, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { BIRTHDAY, compliments, littleNotes, shayaris, tags } from "@/lib/nandini-content";

function Countdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!BIRTHDAY) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!BIRTHDAY) return (
    <div className="glass-pink glow-primary space-y-2 rounded-2xl p-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">🎂 A Special Day</p>
      <p className="text-sm text-muted-foreground">A surprise countdown will appear when the date is added ♡</p>
    </div>
  );
  const n = now ?? 0;
  const d = new Date(n);
  let bday = new Date(d.getFullYear(), BIRTHDAY.month, BIRTHDAY.day);
  if (bday.getTime() <= n) bday = new Date(d.getFullYear() + 1, BIRTHDAY.month, BIRTHDAY.day);
  const diff = now === null ? 0 : bday.getTime() - n;
  const units = [
    { v: Math.floor(diff / 86400000), l: "Days" },
    { v: Math.floor(diff / 3600000) % 24, l: "Hours" },
    { v: Math.floor(diff / 60000) % 60, l: "Mins" },
    { v: Math.floor(diff / 1000) % 60, l: "Secs" },
  ];
  return (
    <div className="glass-pink glow-primary space-y-3 rounded-2xl p-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">🎂 Birthday Countdown</p>
      <div className="grid grid-cols-4 gap-2">
        {units.map((u) => <div key={u.l} className="rounded-xl border border-border/60 bg-background/50 py-2">
          <p className="text-gradient text-2xl font-bold tabular-nums">{String(u.v).padStart(2, "0")}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{u.l}</p>
        </div>)}
      </div>
      <p className="text-xs text-muted-foreground">A special day is on its way! 🎉</p>
    </div>
  );
}
export default function HomeTab({ onOpenLetter }: { onOpenLetter: () => void }) {
  const [compliment, setCompliment] = useState("");
  const [day, setDay] = useState(0);
  useEffect(() => setDay(new Date().getDate()), []);
  return (
    <div className="space-y-5 pb-6">
      <div className="glass-pink animate-in fade-in slide-in-from-bottom-4 space-y-3 rounded-2xl p-5 duration-500">
        <h2 className="text-gradient text-xl font-bold">Hey Nandini! 👑</h2>
        <p className="text-sm text-muted-foreground">A tiny world, made with care and code, just for you 💖</p>
        <div className="flex flex-wrap gap-1.5">{tags.map((tag) =>
          <span key={tag} className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">{tag}</span>
        )}</div>
      </div>
      <button
        type="button"
        onClick={onOpenLetter}
        className="glass-pink group flex w-full items-center gap-3 rounded-2xl border border-pink-200/80 p-4 text-left transition hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
        aria-label="Open your friendship letter"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pink-100 text-pink-600">
          <BookHeart size={25} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-wider text-pink-700">A little letter for you</span>
          <span className="mt-1 block text-sm text-foreground">From Dronacharya's first year to friends for years ♡</span>
        </span>
        <ArrowRight size={19} className="shrink-0 text-pink-600 transition group-hover:translate-x-1" aria-hidden="true" />
      </button>
      <MemoryBook />
      <Countdown />
      <div className="glass-pink space-y-2 rounded-2xl p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">✍️ Aaj ki Shayari</p>
        <p className="font-script text-2xl leading-snug text-foreground">{shayaris[day % shayaris.length]}</p>
      </div>
      <div className="glass-pink space-y-2 rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">💗 Little Note of the Day</p>
        <p className="text-sm">{littleNotes[day % littleNotes.length]}</p>
      </div>
      <div className="glass-pink space-y-3 rounded-2xl p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">💌 Compliment Machine</p>
        {compliment && <p key={compliment} className="animate-in zoom-in-95 fade-in text-sm font-medium">{compliment}</p>}
        <button onClick={() => setCompliment(compliments[Math.floor(Math.random() * compliments.length)] ?? "")}
          className="gradient-primary rounded-xl px-4 py-2 text-sm font-medium">Ek compliment do ✨</button>
      </div>
    </div>
  );
}
