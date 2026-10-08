import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";
export type AuthState = {
  session: Session | null;
  loading: boolean;
  error: string;
  logout: () => Promise<void>;
};
export const AuthContext = createContext<AuthState | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is required");
  return value;
}
