# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Workflow (must follow)

This is the guard-facing native app — a separate deployable from `web/` (see the root
`CLAUDE.md`). It talks to the `web/` API over HTTP; it never touches D1/KV/R2 directly.

1. **Local first**: `npx tsc --noEmit` clean, then run in Expo Go (`npx expo start`) for
   any pure-JS/UI change. A change touching a native module (notifee, CallKit/VoIP,
   anything needing a config plugin) cannot be verified in Expo Go — it needs a dev
   build (`npx expo prebuild` + a real device), called out explicitly when that's the
   case.
2. **Staging vs prod = EAS build profiles**, not branches of this folder — set
   `EXPO_PUBLIC_API_BASE_URL` per profile in `eas.json` once EAS is configured
   (staging → `vaseraos-staging` worker URL, production → the `vaseraos` worker URL).
   Never point a production build profile at the staging API or vice versa.
3. **Physical devices only for alarm behavior**: bypassDnd/full-screen-intent (Android)
   and VoIP/CallKit (iOS) cannot be trusted from a simulator/emulator — the iOS
   simulator can't register for VoIP pushes at all. Verify those on real hardware
   before calling them done.
4. **Never submit to the App Store / Play Store, and never run an EAS production build
   or submit command, without the user's explicit go-ahead** — those are irreversible/
   user-facing releases, same spirit as `web/AGENTS.md`'s "no direct push to main."
