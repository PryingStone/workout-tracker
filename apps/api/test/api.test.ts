import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { User } from '../src/models.js';
const app = createApp('test-only-secret-with-more-than-32-characters');
const client = request(app);
const db = 'pulse_test_' + randomUUID().replaceAll('-', '');
let token: string, other: string;
const auth = (t = token) => ({ Authorization: `Bearer ${t}` });
const workout = {
  name: 'Morning lift',
  type: 'strength',
  date: '2026-10-28',
  durationMinutes: 30,
  notes: 'Good session',
  exercises: [
    { name: 'Squat', sets: 3, reps: 8, weightKg: 40, durationMinutes: 10 },
  ],
};
before(async () => {
  await mongoose.connect(
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017',
    { dbName: db, serverSelectionTimeoutMS: 10000 },
  );
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  const a = await client
    .post('/api/auth/register')
    .send({
      name: 'Asha',
      email: 'asha@example.com',
      password: 'correct-horse-123',
    })
    .expect(201);
  token = a.body.token;
  const b = await client
    .post('/api/auth/register')
    .send({
      name: 'Robin',
      email: 'robin@example.com',
      password: 'correct-horse-456',
    })
    .expect(201);
  other = b.body.token;
});
after(async () => {
  if (mongoose.connection.db) {
    assert.equal(mongoose.connection.db.databaseName, db);
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});
test('health and authentication: hashing, login, expiry signature, duplicates', async () => {
  await client.get('/api/health').expect(200);
  const stored = await User.findOne({ email: 'asha@example.com' }).select(
    '+passwordHash',
  );
  assert.ok(stored?.passwordHash.startsWith('$2'));
  assert.notEqual(stored?.passwordHash, 'correct-horse-123');
  const login = await client
    .post('/api/auth/login')
    .send({ email: 'ASHA@example.com', password: 'correct-horse-123' })
    .expect(200);
  assert.ok(login.body.token);
  assert.equal(login.body.user.passwordHash, undefined);
  await client
    .post('/api/auth/login')
    .send({ email: 'asha@example.com', password: 'wrong-password' })
    .expect(401);
  await client
    .post('/api/auth/register')
    .send({
      name: 'Asha',
      email: 'asha@example.com',
      password: 'correct-horse-123',
    })
    .expect(409);
  await client.get('/api/workouts').expect(401);
  await client.get('/api/workouts').set(auth('bad-token')).expect(401);
  const user = await User.findOne({ email: 'asha@example.com' });
  const expired = jwt.sign(
    {},
    'test-only-secret-with-more-than-32-characters',
    {
      subject: String(user!._id),
      issuer: 'pulse-api',
      audience: 'pulse-app',
      expiresIn: -1,
    },
  );
  await client.get('/api/workouts').set(auth(expired)).expect(401);
});
test('empty dashboard contains no fabricated health data', async () => {
  const { body } = await client
    .get('/api/dashboard?date=2026-10-28')
    .set(auth())
    .expect(200);
  assert.equal(body.hasData, false);
  assert.equal(body.today.heartRateBpm, null);
  assert.equal(body.today.steps, 0);
  assert.equal(body.series.length, 7);
});
test('validation rejects invalid dates, numbers, ownership injection and malformed IDs', async () => {
  for (const body of [
    { date: '2026-02-30', steps: 5 },
    { date: '2026-10-28', steps: -1 },
    { date: '2026-10-28', heartRateBpm: 500 },
    { date: '2026-10-28' },
    { date: '2026-10-28', user: 'injected', steps: 10 },
  ])
    await client.put('/api/records').set(auth()).send(body).expect(400);
  await client
    .post('/api/workouts')
    .set(auth())
    .send({ ...workout, durationMinutes: 0 })
    .expect(400);
  await client.delete('/api/workouts/bad').set(auth()).expect(400);
  await client.get('/api/analytics?period=annual').set(auth()).expect(400);
});
test('profile can be edited without exposing credentials', async () => {
  const { body } = await client
    .patch('/api/profile')
    .set(auth())
    .send({ name: 'Asha Patel' })
    .expect(200);
  assert.equal(body.name, 'Asha Patel');
  assert.equal(body.passwordHash, undefined);
  const b = await client.get('/api/profile').set(auth(other));
  assert.equal(b.body.name, 'Robin');
});
test('daily measurements upsert rather than double count and preserve omitted fields', async () => {
  await client
    .put('/api/records')
    .set(auth())
    .send({ date: '2026-10-28', steps: 4000, weightKg: 60, heartRateBpm: 72 })
    .expect(200);
  await client
    .put('/api/records')
    .set(auth())
    .send({ date: '2026-10-28', steps: 5200 })
    .expect(200);
  const { body } = await client.get('/api/records').set(auth());
  assert.equal(body.length, 1);
  assert.equal(body[0].steps, 5200);
  assert.equal(body[0].weightKg, 60);
  assert.equal(body[0].source, 'manual');
  assert.equal(
    (await client.get('/api/records').set(auth(other))).body.length,
    0,
  );
  await client
    .delete('/api/records/' + body[0]._id)
    .set(auth(other))
    .expect(404);
});
test('workout CRUD, exercise persistence, calorie estimate and cross-user isolation', async () => {
  const { body } = await client
    .post('/api/workouts')
    .set(auth())
    .send(workout)
    .expect(201);
  assert.equal(body.caloriesEstimate, 158);
  assert.equal(body.exercises[0].sets, 3);
  await client
    .put('/api/workouts/' + body._id)
    .set(auth(other))
    .send(workout)
    .expect(404);
  await client
    .delete('/api/workouts/' + body._id)
    .set(auth(other))
    .expect(404);
  assert.equal(
    (await client.get('/api/workouts').set(auth(other))).body.length,
    0,
  );
  const updated = await client
    .put('/api/workouts/' + body._id)
    .set(auth())
    .send({ ...workout, durationMinutes: 40 });
  assert.equal(updated.body.durationMinutes, 40);
  await client
    .delete('/api/workouts/' + body._id)
    .set(auth())
    .expect(204);
  assert.equal((await client.get('/api/workouts').set(auth())).body.length, 0);
});
test('all remaining resource CRUD endpoints enforce ownership and validate updates', async () => {
  const cases: any[] = [
    ['exercises', workout.exercises[0], { ...workout.exercises[0], reps: 12 }],
    [
      'goals',
      { metric: 'steps', period: 'daily', target: 8000 },
      { metric: 'steps', period: 'daily', target: 9000 },
    ],
    [
      'schedules',
      {
        name: 'Evening walk',
        scheduledAt: '2026-11-30T18:00:00Z',
        status: 'scheduled',
      },
      {
        name: 'Evening walk',
        scheduledAt: '2026-11-30T18:00:00Z',
        status: 'completed',
      },
    ],
    [
      'reminders',
      { title: 'Move today', hour: 18, minute: 0, enabled: true },
      { title: 'Move today', hour: 19, minute: 30, enabled: false },
    ],
  ];
  for (const [path, body, updated] of cases) {
    const result = await client
      .post('/api/' + path)
      .set(auth())
      .send(body)
      .expect(201);
    const id = result.body._id;
    assert.ok(id);
    await client
      .put(`/api/${path}/${id}`)
      .set(auth(other))
      .send(updated)
      .expect(404);
    await client.delete(`/api/${path}/${id}`).set(auth(other)).expect(404);
    assert.equal(
      (await client.get('/api/' + path).set(auth(other))).body.length,
      0,
    );
    await client
      .put(`/api/${path}/${id}`)
      .set(auth())
      .send({ bad: true })
      .expect(400);
    await client
      .put(`/api/${path}/${id}`)
      .set(auth())
      .send(updated)
      .expect(200);
    await client.delete(`/api/${path}/${id}`).set(auth()).expect(204);
  }
});
test('analytics totals, previous period, weight, weekly goals and missed schedule status', async () => {
  await client.post('/api/workouts').set(auth()).send(workout).expect(201);
  await client
    .post('/api/workouts')
    .set(auth())
    .send({ ...workout, date: '2026-10-26', durationMinutes: 15 })
    .expect(201);
  await client
    .post('/api/workouts')
    .set(auth())
    .send({ ...workout, date: '2026-10-20', durationMinutes: 10 })
    .expect(201);
  await client
    .post('/api/goals')
    .set(auth())
    .send({ metric: 'duration', period: 'weekly', target: 60 })
    .expect(201);
  await client
    .post('/api/goals')
    .set(auth())
    .send({ metric: 'steps', period: 'daily', target: 5000 })
    .expect(201);
  await client
    .post('/api/schedules')
    .set(auth())
    .send({
      name: 'Past session',
      scheduledAt: '2020-01-01T12:00:00Z',
      status: 'scheduled',
    })
    .expect(201);
  const { body } = await client
    .get('/api/analytics?date=2026-10-28&period=weekly')
    .set(auth())
    .expect(200);
  assert.equal(body.totals.duration, 45);
  assert.equal(body.previous.duration, 10);
  assert.equal(body.today.heartRateBpm, 72);
  assert.equal(body.totals.steps, 5200);
  assert.equal(body.series.at(-1).weightKg, 60);
  assert.equal(body.goals.find((g: any) => g.metric === 'steps').percent, 100);
  assert.equal(body.schedules[0].status, 'missed');
  const daily = await client
    .get('/api/analytics?date=2026-10-28&period=daily')
    .set(auth());
  assert.equal(
    daily.body.goals.find((g: any) => g.metric === 'duration').actual,
    45,
  );
  assert.equal(daily.body.totals.duration, 30);
  const monthly = await client
    .get('/api/analytics?date=2026-10-28&period=monthly')
    .set(auth());
  assert.equal(monthly.body.series.length, 30);
  assert.equal(monthly.body.totals.workouts, 3);
});
test('unconfigured integrations report requirements and never invent sync success', async () => {
  const { body } = await client
    .get('/api/integrations')
    .set(auth())
    .expect(200);
  assert.equal(body.find((i: any) => i.id === 'fitbit').available, false);
  await client.post('/api/integrations/fitbit/sync').set(auth()).expect(501);
});
test('record deletion removes data from dashboard', async () => {
  const { body } = await client.get('/api/records').set(auth());
  await client
    .delete('/api/records/' + body[0]._id)
    .set(auth())
    .expect(204);
  const d = await client.get('/api/dashboard?date=2026-10-28').set(auth());
  assert.equal(d.body.today.heartRateBpm, null);
  assert.equal(d.body.today.steps, 0);
});
