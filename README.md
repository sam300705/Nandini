# Nandini — Friends Edition 🌈

A personal, invite-only **friendship gift from Sambhav**. Built as an independent React/TanStack Start app with its own Supabase project and Vercel deployment.

## App experience

- **Home:** cheerful notes, friendship thoughts and a high-five button
- **Diary:** Nandini's private journal
- **Friendship Diary:** separate memories labeled *Nandini* or *Sambhav*, without romantic assumptions
- **Friendship Notes:** private three-page page-turn reader (empty until the new account has approved pages)
- **Teddy:** a friendly Sarvam-only voice companion, with an independent backend and 3D gestures
- **Install app:** private mobile PWA with a sky-blue and mint friendship theme

**Gallery is removed from the application.** No photo/video gallery UI or upload flow is exposed. An unused storage table and bucket may still exist in the isolated Supabase project; do not delete data without confirmation. Historical migration files are retained for reproducibility.

## Strict separation from Ishika

Nandini uses **Supabase `mkmejcplhumumfxvlesa`** (Mumbai) and the separate Vercel project `nandini`. Ishika's credentials, photos, diaries, conversations, account, and original handwritten pages have **not** been copied. Never point these apps at the same backend.

## Remaining steps

1. A designated Nandini Supabase Auth account must be created; configure `VITE_NANDINI_LOGIN_EMAIL` in Vercel (don't commit the actual password).
2. Configure `SARVAM_API_KEY` as a *server-only* secret on Nandini Supabase. Never reuse or expose the other project's secrets.
3. If desired, upload three **consented** friendship notes under the new account's UUID in the private `home-private` bucket.
4. Domain: `nandini.cc.cd` has been assigned in Vercel; DNS activation depends on DNShE.
5. Optionally configure a **confirmed** birthday as `VITE_NANDINI_BIRTHDAY=MM-DD`.
6. Verify end-to-end authentication, storage policies, authenticated voice, and actual mobile microphone playback before sharing the finished app.

## Local development

```sh
npm ci
npm run lint
npm run test
npm run build
```

The independent repo and all changes are maintained at [sam300705/Nandini](https://github.com/sam300705/Nandini).

## New friendship notebook

The Home card opens a three-page handwritten **friendship note** with swipe, keyboard and button navigation in sky, mint and lavender. It does not alter the existing three navigation tabs or resurrect the gallery.

The note is kept outside the public source: `public.friendship_letter_pages` in **Nandini's own Supabase project** has owner-scoped SELECT RLS with no client write policy. Its three approved pages were staged privately with `owner_id = NULL`; unassigned and anonymous viewers see nothing.

**To activate:** create and verify the intended account in Nandini Supabase Auth, then assign its verified UUID to the three staged rows using trusted administrative access. Never assign the content to an unrelated account, move it into frontend environment variables, or relax RLS.

**Verification:** run `npm ci`, `npm run lint`, `npm run test`, `npm run build`; separately verify an authenticated browser session after ownership assignment and deployment. A green CI build does not establish a working live sign-in flow.
