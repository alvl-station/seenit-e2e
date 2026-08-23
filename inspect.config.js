// Throwaway, alongside inspect.spec.js. The main config's testDir points at
// the generated Gherkin specs, so the probe needs its own.
const { defineConfig } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: /inspect\.spec\.js$/,
  use: {
    baseURL: process.env.BASE_URL || 'https://alvl-station.github.io/seenit/',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    trace: 'off',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.js$/, testDir: path.join(__dirname, 'support') },
    {
      name: 'phone-portrait',
      dependencies: ['setup'],
      use: { storageState: path.join(__dirname, '.auth', 'state.json') },
    },
  ],
});
