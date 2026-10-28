# Device and health integration boundaries

The working default is manual entry. The app does not silently request health permissions or pretend that it knows a user's heart rate or step count. Provider capabilities come from the authenticated `/api/integrations` route; unsupported sync calls fail explicitly with 501.

## Notifications

`apps/mobile/src/notifications.ts` is the native local-notification adapter. Profile → Enable device notifications prompts for permission; denial produces an actionable message. Android creates a workout channel. Enabled reminders repeat daily at the configured device-local time. Future scheduled sessions create one-off notifications. Managed IDs are retained in AsyncStorage so edits refresh only this app's managed notifications. Sign-out cancels them. Tokens use SecureStore and never AsyncStorage.

Use a compatible iOS/Android development build with `expo-notifications` configured by `app.json`. Local notification support varies by Expo Go version and platform; remote push notifications on Android require a development build, and this project does not implement remote push. Test permission allowed/denied, app foreground/background, daily repetition, schedule edits/deletion, timezone changes, and sign-out on a real device. No hardware notification test has been performed in the cloud environment. Web uses an explicit unsupported message, not a fake permission or delivery result.

Goals produce a foreground celebration once per account/device/day if a goal is complete and notifications were allowed. There is no background goal evaluation.

## Fitbit extension point

A complete future adapter needs a Fitbit developer application and approved scopes, a public HTTPS callback URL, user consent through OAuth, anti-CSRF state/PKCE as appropriate for the selected flow, server-side token exchange, encrypted refresh/access-token storage, token refresh/revocation, rate-limit and retry behavior, and duplicate-safe imports. Define least-privilege scopes for activity, heart rate and weight; request only the data actually displayed.

Keep a client secret on the backend in secure deployment settings. No credential is needed by this project's existing manual workflow, and no secret is bundled in Expo. After implementing the adapter, extend record source validation and provider IDs/indexes deliberately; today's schema accepts `manual` only. Never set the provider capability to available until OAuth, permissions and sync are implemented and tested. `/integrations/:provider/sync` is the explicit backend boundary to replace.

## Apple HealthKit extension point

HealthKit requires supported Apple hardware, iOS entitlements/capabilities, usage descriptions, per-type user consent, and a native health library compiled into an Expo development/release build. It cannot be enabled by adding an API key, is unavailable on Android/web, and does not work as a generic web integration. Expo Go does not contain an arbitrary HealthKit native module.

Implement a platform-specific adapter with availability/authorization checks, least-privilege reads for steps/heart rate/body mass, date/timezone normalization, source metadata and deduplication. User denial and no-data responses must remain empty states. Send authenticated normalized imports through a dedicated validated backend route. No HealthKit code or entitlement is currently enabled, and no permissions or sensor support are claimed.

## Privacy and production work

Health records are private to the authenticated account. Production deployment additionally needs retention/deletion controls, explicit consent policies, backups, encryption and access controls for hosted storage, auditability, revocable sessions, and a review against applicable health-data rules. Never use this project's calorie estimates as medical measurements.
