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
    baseURL: 'http://127.0.0.1:4173',
    serviceWorkers: 'block'
  },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    cwd: __dirname
  }
});
