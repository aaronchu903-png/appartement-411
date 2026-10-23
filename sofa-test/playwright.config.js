const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: path.join(__dirname),
  testMatch: /(verify(-live)?|capture-v3)\.spec\.js/,
  timeout: 120000,
  use: {
    ...devices['iPhone 14'],
    browserName: 'webkit',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173/appartement-411/sofa-test/',
    serviceWorkers: 'block'
  },
  webServer: process.env.PLAYWRIGHT_SKIP_SERVER
    ? undefined
    : {
        command: 'node ../scripts/serve-github-pages.js',
        port: 4173,
        reuseExistingServer: !process.env.CI,
        cwd: __dirname
      }
});
