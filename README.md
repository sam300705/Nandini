# Hey Nandini ♡

A personal, invite-only app using the same React/TanStack Start UI architecture as the Ishika app. This is an **independent GitHub repository, Vercel deployment, and Supabase backend**. Do not share the old project's services.

## Features
Home, private Gallery (images/video/resumable uploads), personal Diary, **Sambhav & Nandini — Us Diary**, Just For You memory reader, installable mobile app and Sarvam-only 3D teddy voice companion.

**No personal content is preloaded.** Ishika's photos, handwritten pages, diary entries, voice memory, account, and preferences have not been copied. Its browser legacy diary import is excluded.

## Required separate setup
1. Create a fresh Supabase project in the chosen organization, never in the source project's existing database.
2. Apply `supabase/migrations/20261008163000_nandini_private_baseline.sql` **only** to this new project and provision its own Supabase Auth account.
3. Configure `.env.example` with the new Supabase project's browser-safe publishable key. Never use a service-role key in a browser environment variable.
4. Deploy `supabase/functions/sarvam-companion/` to the new project with JWT verification enabled; set `SARVAM_API_KEY` in server-only secrets, and `APP_ALLOWED_ORIGIN` to the deployed app's hostname.
5. Upload approved private Just For You pages and photographs to Nandini's **new** buckets. Gallery and diary start empty.
6. When confirmed, provide her birthday via `VITE_NANDINI_BIRTHDAY=MM-DD`. Without that date the homepage shows a neutral placeholder.

## Development
```sh
npm ci
npm run lint
npm run test
npm run build
```

## Engineering handoff
- Source code baseline: `sam300705/ishika-new` main commit `d11903dece701652031a09f6e4c87f6301eae6ee`.
- Source repository stays unchanged. No source private data is migrated.
- Pending: new Supabase provisioning/cost confirmation, RLS & Auth verification, Sarvam secret, independent Vercel deployment verification, supplied photos and personal details.
- Do not claim real voice end-to-end performance from a build test.
