import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Home, LogOut, Sparkles, UsersRound } from "lucide-react";
import LockScreen from "@/components/nandini/LockScreen";
import HomeTab from "@/components/nandini/HomeTab";
import FriendshipNote from "@/components/nandini/FriendshipNote";
import { AuthProvider } from "@/auth/AuthProvider";
import { useAuth } from "@/auth/useAuth";
import DiaryTab from "@/components/nandini/DiaryTab";
import TogetherDiaryTab from "@/components/nandini/TogetherDiaryTab";
import VoiceCompanion from "@/components/nandini/VoiceCompanion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hey Nandini! — A little friendship corner" },
      {
        name: "description",
        content: "Fun notes, a diary, and friendship memories — made for Nandini by a friend.",
      },
      { property: "og:title", content: "Hey Nandini! — A little friendship corner" },
      {
        property: "og:description",
        content: "Fun notes, a diary, and friendship memories — made for Nandini by a friend.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Tab = "home" | "diary" | "together" | "note";
const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "diary", label: "Diary", icon: BookOpen },
  { id: "together", label: "Friendship Diary", icon: UsersRound },
] as const;

function Index() {
  return (
    <AuthProvider>
      <PrivateApp />
    </AuthProvider>
  );
}

function PrivateApp() {
  const { session, loading, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("home");
  if (loading) return <div className="gradient-pink min-h-dvh" />;
  if (!session) return <LockScreen />;

  return (
    <div className="gradient-pink min-h-dvh">
      <div className="mx-auto max-w-lg px-4 pb-28 pt-4">
        <header className="glass-pink mb-4 flex items-center justify-between rounded-2xl px-4 py-3">
          <div>
            <h1 className="text-gradient font-script text-3xl font-bold">Hey Nandini! 👋</h1>
            <p className="text-xs text-muted-foreground">Your own happy friendship corner</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-[10px] font-semibold tracking-wider text-accent-foreground">
              <Sparkles size={11} /> PRIVATE
            </span>
            <button
              aria-label="Lock"
              onClick={() => void logout()}
              className="rounded-full p-1.5 text-muted-foreground hover:text-primary"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main key={tab} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {tab === "home" && <HomeTab onOpenNote={() => setTab("note")} />}
          {tab === "note" && <FriendshipNote onBack={() => setTab("home")} />}
          {tab === "diary" && <DiaryTab />}
          {tab === "together" && <TogetherDiaryTab />}
        </main>
      </div>

      <VoiceCompanion visible={tab === "home"} />

      <nav
        aria-label="Main navigation"
        className="glass-pink fixed inset-x-0 bottom-3 z-40 mx-auto flex w-[calc(100%-2rem)] max-w-lg justify-around rounded-2xl p-1.5"
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] transition ${active ? "gradient-primary font-semibold" : "text-muted-foreground"}`}
            >
              <Icon size={18} strokeWidth={active ? 2.3 : 1.7} />
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
