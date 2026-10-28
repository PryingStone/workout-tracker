# Verification record

Verified in the Linux cloud workspace on 2026-10-28 with Node 24.19, npm 11.9, MongoDB 8 in Docker, and system Chromium.

| Check                                                 | Result                                                                                                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| API and mobile TypeScript checks                      | Passed                                                                                                                                               |
| Express TypeScript production build                   | Passed                                                                                                                                               |
| Expo web production export                            | Passed                                                                                                                                               |
| Expo iOS and Android JavaScript/Hermes bundle exports | Passed; this is not native compilation                                                                                                               |
| API integration tests                                 | 10 passed, 0 failed, 0 skipped, against real MongoDB in a unique temporary database                                                                  |
| Chromium user journey                                 | 1 passed; registration, measurements, exercise/workout editing, schedules, goals, reminders, charts, deletion, logout/login and phone-width check-in |
| Visual inspection                                     | Desktop and 390px-wide dashboard screenshots inspected                                                                                               |
| Development startup                                   | API health returned `{"status":"ok"}`; Expo served application HTML                                                                                  |
| Local configuration repeatability                     | `npm run setup` completed twice, preserving existing files                                                                                           |
| Expo SDK dependency compatibility                     | Local SDK dependency check passed in offline mode; online Expo metadata access was unavailable, so no claim of online validation                     |
| Physical-device notifications                         | Not tested; native device/build required                                                                                                             |
| Native iOS / Android compilation                      | Not tested; JavaScript exports only                                                                                                                  |
| Fitbit / HealthKit sync                               | Not configured or tested; status explains requirements and sync returns 501                                                                          |
| Cloud / app-store deployment                          | Not performed                                                                                                                                        |

Browser screenshots are generated in ignored `test-results/`. Reproduce them with `npm run test:e2e` after building. Browser test records are explicitly manual presentation inputs and are removed with the isolated test database; the development database is not seeded with fabricated measurements.

Testing found and fixed weekly goals under a daily analytics period, icon-derived control names, and editing workouts containing persisted exercises. The regression flows remain in the test suites. See README.md for commands, presentation steps, and known limitations.
