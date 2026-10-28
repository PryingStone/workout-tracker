# REST API

Base path `/api`; JSON request/response bodies. Except health/register/login, every endpoint requires `Authorization: Bearer <JWT>`. Successful lists return arrays; writes return the saved object, including `_id`, owner and timestamps. Profile responses never include a password hash. Creates return 201, reads/updates 200, deletes 204.

Errors: `{ "error": { "message": "...", "details": [{ "path": "field", "message": "..." }] } }`. Details appear on validation errors. Common statuses: 400 invalid input, 401 missing/invalid/expired token, 404 absent or non-owned record, 409 duplicate email or goal, 429 rate limit, 501 unsupported integration. Express rate-limit 429 responses may be plain text. No other user's object can be addressed by sending its ID.

| Method       | Path                           | Body / behavior                                                                   |
| ------------ | ------------------------------ | --------------------------------------------------------------------------------- |
| GET          | `/health`                      | Database readiness; 503 when disconnected                                         |
| POST         | `/auth/register`               | `{name,email,password}`; returns `{token,user}`                                   |
| POST         | `/auth/login`                  | `{email,password}`; returns `{token,user}`                                        |
| GET          | `/profile`                     | Current `{_id,name,email}`                                                        |
| PATCH        | `/profile`                     | `{name}`                                                                          |
| GET          | `/records`                     | Latest 366 daily measurements                                                     |
| PUT          | `/records`                     | Upsert `{date,steps?,weightKg?,heartRateBpm?}`; at least one measurement required |
| DELETE       | `/records/:id`                 | Delete a daily measurement record                                                 |
| GET / POST   | `/workouts`                    | List / create session                                                             |
| PUT / DELETE | `/workouts/:id`                | Full editable payload / delete                                                    |
| GET / POST   | `/exercises`                   | List / create reusable exercise                                                   |
| PUT / DELETE | `/exercises/:id`               | Replace / delete reusable exercise                                                |
| GET / POST   | `/goals`                       | List / create fitness goal                                                        |
| PUT / DELETE | `/goals/:id`                   | Replace / delete goal                                                             |
| GET / POST   | `/schedules`                   | List / create workout schedule                                                    |
| PUT / DELETE | `/schedules/:id`               | Replace / delete schedule                                                         |
| GET / POST   | `/reminders`                   | List / create daily reminder                                                      |
| PUT / DELETE | `/reminders/:id`               | Replace / delete reminder                                                         |
| GET          | `/dashboard`                   | Summary, series, goals, recent sessions and schedules                             |
| GET          | `/analytics`                   | Same analytics contract as dashboard                                              |
| GET          | `/integrations`                | Available manual entry and unavailable device integration requirements            |
| POST         | `/integrations/:provider/sync` | 501 until a real provider is implemented                                          |

Resource updates use the full editable body, not a partial patch. Unknown fields are rejected, including attempts to assign `user` or calculated calories. No secrets belong in mobile configuration.

### Payloads

Workout:

```json
{
  "name": "Morning lift",
  "type": "strength",
  "date": "2026-10-28",
  "durationMinutes": 30,
  "notes": "Optional",
  "exercises": [
    {
      "name": "Squat",
      "sets": 3,
      "reps": 8,
      "weightKg": 40,
      "durationMinutes": 10
    }
  ]
}
```

Types: `strength`, `running`, `walking`, `cycling`, `yoga`, `other`. Duration is an integer 1–1440. Exercises default to `[]`, notes to `""`. Exercise duration contributes detail, while workout duration is the authoritative analytics total, preventing double counting. Calories are calculated server-side.

Exercise: `{name,sets,reps,weightKg,durationMinutes}`. Sets 1–100, reps 0–1000, weight 0–1000, duration 0–1440. Maximum 100 embedded exercises per workout. Reusable exercises are independent templates; changing a template does not rewrite workout history.

Measurement: `{"date":"2026-10-28","steps":5200,"weightKg":60,"heartRateBpm":72}`. Steps integer 0–200000; weight 20–400 kg; heart rate integer 30–240 bpm. Dates must be real calendar dates. Source is always `manual`; clients cannot label manual values as synced. Omitted values on an existing date stay unchanged.

Goal: `{"metric":"steps","period":"daily","target":8000}`. Metric `steps|duration|workouts`, period `daily|weekly`, positive integer target up to 1400000. `duration` is minutes; `workouts` counts recorded sessions. One goal per user, metric and period (unique compound index).

Schedule: `{"name":"Evening walk","scheduledAt":"2026-10-29T18:00:00+05:30","status":"scheduled"}`. Time must be ISO-8601 with timezone. Status `scheduled|completed|missed`; defaults to scheduled. Past scheduled sessions are derived as missed on reads. They remain editable; marking complete does not create a workout record.

Reminder: `{"title":"Time to move","hour":18,"minute":0,"enabled":true}`. Hour integer 0–23, minute 0–59, boolean enabled. Native scheduling is performed by the client after consent, in device local time.

Registration requires a nonempty name ≤120 chars, valid normalized email ≤254 chars, and password 10–72 characters with a maximum of 72 UTF-8 bytes (bcrypt limit). Tokens expire after seven days. Auth routes allow 30 attempts per 15 minutes per IP; other API traffic is capped at 300 requests/minute/IP. Configure proxy trust deliberately before adapting per-IP limits behind a reverse proxy.

### Analytics

`GET /analytics?date=2026-10-28&period=weekly` accepts `daily`, `weekly`, or `monthly` (1, 7 or 30 inclusive dates). `date` defaults to the server's UTC day; the mobile client explicitly sends the device's local date.

Returns `today`, `totals`, `previous` (equal preceding period), `series` (daily steps, duration, workouts, weightKg, heartRateBpm, caloriesEstimate), `goals` (actual, percent), `recentWorkouts`, `schedules`, `hasData`, and `sources`. Weight and heart rate are null when missing. Steps/duration/session count are zero on days without activity. Weekly goals always use the seven days ending on the selected date regardless of chart period. Completion is capped at 100%; the actual total remains available. There is no fabricated historical data.
