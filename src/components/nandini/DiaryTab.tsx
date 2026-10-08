import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, RotateCcw, Save, Search, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Entry = {
  id: string;
  date: string;
  entryDate: string;
  mood: string;
  text: string;
  deletedAt?: string | null;
};
const moods = ["😊", "🥰", "😎", "😴", "😤", "🥺"];
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
function rowToEntry(row: any): Entry {
  let entryDate = row.created_at.slice(0, 10),
    mood = "😊";
  try {
    const m = JSON.parse(row.title);
    if (typeof m?.date === "string") entryDate = m.date;
    if (moods.includes(m?.mood)) mood = m.mood;
  } catch {}
  return {
    id: row.id,
    date: row.created_at,
    entryDate,
    mood,
    text: row.content,
    deletedAt: row.deleted_at,
  };
}

export default function DiaryTab() {
  const { session } = useAuth(),
    uid = session?.user.id;
  const [entries, setEntries] = useState<Entry[]>([]),
    [trash, setTrash] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [entryDate, setEntryDate] = useState(today),
    [text, setText] = useState(""),
    [mood, setMood] = useState("😊"),
    [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}),
    [query, setQuery] = useState(""),
    [moodFilter, setMoodFilter] = useState("all"),
    [showTrash, setShowTrash] = useState(false),
    [draftReady, setDraftReady] = useState(false);

  async function loadEntries() {
    if (!uid) return;
    setLoaded(false);
    const { data, error: e } = await supabase
      .from("diary_entries")
      .select("id,title,content,created_at,deleted_at")
      .eq("user_id", uid)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (e) setError(e.message);
    else setEntries((data || []).map(rowToEntry));
    setLoaded(true);
  }
  async function loadTrash() {
    if (!uid) return;
    setBusy(true);
    const { data, error: e } = await supabase
      .from("diary_entries")
      .select("id,title,content,created_at,deleted_at")
      .eq("user_id", uid)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (e) setError(e.message);
    else setTrash((data || []).map(rowToEntry));
    setBusy(false);
  }
  useEffect(() => {
    setEntries([]);
    setTrash([]);
    setDraftReady(false);
    if (uid) {
      void loadEntries();
      void supabase
        .from("diary_drafts")
        .select("entry_date,mood,content")
        .eq("user_id", uid)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setEntryDate(data.entry_date);
            if (moods.includes(data.mood)) setMood(data.mood);
            setText(data.content || "");
          }
          setDraftReady(true);
        });
    } else {
      setLoaded(true);
      setDraftReady(true);
    }
  }, [uid]);
  useEffect(() => {
    if (!uid || !draftReady || editingId) return;
    const timer = window.setTimeout(async () => {
      if (text.trim())
        await supabase
          .from("diary_drafts")
          .upsert(
            {
              user_id: uid,
              entry_date: entryDate,
              mood,
              content: text,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
      else await supabase.from("diary_drafts").delete().eq("user_id", uid);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [uid, draftReady, editingId, text, entryDate, mood]);

  const editing = useMemo(() => entries.find((e) => e.id === editingId), [entries, editingId]);
  const visible = useMemo(
    () =>
      entries.filter(
        (e) =>
          (!query.trim() || e.text.toLowerCase().includes(query.trim().toLowerCase())) &&
          (moodFilter === "all" || e.mood === moodFilter),
      ),
    [entries, query, moodFilter],
  );
  const groups = useMemo(() => {
    const m = new Map<string, Entry[]>();
    visible.forEach((e) => {
      const label = new Date(e.entryDate + "T12:00:00").toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });
      m.set(label, [...(m.get(label) || []), e]);
    });
    return [...m.entries()];
  }, [visible]);

  async function clearDraft() {
    if (uid) await supabase.from("diary_drafts").delete().eq("user_id", uid);
  }
  function resetComposer() {
    setEditingId(null);
    setEntryDate(today());
    setMood("😊");
    setText("");
  }
  function beginEdit(e: Entry) {
    setEditingId(e.id);
    setEntryDate(e.entryDate);
    setMood(e.mood);
    setText(e.text);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save() {
    const clean = text.trim();
    if (!uid || busy || !clean || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(entryDate)) return;
    setBusy(true);
    setError("");
    const title = JSON.stringify({ date: entryDate, mood });
    if (editingId) {
      const { error: e } = await supabase
        .from("diary_entries")
        .update({ title, content: clean, updated_at: new Date().toISOString() })
        .eq("id", editingId)
        .eq("user_id", uid);
      if (e) setError(e.message);
      else {
        setEntries((cur) =>
          cur.map((x) => (x.id === editingId ? { ...x, entryDate, mood, text: clean } : x)),
        );
        resetComposer();
      }
    } else {
      const id = crypto.randomUUID(),
        createdAt = new Date().toISOString();
      const { error: e } = await supabase
        .from("diary_entries")
        .insert({
          id,
          user_id: uid,
          title,
          content: clean,
          created_at: createdAt,
          updated_at: createdAt,
        });
      if (e) setError(e.message);
      else {
        setEntries((cur) => [{ id, date: createdAt, entryDate, mood, text: clean }, ...cur]);
        await clearDraft();
        resetComposer();
        setNotice("Entry saved privately.");
      }
    }
    setBusy(false);
  }
  async function remove(e: Entry) {
    if (!uid || busy) return;
    setBusy(true);
    const deletedAt = new Date().toISOString();
    const r = await supabase
      .from("diary_entries")
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq("id", e.id)
      .eq("user_id", uid);
    if (r.error) setError(r.error.message);
    else {
      setEntries((cur) => cur.filter((x) => x.id !== e.id));
      setTrash((cur) => [{ ...e, deletedAt }, ...cur]);
      setNotice("Moved to Recently Deleted.");
      if (editingId === e.id) resetComposer();
    }
    setBusy(false);
  }
  async function restore(e: Entry) {
    if (!uid) return;
    setBusy(true);
    const r = await supabase
      .from("diary_entries")
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq("id", e.id)
      .eq("user_id", uid);
    if (r.error) setError(r.error.message);
    else {
      setTrash((cur) => cur.filter((x) => x.id !== e.id));
      await loadEntries();
      setNotice("Entry restored.");
    }
    setBusy(false);
  }
  async function erase(e: Entry) {
    if (!uid) return;
    setBusy(true);
    const r = await supabase.from("diary_entries").delete().eq("id", e.id).eq("user_id", uid);
    if (r.error) setError(r.error.message);
    else setTrash((cur) => cur.filter((x) => x.id !== e.id));
    setBusy(false);
  }
  const age = (iso?: string | null) =>
    iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : 0;

  return (
    <div className="space-y-5 pb-8">
      <section className="glass-pink space-y-4 rounded-3xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-gradient text-xl font-bold">
              {editing ? "Edit this memory ✍️" : "Dear Diary 📖"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Privately saved to your account 🔒</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const n = !showTrash;
              setShowTrash(n);
              if (n) void loadTrash();
            }}
          >
            {showTrash ? <RotateCcw size={15} /> : <Trash2 size={15} />}{" "}
            {showTrash ? "Diary" : "Deleted"}
          </Button>
        </div>
        {!showTrash && (
          <>
            <div className="space-y-1.5">
              <label htmlFor="diary-date" className="text-sm font-medium">
                Entry date
              </label>
              <Input
                id="diary-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="rounded-xl bg-background/60"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {moods.map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMood(m)}
                  className={`rounded-xl p-2 text-xl transition ${mood === m ? "bg-accent ring-2 ring-primary" : "opacity-60 hover:opacity-100"}`}
                >
                  {m}
                </button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              maxLength={20000}
              placeholder="Aaj kya hua? Sab likh do…"
              className="font-script w-full resize-y rounded-2xl border border-border bg-background/60 p-4 text-xl leading-relaxed outline-none focus:border-primary"
            />
            {!editingId && text.trim() && (
              <p className="text-xs text-muted-foreground">
                Draft syncs privately across your signed-in devices.
              </p>
            )}
            <div className="flex gap-2">
              {editingId && (
                <Button variant="outline" onClick={resetComposer}>
                  <X size={16} />
                  Cancel
                </Button>
              )}
              <Button
                onClick={() => void save()}
                disabled={!text.trim() || !entryDate || !loaded || busy || !uid}
                className="gradient-primary flex-1"
              >
                <Save size={16} />
                {busy ? "Saving…" : editingId ? "Save changes" : "Save entry"}
              </Button>
            </div>
          </>
        )}
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
      {showTrash ? (
        <div className="space-y-3">
          {trash.length === 0 && !busy && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Recently Deleted is empty.
            </p>
          )}
          {trash.map((e) => (
            <article key={e.id} className="glass-pink rounded-2xl p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {e.mood}{" "}
                    {new Date(e.entryDate + "T12:00:00").toLocaleDateString("en-IN", {
                      dateStyle: "medium",
                    })}
                  </p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                    {e.text}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Deleted {age(e.deletedAt)} day{age(e.deletedAt) === 1 ? "" : "s"} ago
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button size="sm" variant="ghost" onClick={() => void restore(e)}>
                    <RotateCcw size={14} />
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => void erase(e)}
                  >
                    <Trash2 size={14} />
                    Forever
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <>
          <div className="glass-pink space-y-3 rounded-2xl p-4">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your diary…"
                className="rounded-xl pl-9"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setMoodFilter("all")}
                className={`rounded-full px-3 py-1.5 text-xs ${moodFilter === "all" ? "bg-primary text-primary-foreground" : "bg-background/60"}`}
              >
                All
              </button>
              {moods.map((m) => (
                <button
                  key={m}
                  onClick={() => setMoodFilter(m)}
                  className={`rounded-full px-3 py-1.5 text-sm ${moodFilter === m ? "bg-primary/20 ring-1 ring-primary" : "bg-background/60"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            {groups.map(([month, items]) => (
              <section key={month} className="space-y-3">
                <h3 className="sticky top-0 z-10 w-fit rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-muted-foreground backdrop-blur">
                  {month}
                </h3>
                {items.map((e) => {
                  const long = e.text.length > 320 || e.text.split("\n").length > 5,
                    open = !!expanded[e.id];
                  return (
                    <article key={e.id} className="diary-card glass-pink rounded-3xl p-4 shadow-sm">
                      <header className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background/60 text-lg">
                            {e.mood}
                          </span>
                          <p className="text-sm font-semibold">
                            {new Date(e.entryDate + "T12:00:00").toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div>
                          <button
                            onClick={() => beginEdit(e)}
                            className="rounded-lg p-2 text-muted-foreground"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => void remove(e)}
                            className="rounded-lg p-2 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </header>
                      <div className="mt-3 border-t border-border/50 pt-3">
                        <p
                          className={`font-script whitespace-pre-wrap break-words text-lg leading-relaxed ${long && !open ? "line-clamp-5" : ""}`}
                        >
                          {e.text}
                        </p>
                        {long && (
                          <button
                            onClick={() => setExpanded((x) => ({ ...x, [e.id]: !open }))}
                            className="mt-2 flex items-center gap-1 text-xs font-medium text-primary"
                          >
                            {open ? (
                              <>
                                <ChevronUp size={14} />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown size={14} />
                                Read full entry
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </section>
            ))}
          </div>
          {loaded && entries.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Abhi koi entry nahi hai. Pehli likho! ✨
            </p>
          )}
          {loaded && entries.length > 0 && visible.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No diary entries match this search.
            </p>
          )}
        </>
      )}
    </div>
  );
}
