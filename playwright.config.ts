import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.ts',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:8081',
    headless: true,
    launchOptions: {
      ...(existsSync('/usr/bin/chromium')
        ? { executablePath: '/usr/bin/chromium' }
        : {}),
      args: process.env.CI ? ['--no-sandbox'] : [],
    },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npx tsx tests/server.ts',
      url: 'http://127.0.0.1:4000/api/health',
      reuseExistingServer: false,
    },
    {
      command: 'python3 -m http.server 8081 --directory apps/mobile/dist',
      url: 'http://localhost:8081',
      reuseExistingServer: false,
    },
  ],
});
