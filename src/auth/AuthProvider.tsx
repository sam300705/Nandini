import { AuthContext } from "./useAuth";
import { useEffect, useState, useRef, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isConfigured, supabase } from "@/integrations/supabase/client";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const signingOut = useRef(false);
  useEffect(() => {
    let active = true;
    let revision = 0;
    let expiry: ReturnType<typeof setTimeout>;
    const apply = (next: Session | null) => {
      clearTimeout(expiry);
      const valid = next && next.expires_at && next.expires_at * 1000 > Date.now() ? next : null;
      setSession(valid);
      setLoading(false);
      if (valid?.expires_at)
        expiry = setTimeout(
          () => {
            setSession(null);
            setError("Session expired. Please sign in again.");
          },
          Math.max(0, valid.expires_at * 1000 - Date.now()),
        );
    };
    if (!isConfigured) {
      setError("App setup is incomplete. Configure Supabase before signing in.");
      setLoading(false);
      return;
    }
    const verify = async (next: Session | null, version: number) => {
      if (!next) {
        if (active && revision === version) apply(null);
        return;
      }
      try {
        const { data, error: failure } = await supabase.auth.getUser(next.access_token);
        if (!active || revision !== version || signingOut.current) return;
        if (failure || !data.user || data.user.id !== next.user.id) {
          setError("Session invalid. Please sign in again.");
          apply(null);
        } else apply(next);
      } catch {
        if (active && revision === version && !signingOut.current) {
          setError("Unable to verify your session. Please sign in again.");
          apply(null);
        }
      }
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_IN") signingOut.current = false;
      if (signingOut.current && next) return;
      const version = ++revision;
      if (active) {
        setError("");
        // Schedule network verification outside the Auth event callback/lock.
        void Promise.resolve().then(() => verify(next, version));
      }
    });
    const initialRevision = revision;
    supabase.auth
      .getSession()
      .then(({ data, error: failure }) => {
        if (!active || revision !== initialRevision) return;
        if (failure) {
          setError("Unable to restore your session. Please sign in.");
          apply(null);
        } else void verify(data.session, initialRevision);
      })
      .catch(() => {
        if (active && revision === initialRevision) {
          setError("Unable to restore your session.");
          apply(null);
        }
      });
    return () => {
      active = false;
      clearTimeout(expiry);
      subscription.unsubscribe();
    };
  }, []);
  const logout = async () => {
    signingOut.current = true;
    setSession(null);
    try {
      const { error: failure } = await supabase.auth.signOut({ scope: "local" });
      if (failure)
        setError("Sign-out could not be completed. Please retry before leaving this device.");
    } catch {
      setError("Sign-out could not be completed. Please retry before leaving this device.");
    }
  };
  return (
    <AuthContext.Provider value={{ session, loading, error, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
