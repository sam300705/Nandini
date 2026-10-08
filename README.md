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
