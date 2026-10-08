# Nandini — Friends Edition guidelines

- This is a **platonic friendship surprise** from Sambhav to Nandini. Avoid romantic framing, flirting, couples, or dating assumptions.
- **No password gate on the public website.** Guest visits must immediately show Home and the three-page friendship note. Never reintroduce LockScreen as the app entrypoint.
- The public friendship note in `src/lib/publicFriendshipPages.ts` is an intentionally published gift; it is not a Supabase private diary, and only this specifically approved copy may be public.
- **Keep diary records, personal/private handwritten uploads, Auth sessions, and voice conversation data private.** Show Diary, Friendship Diary, private MemoryBook, and authenticated voice only to verified Supabase Auth sessions. Do not introduce anonymous RLS policies or store secrets in the client.
- Existing navigation for a verified session is Home, Diary, Friendship Diary. Guest navigation is Home and Friendship Note. Do not restore Gallery without a new request.
- Friendship Diary keeps Nandini and Sambhav as separate author labels, with owner-scoped RLS.
- Design: cheerful sky-blue, mint, indigo and lavender. The existing `glass-pink` and `gradient-pink` class names are only compatibility aliases for the friendship colors.
- Source architecture remains TanStack Start, React, Supabase, Three.js and Sarvam-only voice. Keep voice API keys server-side.
- Never copy data or credentials from Ishika. Nandini uses independent Supabase project `mkmejcplhumumfxvlesa`, separate GitHub repo and Vercel project.
- Gallery backend artifacts may remain unused. Never delete data or relax privacy policies to fix missing-login errors.
- Keep mobile PWA installation functional. Add regression tests for guest and authenticated states and verify CI and production separately.
- No merge, force push or history rewrite without explicit authorization.
