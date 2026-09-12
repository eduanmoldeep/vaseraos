# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Super Admin** — platform-level. Approves and maintains the platform, creates/manages societies, and grants society-level access (resident, guard, office bearer) to users.
- **Office Bearer** (president, secretary, treasurer) — society committee roles. Assign resident/guard roles within their own society; run society-level admin (residents, maintenance, ledger, complaints, visitors, notices).
- **Resident** — default member of a society. Pays dues, raises complaints/help tickets, triggers SOS/panic alarm.
- **Guard** — security staff of a society, using the separate native `guardapp`. Receives SOS/panic alarms and responds.

Role assignment is restricted: only office bearers or super admins can assign roles.

## Product Purpose

VaseraOS is a housing-society management system: residents, maintenance dues, complaints, visitors, notices, society ledger/expenses, plus a guard-facing SOS/panic-alarm pipeline. It exists to run day-to-day society operations and to get a resident's panic signal to an on-duty guard as fast as possible.

## Positioning

Distinct mechanism vs. RWA/society-management competitors (MyGate, ADDA, NoBrokerHood-style apps): the guard-alarm/SOS response pipeline — a resident panic button that reaches a guard's phone as a real, hard-to-miss alarm (device-level alarm via VoIP/CallKit on iOS, bypassDnd full-screen intent on Android), not just an admin/society-management feature set. Security response speed is the product's edge, not the admin tooling.

## Operating Context

- Monorepo: `web/` (Next.js on Cloudflare Workers — admin portal, resident portal, and API) and `guardapp/` (Expo/React Native guard app, separate deployable, talks to `web/`'s API over HTTP only — never touches D1/KV/R2 directly).
- Data: Cloudflare D1 (`DB`), R2 (uploads), KV — staging and prod resources kept strictly separate (see `web/AGENTS.md`).
- Guard alarm delivery depends on physical-device behavior (Android bypassDnd/full-screen-intent, iOS VoIP push + CallKit) that cannot be verified in a simulator/emulator.
- Auth includes Google login.

## Capabilities and Constraints

- Society management: residents, maintenance settings/dues, society ledger/expenses, complaints (incl. flat-locked complaints), visitors, notices, audit log, help tickets, notifications.
- Guard/SOS: panic-button flow from resident to guard; guard app home/alarm screens.
- iOS alarm delivery is blocked pending Apple Team ID, Key ID, and `.p8` VoIP auth key (tracked in `TODO.md`) — backend cannot sign APNs requests without these.
- Android/iOS real-alarm behavior (notifee bypassDnd channel; VoIP push + CallKit) is unbuilt/unverified on physical hardware as of this writing (see `TODO.md`).
- `guardapp` EAS build profiles (staging vs. prod `EXPO_PUBLIC_API_BASE_URL`) not yet wired.

## Brand Commitments

Name: **VaseraOS** ("Society Management"). Existing manifest/theme colors: background `#0b2e2a`, theme `#0d7a70` (web app shell uses `#4f46e5` viewport theme color — not yet reconciled).

## Evidence on Hand

No real customer testimonials, case studies, press, or usage data on hand. Do not fabricate any.

## Product Principles

1. Security response (SOS/alarm delivery speed and reliability) outranks admin-feature breadth when the two compete.
2. Role and data boundaries are strict: guardapp never touches platform storage directly; staging and prod resources never cross; role assignment is restricted to office bearers/super admins.
3. Don't claim device-level alarm behavior (bypassDnd, VoIP/CallKit) works until verified on real hardware — simulators cannot prove it.
4. Preserve existing society-management functionality (maintenance, ledger, complaints, visitors, notices) as durable product surface, not legacy to trim.
