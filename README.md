# Pulse · Workout Tracker

A real fitness journal built with Expo / React Native / TypeScript, Express, and MongoDB. The same interface runs on iOS, Android and web. Dark forest cards, lime accents, accessible controls, responsive navigation, and interactive SVG charts keep the experience consistent across screen sizes.

## Architecture

- `apps/mobile`: Expo SDK 54, React Native 0.81, React 19. Bottom tabs on phones, sidebar on wide screens. `react-native-svg` supplies interactive charts and progress rings.
- `apps/api`: Express 5 with Zod validation, Mongoose models/indexes, bcrypt password hashing, seven-day signed JWTs, Helmet, request size limits and rate limiting.
- `compose.yaml`: MongoDB 8 with a retained local data volume, bound only to loopback.
- `tests`: real Chromium workflow against the compiled web app and an isolated MongoDB database.
- `docs/API.md`: endpoint and payload reference. `docs/INTEGRATIONS.md`: device permissions and integration boundaries.

All data queries include the authenticated owner. Dates for daily measurements are calendar dates chosen by the user; schedules are stored as UTC instants and displayed in device local time. Weekly views use rolling seven-day windows, monthly views rolling thirty-day windows, rather than calendar months.

## Local setup

Requirements: Node.js 22 or newer, npm, Docker Compose (or MongoDB 8 locally). Python 3 is needed only by the browser test static server.

```sh
npm ci
npm run setup
docker compose up -d mongo
```

`npm run setup` creates ignored local `.env` files and a random JWT secret, preserving any existing files. Templates are included in both apps. For an existing MongoDB server, set `MONGODB_URI` in `apps/api/.env` instead of starting Docker. No cloud credentials are required for manual tracking.

In separate terminals, from the repository root:

```sh
npm run dev:api
```

```sh
npm run web
# or: npm run dev:mobile
```

Open the address printed by Expo. For iOS/Android, use a supported Expo Go version for SDK 54 or create a development build. SDK 54 may no longer be the version offered by the latest store Expo Go; use a compatible client/development build. See integration notes for notification limitations.

For a physical phone, set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your computer's LAN address, e.g. `http://192.168.1.10:4000/api`. Android emulator uses `http://10.0.2.2:4000/api`; iOS simulator and browser can use localhost. Restart Expo after changing this variable. Your computer and device must be on the same reachable network. CORS origins apply to web; add the actual web origin in `CORS_ORIGINS`. Use HTTPS for deployments.

In a restricted cloud environment, use `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npm run web` after dependencies are installed. This avoids Expo account/update checks; it does not bypass network policy. Do not create extra Git worktrees for cloud setup: tasks already have isolated checkouts.

## What works

- Register, log in, edit your name, sign out. Native JWTs use SecureStore; web tokens stay in memory and page reload requires another sign-in.
- Daily manual steps, weight and measured heart rate. An upsert replaces supplied fields for that date; omitted fields are preserved. Delete a daily record to remove all its measurements. No sensor readings are generated.
- Create, edit and delete completed workout sessions, with exercise names, sets, repetitions, weights and durations. Save reusable exercise templates and add them to workouts.
- Plan future sessions; edit or delete them; mark them completed. Past uncompleted sessions display as missed. Completion status and the detailed workout journal are separate: log the session to include its activity in analytics.
- Daily and weekly steps, active minutes and session-count goals; capped completion percentages and progress bars.
- Dashboard, daily/weekly/monthly charts for steps, duration, weight and workout frequency. Tap a day to inspect values. Period totals compare with the preceding equal-length period. Missing weight readings remain gaps.
- Daily reminders, one-off scheduled workout alerts and a goal celebration when the foreground app sees a completed goal. Explicit permission handling on native devices; web explains that local notifications are unavailable.
- Integration status and explicit unsupported sync responses, without claiming Fitbit or HealthKit is connected.

Calories are estimates using MET × 3.5 × weight kg / 200 × duration minutes, rounded to whole kcal. MET assumptions are strength 5, running 8, walking 3.5, cycling 6, yoga 2.5, other 4. The latest weight on or before the workout is used, or a clearly disclosed 70 kg default. Editing a workout recalculates its estimate; entering a new weight does not rewrite historical estimates. These values are not medical advice.

## Verification

Keep MongoDB running. Tests create unique `pulse_test_*` and `pulse_e2e_*` databases and drop only those databases; they do not seed or erase the development database.

```sh
npm run typecheck
EXPO_NO_TELEMETRY=1 npm run build
npm test
# Stop any API/web processes occupying 4000 or 8081 before browser tests.
npx playwright install chromium   # unnecessary if /usr/bin/chromium exists
CI=1 npm run test:e2e
```

The browser suite uses the exported bundle in `apps/mobile/dist`, so rebuild after frontend changes. If using a remote database for tests, set `TEST_MONGODB_URI` to a MongoDB server on which your test user may create and drop isolated databases. Browser tests expect the bundle's API URL to be `http://localhost:4000/api`.

API tests exercise hashing, login, authentication failures, cross-user access denial, validation, all resource CRUD routes, measurement upserts, estimates, period comparisons, goal calculations and integration status. Browser tests exercise registration/login, a check-in, workout/exercise editing, scheduling, goals, reminders, chart interaction, deletion, and phone-width navigation. Native notifications and hardware integrations require real-device validation and are not verified by Chromium.

## Presentation walkthrough

1. Register a fresh account and show the honest empty dashboard.
2. In Profile, add a daily step goal of 5,000 and a weekly active-minute goal of 150.
3. Check in with 5,200 steps, a weight and a heart rate from an actual measurement (or explain that presentation inputs are manually entered examples).
4. Log a strength workout, add a squat with sets/reps/weight, edit its duration, and point out the labeled calorie estimate.
5. Plan tomorrow's workout and create a daily reminder. On a native device, enable notification permission; on web, demonstrate the clear unsupported message.
6. Open Progress; switch period and chart measure, tap a date, and show goal completion. Enter prior dates to demonstrate comparisons.
7. Sign out and log in again to show persistence. Use a second account to show private records are isolated.
8. Explain Fitbit and HealthKit requirements and the manual fallback without presenting an unconfigured integration as working.

## Deployment

Build the API with `npm run build -w @pulse/api`; run `npm start -w @pulse/api` from a host configured with `MONGODB_URI`, a strong `JWT_SECRET`, `PORT`, and comma-separated `CORS_ORIGINS`. The start command runs in `apps/api`, so a local `.env` there is supported, while hosted deployments should inject environment variables. Put it behind HTTPS, use an authenticated MongoDB deployment and persistent storage/backups, and restrict network access to the database. `/api/health` returns 200 only when connected. Do not expose the unauthenticated local Docker database to the Internet.

Set the public API URL before building the web app with `npm run build -w @pulse/mobile`, then deploy `apps/mobile/dist` to a static HTTPS host. The public URL is configuration, never a secret. For native release builds, use Expo development/release build tooling and your Apple/Google developer accounts; configure notification permissions and test on devices. No store deployment or cloud deployment has been performed.

## Known limitations

This is a college-project implementation, not a medical device or a production health platform. Fitbit/HealthKit adapters are documented extension points, not implemented OAuth/sensor synchronization. There is no background sync, automatic step counting, password reset, email verification, refresh-token/revocation system, account deletion, wearable connection, offline mutation queue or production audit log. JWT sign-out clears the local token but cannot revoke a copied token before expiry. Lists have bounded results (500 per resource, 366 daily measurements); add cursor pagination for larger histories. The schedule is a chronological agenda, not a month-grid calendar.

Local notification synchronization happens when the app opens/refreshes or after changes; edits made on another device do not cancel already scheduled notifications until that device refreshes. Up to 40 upcoming sessions are scheduled alongside daily reminders; OS limits can prevent additional notifications. Permission denial is handled, but delivery depends on device settings, OS policies and a compatible native build. Goals are checked in the foreground, once per account/device/day. Physical-device notification delivery and iOS/Android native compilation remain unverified in this Linux environment.
