import { useEffect, useMemo, useState } from "react";
import { Pencil, Save, Search, Trash2, UsersRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Author = "nandini" | "sambhav";
type Entry = {
  id: string;
  author: Author;
  entryDate: string;
  mood: string;
  text: string;
  createdAt: string;
};

type TogetherDiaryRow = {
  id: string;
  author: string;
  entry_date: string;
  mood: string;
  content: string;
  created_at: string;
};
const moods = ["🤝", "😂", "😊", "✨", "😎", "🎉"];

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

function toEntry(row: TogetherDiaryRow): Entry {
  return {
    id: row.id,
    author: row.author === "sambhav" ? "sambhav" : "nandini",
    entryDate: row.entry_date,
    mood: row.mood || "🤝",
    text: row.content,
    createdAt: row.created_at,
  };
}

export default function TogetherDiaryTab() {
  const { session } = useAuth();
  const uid = session?.user.id;

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [author, setAuthor] = useState<Author>("nandini");
  const [entryDate, setEntryDate] = useState(today);
  const [mood, setMood] = useState("🤝");
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [authorFilter, setAuthorFilter] = useState<"all" | Author>("all");

  async function load() {
    if (!uid) return;
    setLoaded(false);
    setError("");
    const { data, error: loadError } = await supabase
      .from("together_diary_entries")
      .select("id,author,entry_date,mood,content,created_at")
      .eq("user_id", uid)
      .is("deleted_at", null)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (loadError) setError(loadError.message);
    else setEntries((data || []).map(toEntry));
    setLoaded(true);
  }

  useEffect(() => {
    setEntries([]);
    if (uid) void load();
    else setLoaded(true);
  }, [uid]);

  const editing = useMemo(
    () => entries.find((entry) => entry.id === editingId) ?? null,
    [entries, editingId],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter(
      (entry) =>
        (authorFilter === "all" || entry.author === authorFilter) &&
        (!needle || entry.text.toLowerCase().includes(needle)),
    );
  }, [entries, authorFilter, query]);

  const resetComposer = () => {
    setEditingId(null);
    setAuthor("nandini");
    setEntryDate(today());
    setMood("🤝");
    setText("");
  };

  const beginEdit = (entry: Entry) => {
    setEditingId(entry.id);
    setAuthor(entry.author);
    setEntryDate(entry.entryDate);
    setMood(entry.mood);
    setText(entry.text);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function save() {
    const clean = text.trim();
    if (!uid || !clean || busy) return;

    setBusy(true);
    setError("");
    setNotice("");

    const now = new Date().toISOString();

    if (editingId) {
      const { error: saveError } = await supabase
        .from("together_diary_entries")
        .update({
          author,
          entry_date: entryDate,
          mood,
          content: clean,
          updated_at: now,
        })
        .eq("id", editingId)
        .eq("user_id", uid);

      if (saveError) setError(saveError.message);
      else {
        setEntries((current) =>
          current.map((entry) =>
            entry.id === editingId ? { ...entry, author, entryDate, mood, text: clean } : entry,
          ),
        );
        setNotice("Memory updated.");
        resetComposer();
      }
    } else {
      const id = crypto.randomUUID();
      const { error: saveError } = await supabase.from("together_diary_entries").insert({
        id,
        user_id: uid,
        author,
        entry_date: entryDate,
        mood,
        content: clean,
        created_at: now,
        updated_at: now,
      });

      if (saveError) setError(saveError.message);
      else {
        setEntries((current) => [
          { id, author, entryDate, mood, text: clean, createdAt: now },
          ...current,
        ]);
        setNotice("Saved in your friendship diary.");
        resetComposer();
      }
    }

    setBusy(false);
  }

  async function remove(entry: Entry) {
    if (!uid || busy) return;
    if (!window.confirm("Remove this friendship memory?")) return;

    setBusy(true);
    const deletedAt = new Date().toISOString();
    const { error: removeError } = await supabase
      .from("together_diary_entries")
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq("id", entry.id)
      .eq("user_id", uid);

    if (removeError) setError(removeError.message);
    else {
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      if (editingId === entry.id) resetComposer();
      setNotice("Memory removed.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-5 pb-8">
      <section className="glass-pink space-y-4 rounded-3xl p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <UsersRound size={21} />
          </div>
          <div>
            <h2 className="text-gradient text-xl font-bold">
              {editing
                ? "Edit this friendship memory ✍️"
                : "Sambhav & Nandini — Friendship Diary 🤝"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Funny moments, shared experiences, and the stories of a good friendship.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-background/50 p-1.5">
          {(["nandini", "sambhav"] as const).map((person) => (
            <button
              key={person}
              type="button"
              onClick={() => setAuthor(person)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                author === person
                  ? "gradient-primary"
                  : "text-muted-foreground hover:bg-background/70"
              }`}
            >
              {person === "nandini" ? "Nandini" : "Sambhav"}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="together-diary-date" className="text-sm font-medium">
            Memory date
          </label>
          <Input
            id="together-diary-date"
            type="date"
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
            className="rounded-xl bg-background/60"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {moods.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setMood(item)}
              aria-label={`Mood ${item}`}
              className={`rounded-xl p-2 text-xl transition ${
                mood === item ? "bg-accent ring-2 ring-primary" : "opacity-60 hover:opacity-100"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={7}
          maxLength={20000}
          placeholder={
            author === "nandini"
              ? "Nandini ke side se aaj kya yaad rakhna hai?"
              : "Sambhav ke side se aaj kya yaad rakhna hai?"
          }
          className="font-script w-full resize-y rounded-2xl border border-border bg-background/60 p-4 text-xl leading-relaxed outline-none focus:border-primary"
        />

        <div className="flex gap-2">
          {editingId && (
            <Button variant="outline" onClick={resetComposer}>
              <X size={16} /> Cancel
            </Button>
          )}
          <Button
            onClick={() => void save()}
            disabled={!uid || !entryDate || !text.trim() || busy}
            className="gradient-primary flex-1"
          >
            <Save size={16} />
            {busy ? "Saving…" : editingId ? "Save changes" : "Save memory"}
          </Button>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}

      <section className="glass-pink space-y-3 rounded-2xl p-4">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your memories…"
            className="rounded-xl pl-9"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["all", "nandini", "sambhav"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setAuthorFilter(filter)}
              className={`rounded-xl px-2 py-2 text-xs font-semibold transition ${
                authorFilter === filter
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/60 text-muted-foreground"
              }`}
            >
              {filter === "all" ? "Both" : filter === "nandini" ? "Nandini" : "Sambhav"}
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-3">
        {visible.map((entry) => (
          <article key={entry.id} className="glass-pink rounded-3xl p-4 shadow-sm">
            <header className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background/65 text-xl">
                  {entry.mood}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {entry.author === "nandini" ? "Nandini" : "Sambhav"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.entryDate + "T12:00:00").toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0">
                <button
                  type="button"
                  aria-label="Edit memory"
                  onClick={() => beginEdit(entry)}
                  className="rounded-lg p-2 text-muted-foreground hover:text-primary"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  aria-label="Remove memory"
                  onClick={() => void remove(entry)}
                  className="rounded-lg p-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </header>
            <p className="font-script mt-3 whitespace-pre-wrap break-words border-t border-border/50 pt-3 text-lg leading-relaxed">
              {entry.text}
            </p>
          </article>
        ))}
      </div>

      {loaded && entries.length === 0 && (
        <div className="glass-pink rounded-3xl px-6 py-12 text-center">
          <UsersRound size={30} className="mx-auto mb-3 text-primary" />
          <p className="font-medium">Abhi koi shared memory nahi hai.</p>
          <p className="mt-1 text-sm text-muted-foreground">Pehli friendship memory likho! 😄</p>
        </div>
      )}

      {loaded && entries.length > 0 && visible.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No memories match this search.
        </p>
      )}
    </div>
  );
}
