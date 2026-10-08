import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { isConfigured, loginEmail, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/useAuth";

export default function LockScreen() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const auth = useAuth();
  const alive = useRef(true);
  const submitting = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current || !isConfigured || !loginEmail || !password) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const { error: failure } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });
      if (failure && alive.current) setError("Unlock failed. Check your password and try again.");
    } catch {
      if (alive.current) setError("Unable to connect. Please try again.");
    } finally {
      submitting.current = false;
      if (alive.current) {
        setBusy(false);
        setPassword("");
      }
    }
  };
  return (
    <div className="min-h-dvh flex items-center justify-center gradient-pink p-4">
      <motion.form
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onSubmit={submit}
        className="w-full max-w-sm glass-pink rounded-2xl p-6 space-y-5"
      >
        <h1 className="text-2xl font-bold text-gradient text-center">🚨 RUKO RUKO RUKO 🚨</h1>
        <p className="text-sm text-muted-foreground">Apna private friendship corner unlock karo! 😄</p>
        <label className="block text-sm" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={busy}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl p-3 border bg-background/60"
        />
        {!loginEmail && (
          <p role="alert" className="text-sm text-destructive">
            App setup is incomplete. Configure the login account before unlocking.
          </p>
        )}
        {(error || auth.error) && (
          <p role="alert" className="text-sm text-destructive">
            {error || auth.error}
          </p>
        )}
        {auth.error.startsWith("Sign-out") && (
          <button
            type="button"
            onClick={() => void auth.logout()}
            className="w-full p-3 rounded-xl border"
          >
            Retry sign-out
          </button>
        )}
        <button
          disabled={busy || !isConfigured || !loginEmail}
          className="w-full rounded-xl p-3 gradient-primary text-white disabled:opacity-50"
        >
          {busy ? "Unlocking…" : "Andar Aao 🚪"}
        </button>
      </motion.form>
    </div>
  );
}
