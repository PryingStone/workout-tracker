import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';
const { MONGODB_URI, JWT_SECRET, PORT = '4000', CORS_ORIGINS } = process.env;
if (!MONGODB_URI || !JWT_SECRET)
  throw new Error('Set MONGODB_URI and JWT_SECRET in apps/api/.env');
const app = createApp(JWT_SECRET, CORS_ORIGINS);
await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
const server = app.listen(Number(PORT), '0.0.0.0', () =>
  console.log(`Pulse API listening on port ${PORT}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    }),
  );
