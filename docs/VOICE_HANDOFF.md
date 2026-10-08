# Nandini friendship-app handoff — 2026-10-08

This is a **platonic friendship experience**, not a romantic adaptation. Source UI reused from Ishika, but data, Auth, URLs, project credentials and conversation history remain fully isolated.

## Current UI
- Home, Diary, **Friendship Diary** (authors Nandini and Sambhav).
- Gallery and gallery upload UI removed; historic database schema still exists for reproducibility.
- Cheerful sky-blue/mint theme, new star PWA icon, generic friendship notes and Friendship Notes private page reader.
- 3D teddy with no romantic language or assumptions.

## Service isolation and next verification
- Supabase project `mkmejcplhumumfxvlesa`, Mumbai. Five private RLS tables and `home-private` private storage bucket.
- Sarvam-only function `sarvam-companion` deployed independently; requires server-side Sarvam key for actual voice.
- Vercel project `nandini` configured with dedicated Nandini env vars. Domain `nandini.cc.cd` attached; DNS still requires independent validation.
- Nandini Auth account not provisioned at initial setup. Do not imply an authenticated voice loop works before live device testing.
- CI lint baseline may contain existing issues; check individual test/build conclusions and address failures.
