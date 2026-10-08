# Nandini — Friends Edition 🌈

A simple, cheerful friendship site from Sambhav to Nandini at **[nandini.cc.cd](https://nandini.cc.cd)**. Built using React/TanStack Start and independently deployed on Vercel.

## Password-free public experience

- **Home:** friendly greeting, memories, little notes, friendship high-five and birthday countdown when the date is configured.
- **Friendship Note:** a handwritten, three-page Dronacharya college friendship gift with highlights, swipe, keyboard arrow and button navigation. Its approved text is intentionally public and lives in `src/lib/publicFriendshipPages.ts`.
- **Mobile install:** PWA installation flow remains available.

The old password entry screen is **not rendered**. The missing login-email configuration no longer blocks public Home and Friendship Note.

## Private features are not made public

- **Diary**, **Friendship Diary**, **private MemoryBook**, and authenticated **Sarvam voice** require a verified Supabase session, and are not shown to anonymous visitors.
- Owner-scoped RLS remains enabled in Nandini's independent Supabase project, `mkmejcplhumumfxvlesa`.
- The previously staged `friendship_letter_pages` table remains private, with three unassigned rows. Its contents and private storage objects are not exposed by this change.
- Gallery remains removed. Ishika data, Supabase project, and Vercel deployment are entirely separate.

## Personal photo and talking teddy

- The user-provided photo is shown as an **upright, optimized** homepage memory at `/nandini-friendship-photo.jpg`. This one image is public because the Home page is password-free. The Gallery remains removed.
- The floating 3D teddy UI from the Ishika experience is now visible to guest visitors, but uses **Nandini's own** Sarvam-only backend, not Ishika's project, data, or credentials.
- Signed-in sessions use `sarvam-companion` and existing owner-scoped conversation memory. Public guest sessions use the independent `guest-sarvam-companion` function with a global cap of 24 turns/day, at most 4 turns/IP/day and 30-second cooldown. Quota is transactional and inaccessible to client roles.
- Guest dialogue context lasts only in browser memory during the current page session; no guest audio/transcripts are stored server-side.
- **Operational blocker:** Nandini's independent Supabase project must have its own `SARVAM_API_KEY` secret configured. If it is absent, the guest function responds HTTP 503 and the teddy shows voice unavailable instead of exposing a key or silently falling back to another provider.
- The public guest endpoint sets `verify_jwt=false` intentionally; it implements its own origin and backend quota checks. Do not disable its quota checks or share Ishika secrets.

## Development and verification

```sh
npm ci
npm run test
npm run build
npm run lint
```

## Engineering handoff

- Branch: `feature/private-friendship-notes`, PR #2 remains unmerged until specifically approved.
- Guest-mode change: remove forced password screen, show public Home and note, and hide rather than bypass authentication for private functions.
- CI must be checked on the final commit before production deployment. Vercel production success does not by itself test every browser or backend flow.
- Remaining: provisioning a legitimate Auth account is necessary only if the private diary/voice features are to be activated later. Never substitute an anonymous or shared account for secure authorization.
