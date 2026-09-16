# TODO

Full plan: `.claude/plans/pure-scribbling-twilight.md` (guard panic-alarm feature).

## Blocked on user input

- [ ] **iOS push credentials** — provide Apple Team ID, Key ID, and the `.p8` VoIP
      auth key so the backend (`web/lib/sos.ts`) can sign APNs requests and deliver
      VoIP pushes to guards on iOS. Nothing more to build on iOS delivery until this
      lands.

## Needs physical devices (can't verify in Expo Go / simulator)

- [ ] **Android real alarm**: add `notifee`, wire a `bypassDnd`/`importance: MAX`
      channel with `fullScreenAction` so the alarm screen launches even from a
      locked/killed app state. Test on a physical Android device.
- [ ] **iOS real alarm**: add `react-native-voip-push-notification` (PKPushRegistry)
      + `react-native-callkeep` (CallKit incoming-call UI) so the guard app rings
      through silent mode on a locked iPhone. Test on a physical iPhone — the
      simulator can't register for VoIP pushes at all.
- [ ] Backend: sign+send the iOS VoIP push via direct APNs call (Web Crypto ES256
      JWT) once the `.p8`/Team ID/Key ID above are available.

## Future feature ideas (tracked, not started)

Real online maintenance payment (payment gateway — Razorpay/PayU/etc., money
actually flows through the platform) — **deferred**: needs legal/compliance
work first (payment aggregator agreement, KYC, RBI guidelines) before any
build starts. Note: this is distinct from the UPI-QR-plus-screenshot-approval
flow already shipped (`/dues`, `/admin/maintenance`) — that one never touches
or holds funds, so it didn't need this.

- [x] ~~Real push notifications (installed PWA / native)~~ — shipped: Web
      Push (VAPID, `web/lib/push.ts`), toggle in the account dropdown, wired
      into every `notifySociety()` call (notices, complaint/bill status,
      etc.). iOS Safari only fires for an installed (Home Screen) PWA —
      no onboarding nudge for that yet, worth adding if iPhone adoption is low.
- [ ] QR/OTP visitor gate check-in — ties the visitor log to the guard app
      instead of being a manually-updated list.
- [ ] Amenity/parking slot booking.
- [ ] AGM polls / voting for society governance decisions.
- [ ] Document vault — bylaws, AGM minutes, agreements, shared per society.
- [ ] Ledger/dues export (PDF/CSV) for office bearers' own records/AGM use.

## Smaller follow-ups

- [ ] `guardapp/`: wire EAS build profiles (staging vs prod `EXPO_PUBLIC_API_BASE_URL`)
      once EAS is set up — see `guardapp/AGENTS.md`.
- [ ] Decide whether to push `staging` to origin and open the `staging` → `main` PR
      for everything committed this session (maintenance dues, monorepo move, guard/
      SOS flow, guardapp scaffold).
