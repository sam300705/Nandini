import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { createClient } from "@supabase/supabase-js";

// Nandini-specific env names prevent accidental reuse of existing app settings.
const projectId = import.meta.env["VITE_NANDINI_SUPABASE_PROJECT_ID"]?.trim();
const url = import.meta.env["VITE_NANDINI_SUPABASE_URL"]?.trim();
const key = import.meta.env["VITE_NANDINI_SUPABASE_PUBLISHABLE_KEY"]?.trim();
const configuredEmail = import.meta.env["VITE_NANDINI_LOGIN_EMAIL"]?.trim();
export const loginEmail =
  configuredEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configuredEmail) ? configuredEmail : "";
let validUrl = false;
try {
  const parsed = new URL(url);
  validUrl = Boolean(
    projectId && parsed.protocol === "https:" && parsed.hostname === `${projectId}.supabase.co`,
  );
} catch {
  // The setup screen handles an unconfigured independent project.
}
export const isConfigured = Boolean(validUrl && key && key !== "your-publishable-key");
export const supabase = createClient(
  isConfigured ? url : "http://127.0.0.1:54321",
  isConfigured ? key : "unconfigured",
  {
    global: { fetch: fetchWithTimeout },
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  },
);
