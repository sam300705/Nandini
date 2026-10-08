import { useEffect, useState } from "react";
import { BIRTHDAY, compliments, friendshipNotes, littleNotes, tags } from "@/lib/nandini-content";
import MemoryBook from "./MemoryBook";

function Countdown() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!BIRTHDAY) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!BIRTHDAY) return null;

  const moment = now ?? 0;
  const current = new Date(moment);
  let birthday = new Date(current.getFullYear(), BIRTHDAY.month, BIRTHDAY.day);
  if (birthday.getTime() <= moment) {
    birthday = new Date(current.getFullYear() + 1, BIRTHDAY.month, BIRTHDAY.day);
  }
  const remaining = now === null ? 0 : birthday.getTime() - moment;
  const units = [
    { value: Math.floor(remaining / 86400000), label: "Days" },
    { value: Math.floor(remaining / 3600000) % 24, label: "Hours" },
    { value: Math.floor(remaining / 60000) % 60, label: "Mins" },
    { value: Math.floor(remaining / 1000) % 60, label: "Secs" },
  ];

  return (
    <div className="glass-pink glow-primary space-y-3 rounded-2xl p-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
        🎂 Countdown to your birthday
      </p>
      <div className="grid grid-cols-4 gap-2">
        {units.map((unit) => (
          <div key={unit.label} className="rounded-xl border border-border/60 bg-background/50 py-2">
            <p className="text-gradient text-2xl font-bold tabular-nums">
              {String(unit.value).padStart(2, "0")}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {unit.label}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">The birthday countdown is on! 🎉</p>
    </div>
  );
}

export default function HomeTab() {
  const [compliment, setCompliment] = useState("");
  const [day, setDay] = useState(0);
  useEffect(() => setDay(new Date().getDate()), []);

  return (
    <div className="space-y-5 pb-6">
      <section className="glass-pink space-y-3 rounded-2xl p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          🌈 A little space for a good friend
        </p>
        <h2 className="text-gradient text-2xl font-bold">Hey Nandini! 👋</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Sambhav made this little corner for you — a place for random talks,
          everyday stories, goofy memories and good friendship vibes. No cheesy stuff. 😄
        </p>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
              {tag}
            </span>
          ))}
        </div>
      </section>

      <MemoryBook />
      <Countdown />

      <section className="glass-pink space-y-2 rounded-2xl p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          🗯️ Friendship thought of the day
        </p>
        <p className="text-lg font-semibold leading-snug text-foreground">
          {friendshipNotes[day % friendshipNotes.length]}
        </p>
      </section>

      <section className="glass-pink space-y-2 rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          🌟 Little reminder
        </p>
        <p className="text-sm">{littleNotes[day % littleNotes.length]}</p>
      </section>

      <section className="glass-pink space-y-3 rounded-2xl p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          ✋ Friendship high-five
        </p>
        {compliment && (
          <p key={compliment} className="animate-in zoom-in-95 fade-in text-sm font-medium">
            {compliment}
          </p>
        )}
        <button
          onClick={() => setCompliment(compliments[Math.floor(Math.random() * compliments.length)] ?? "")}
          className="gradient-primary rounded-xl px-4 py-2 text-sm font-medium"
        >
          Give me a high-five! 🙌
        </button>
      </section>
    </div>
  );
}
