import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Heart, Home, Image, LogOut, Sparkles } from "lucide-react";
import LockScreen from "@/components/nandini/LockScreen";
import HomeTab from "@/components/nandini/HomeTab";
import { AuthProvider } from "@/auth/AuthProvider";
import { useAuth } from "@/auth/useAuth";
import GalleryTab from "@/components/nandini/GalleryTab";
import DiaryTab from "@/components/nandini/DiaryTab";
import TogetherDiaryTab from "@/components/nandini/TogetherDiaryTab";
import VoiceCompanion from "@/components/nandini/VoiceCompanion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hey Nandini ♡ — Your private little universe" },
      {
        name: "description",
        content: "Handwritten pages, birthday countdown, gallery and diary — made just for Nandini.",
      },
      { property: "og:title", content: "Hey Nandini ♡ — Your private little universe" },
      {
        property: "og:description",
        content: "Handwritten pages, birthday countdown, gallery and diary — made just for Nandini.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Tab = "home" | "gallery" | "diary" | "together";
const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "gallery", label: "Gallery", icon: Image },
  { id: "diary", label: "Diary", icon: BookOpen },
  { id: "together", label: "Us Diary", icon: Heart },
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
            <h1 className="text-gradient font-script text-3xl font-bold">Hey Nandini ♡</h1>
            <p className="text-xs text-muted-foreground">Your private little universe</p>
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
          {tab === "home" && <HomeTab />}
          {tab === "gallery" && <GalleryTab />}
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
