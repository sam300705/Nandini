# Nandini — Friends Edition guidelines

- This is a **platonic friendship surprise** from Sambhav to Nandini. Avoid romantic framing, flirting, couples, or dating assumptions.
- **No password gate on the public website.** Guest visits must immediately show Home and the three-page friendship note. Never reintroduce LockScreen as the app entrypoint.
- The public friendship note in `src/lib/publicFriendshipPages.ts` and the one user-supplied homepage photo `public/nandini-friendship-photo.jpg` are intentionally public. Never expose anything from private gallery/storage or another project.
- **Keep diary records, personal/private handwritten uploads, Auth sessions, and signed-in voice memory private.** Diary, Friendship Diary, private MemoryBook and authenticated voice require verified Supabase Auth. The separate public guest teddy endpoint does not store conversations/audio and must never access the private voice history table. Do not introduce anonymous RLS policies or store provider keys in the client.
- Existing navigation for a verified session is Home, Diary, Friendship Diary. Guest navigation is Home and Friendship Note. Do not restore Gallery without a new request.
- Friendship Diary keeps Nandini and Sambhav as separate author labels, with owner-scoped RLS.
- Design: cheerful sky-blue, mint, indigo and lavender. The existing `glass-pink` and `gradient-pink` class names are only compatibility aliases for the friendship colors.
- Source architecture remains TanStack Start, React, Supabase, Three.js and Sarvam-only voice. Keep API keys server-side. Public guest voice must use only the separate `guest-sarvam-companion` Edge Function with strict per-IP/global atomic quotas, same-origin CORS restrictions, bounded audio/history, and no persisted guest content. If Nandini Sarvam credentials are missing, fail closed and show an unavailable state. Never copy Ishika's Sarvam key.
- Never copy data or credentials from Ishika. Nandini uses independent Supabase project `mkmejcplhumumfxvlesa`, separate GitHub repo and Vercel project.
- Gallery backend artifacts may remain unused. Never delete data or relax privacy policies to fix missing-login errors.
- Keep mobile PWA installation functional. Add regression tests for guest and authenticated states and verify CI and production separately.
- No merge, force push or history rewrite without explicit authorization.
