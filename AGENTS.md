# Nandini — Friends Edition guidelines

- A **platonic friendship surprise** from Sambhav to Nandini. Avoid romantic language, hearts, flirting, couples/dating assumptions, or love-letter framing.
- Three tabs only: **Home, Diary, Friendship Diary**. Gallery and its upload UI are removed; never resurrect it without a new user request.
- Friendship Diary keeps Nandini and Sambhav as separate author labels, private per-user RLS data. Do not merge authors or present the diary as a couples journal.
- Design: cheerful sky-blue, mint, indigo and lavender. Existing CSS `glass-pink` and `gradient-pink` utility names are compatibility aliases for the *new* friendship palette.
- Home has generic friendship notes and a high-five action; never invent Nandini's actual preferences or personal information.
- Friendship Notes is a private page-turn reader, not a gallery; contents must come from approved user uploads to the new `home-private` bucket.
- Source architecture remains TanStack Start, React, Supabase, Three.js and Sarvam-only voice. Keep keys server-side and conversations under owner-scoped RLS.
- NEVER copy data or credentials from Ishika. Nandini's independent Supabase project is `mkmejcplhumumfxvlesa`. Keep account and memories separate.
- Missing auth config keeps private pages locked. Gallery backend artifacts may remain unused; never drop customer data as part of visual design changes.
- Keep the PWA install option; provide a plain friend-to-friend experience without implied relationships.
- Test routes, Auth, PWA, content tone and full voice compatibility. Do not claim live verification from a successful build.
