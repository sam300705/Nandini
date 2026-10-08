# Nandini implementation handoff — October 8, 2026

Based on source Ishika repo `main` commit `d11903dece701652031a09f6e4c87f6301eae6ee`. Separate Nandini repo reuses UI architecture (not user data).

- Branding: Nandini, including PWA and SEO.
- Keep: 3D teddy, Sarvam-only conversation STT/LLM/TTS, gallery videos, diary drafts, private memory book, PWA install.
- Keep Sambhav as author in separate Sambhav & Nandini Us Diary.
- Remove: source images/photos, old handwritten pages, personal details, source config/credentials, legacy Ishika local diary recovery, old backend origin.
- Planned backend: separate Supabase Auth, storage buckets, tables, strict RLS and new Sarvam Edge Function. Never use original Supabase for this app.
- Verification: CI lint/test/build on latest commit, schema and RLS tests on the new project, Sarvam authenticated turn and device microphone end-to-end test.
- Blockers: new Supabase project organization/cost confirmation and server secrets; Nandini-specific photos/creative brief not received.
