import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (!existsSync('apps/api/.env'))
  writeFileSync(
    'apps/api/.env',
    `PORT=4000\nMONGODB_URI=mongodb://127.0.0.1:27017/pulse\nJWT_SECRET=${randomBytes(48).toString('hex')}\nCORS_ORIGINS=http://localhost:8081,http://localhost:19006\n`,
    { mode: 0o600 },
  );
if (!existsSync('apps/mobile/.env'))
  writeFileSync(
    'apps/mobile/.env',
    'EXPO_PUBLIC_API_URL=http://localhost:4000/api\n',
  );
console.log(
  'Local configuration prepared; existing .env files were preserved.',
);
