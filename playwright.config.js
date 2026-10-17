const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'e2e',
  timeout: 240000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  use: {
    ...devices['iPhone 12'],
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173',
    serviceWorkers: process.env.PLAYWRIGHT_ALLOW_SW ? 'allow' : 'block'
  },
  webServer: process.env.PLAYWRIGHT_SKIP_SERVER ? undefined : {
    command: 'node scripts/serve-github-pages.js',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    cwd: __dirname
  }
});
