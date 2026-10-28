import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { createApp } from '../apps/api/src/app.js';
async function main() {
  await mongoose.connect(
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017',
    { dbName: 'pulse_e2e_' + randomUUID().replaceAll('-', '') },
  );
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  const server = createApp('browser-test-secret-at-least-32-characters').listen(
    4000,
    '127.0.0.1',
  );
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () =>
      server.close(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
        process.exit(0);
      }),
    );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
