import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose, { type Model } from 'mongoose';
import { z } from 'zod';
import * as m from './models.js';
import * as v from './validation.js';
import { analytics } from './analytics.js';

export function createApp(secret: string, origins = 'http://localhost:8081') {
  if (secret.length < 32)
    throw new Error('JWT_SECRET must contain at least 32 characters');
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: origins.split(',') }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 300 }));
  const authLimit = rateLimit({ windowMs: 15 * 60_000, limit: 30 });
  const publicUser = (u: any) => ({
    _id: String(u._id),
    name: u.name,
    email: u.email,
  });
  const token = (u: any) =>
    jwt.sign({}, secret, {
      subject: String(u._id),
      expiresIn: '7d',
      issuer: 'pulse-api',
      audience: 'pulse-app',
      algorithm: 'HS256',
    });
  const fail = (res: Response, status: number, message: string) =>
    res.status(status).json({ error: { message } });
  app.get('/api/health', (_req, res) =>
    res
      .status(mongoose.connection.readyState === 1 ? 200 : 503)
      .json({
        status:
          mongoose.connection.readyState === 1 ? 'ok' : 'database-unavailable',
      }),
  );
  app.post('/api/auth/register', authLimit, async (req, res) => {
    const data = v.register.parse(req.body);
    const user = await m.User.create({
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 12),
    });
    res.status(201).json({ token: token(user), user: publicUser(user) });
  });
  app.post('/api/auth/login', authLimit, async (req, res) => {
    const data = v.login.parse(req.body),
      user = await m.User.findOne({ email: data.email }).select(
        '+passwordHash',
      );
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash)))
      return fail(res, 401, 'Invalid email or password');
    res.json({ token: token(user), user: publicUser(user) });
  });
  app.use('/api', async (req, res, next) => {
    try {
      const raw = req.headers.authorization;
      if (!raw?.startsWith('Bearer ')) return fail(res, 401, 'Please sign in');
      const payload = jwt.verify(raw.slice(7), secret, {
        algorithms: ['HS256'],
        issuer: 'pulse-api',
        audience: 'pulse-app',
      });
      if (
        typeof payload === 'string' ||
        !payload.sub ||
        !mongoose.isValidObjectId(payload.sub)
      )
        return fail(res, 401, 'Invalid session');
      res.locals.user = payload.sub;
      if (!(await m.User.exists({ _id: payload.sub })))
        return fail(res, 401, 'User no longer exists');
      next();
    } catch {
      return fail(res, 401, 'Session expired or invalid');
    }
  });
  app.get('/api/profile', async (_req, res) =>
    res.json(publicUser(await m.User.findById(res.locals.user))),
  );
  app.patch('/api/profile', async (req, res) =>
    res.json(
      publicUser(
        await m.User.findByIdAndUpdate(
          res.locals.user,
          v.profile.parse(req.body),
          { new: true, runValidators: true },
        ),
      ),
    ),
  );
  app.put('/api/records', async (req, res) => {
    const data = v.record.parse(req.body);
    res.json(
      await m.FitnessRecord.findOneAndUpdate(
        { user: res.locals.user, date: data.date },
        {
          $set: data,
          $setOnInsert: { user: res.locals.user, source: 'manual' },
        },
        { upsert: true, new: true, runValidators: true },
      ),
    );
  });
  app.get('/api/records', async (req, res) =>
    res.json(
      await m.FitnessRecord.find({ user: res.locals.user })
        .sort({ date: -1 })
        .limit(366),
    ),
  );
  app.delete('/api/records/:id', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id))
      return fail(res, 400, 'Invalid ID');
    const result = await m.FitnessRecord.findOneAndDelete({
      _id: req.params.id,
      user: res.locals.user,
    });
    if (!result) return fail(res, 404, 'Record not found');
    res.status(204).end();
  });
  async function calories(data: z.infer<typeof v.workout>, user: string) {
    const weight = await m.FitnessRecord.findOne({
      user,
      date: { $lte: data.date },
      weightKg: { $exists: true },
    }).sort({ date: -1 });
    const mets = {
      strength: 5,
      running: 8,
      walking: 3.5,
      cycling: 6,
      yoga: 2.5,
      other: 4,
    };
    return Math.round(
      ((mets[data.type] * 3.5 * (weight?.weightKg ?? 70)) / 200) *
        data.durationMinutes,
    );
  }
  // Every lookup and mutation includes the authenticated owner; client owner fields are rejected.
  function resource(
    path: string,
    model: Model<any>,
    schema: z.ZodType<any>,
    transform?: (data: any, user: string) => Promise<any>,
  ) {
    app.get('/api/' + path, async (_req, res) => {
      const rows = await model
        .find({ user: res.locals.user })
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();
      res.json(
        path === 'schedules'
          ? rows.map((s: any) => ({
              ...s,
              status:
                s.status === 'scheduled' && new Date(s.scheduledAt) < new Date()
                  ? 'missed'
                  : s.status,
            }))
          : rows,
      );
    });
    app.post('/api/' + path, async (req, res) => {
      let data = schema.parse(req.body);
      if (transform) data = await transform(data, res.locals.user);
      res
        .status(201)
        .json(
          await model.create({ ...(data as object), user: res.locals.user }),
        );
    });
    app.put('/api/' + path + '/:id', async (req, res) => {
      if (!mongoose.isValidObjectId(req.params.id))
        return fail(res, 400, 'Invalid ID');
      let data = schema.parse(req.body);
      if (transform) data = await transform(data, res.locals.user);
      const result = await model.findOneAndUpdate(
        { _id: req.params.id, user: res.locals.user },
        { $set: data },
        { new: true, runValidators: true },
      );
      if (!result) return fail(res, 404, 'Item not found');
      res.json(result);
    });
    app.delete('/api/' + path + '/:id', async (req, res) => {
      if (!mongoose.isValidObjectId(req.params.id))
        return fail(res, 400, 'Invalid ID');
      if (
        !(await model.findOneAndDelete({
          _id: req.params.id,
          user: res.locals.user,
        }))
      )
        return fail(res, 404, 'Item not found');
      res.status(204).end();
    });
  }
  resource('workouts', m.WorkoutSession, v.workout, async (data, user) => ({
    ...data,
    caloriesEstimate: await calories(data, user),
  }));
  resource('exercises', m.Exercise, v.exercise);
  resource('goals', m.FitnessGoal, v.goal);
  resource('schedules', m.WorkoutSchedule, v.schedule);
  resource('reminders', m.Reminder, v.reminder);
  const summary = async (req: Request, res: Response) => {
    const day = v.date.parse(
      req.query.date ?? new Date().toISOString().slice(0, 10),
    );
    const period = z
      .enum(['daily', 'weekly', 'monthly'])
      .parse(req.query.period ?? 'weekly');
    res.json(
      await analytics(
        res.locals.user,
        day,
        { daily: 1, weekly: 7, monthly: 30 }[period],
      ),
    );
  };
  app.get('/api/dashboard', summary);
  app.get('/api/analytics', summary);
  app.get('/api/integrations', (_req, res) =>
    res.json([
      {
        id: 'manual',
        name: 'Manual entry',
        available: true,
        description:
          'Enter daily totals, weight and measured heart rate. No automatic sensor access.',
      },
      {
        id: 'fitbit',
        name: 'Fitbit',
        available: false,
        description:
          'Requires a registered Fitbit OAuth app, server-side client credentials, consent, callback URL, encrypted token storage and sync implementation. No account is connected.',
      },
      {
        id: 'healthkit',
        name: 'Apple Health',
        available: false,
        description:
          'Requires iOS, a custom Expo development build, HealthKit entitlement, native health module and explicit read permissions. Not available in Expo Go or this web build.',
      },
    ]),
  );
  app.post('/api/integrations/:provider/sync', (_req, res) =>
    fail(
      res,
      501,
      'Automatic synchronization is not configured. Use manual entry.',
    ),
  );
  app.use((_req, res) => fail(res, 404, 'Endpoint not found'));
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError)
      return res
        .status(400)
        .json({
          error: {
            message: 'Check your input',
            details: error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
          },
        });
    if (error.code === 11000)
      return fail(res, 409, 'This email or goal already exists');
    if (error.type === 'entity.parse.failed')
      return fail(res, 400, 'Invalid JSON');
    if (error.type === 'entity.too.large')
      return fail(res, 413, 'Request too large');
    console.error('API error:', error.name);
    return fail(res, 500, 'An unexpected error occurred');
  });
  return app;
}
