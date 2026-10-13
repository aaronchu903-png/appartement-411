const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'e2e',
  timeout: 30000,
  use: { viewport: { width: 390, height: 844 } },
  webServer: {
    command: 'python3 -m http.server 4173',
    port: 4173,
    reuseExistingServer: true
  }
});
