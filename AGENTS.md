# Nandini agent rules

- This is a standalone surprise app. Keep the existing React/TanStack Start/TypeScript/Supabase/Three.js/Sarvam-only architecture and pink mobile UI.
- Home, Gallery, personal Diary and **Sambhav & Nandini** Us Diary are four tabs in `/`.
- Preserve **Sambhav** as a distinct author option and separate entries. Don't rename or remove his section.
- **Never copy personal information from the source app**: no private photos, handwritten pages, diary records, voice memory, authentication users, legacy localStorage diaries, credentials, or old Supabase configuration.
- Nandini must have a dedicated Supabase project for Auth, private Storage, owner-scoped RLS tables and Edge Functions. Browser config has `VITE_NANDINI_*` prefixes. Missing config keeps the app locked.
- Only a Supabase Auth verified account can view pages. Do not restore a browser-only password gate.
- Gallery retains resumable video uploads, with no app-level size cap; project plan/host limits still apply.
- Private `home-private` data is uploaded separately with permission and never checked into git.
- Sarvam Saaras v4 STT → sarvam-105b-conversations → Bulbul v3 TTS; keys stay server-side; do not persist microphone audio or show transcripts.
- Remove all legacy browser diary import/recovery code and maintain a clean fresh data store.
- No invented Nandini details or fabricated birthdays/preferences. Approved personalization can be added later.
- Do not force push, merge without request, modify the source repo or bypass RLS/auth.
- Verify CI and live service distinctly, and record outcomes accurately.
