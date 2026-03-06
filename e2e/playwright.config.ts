import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./scenarios",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: "http://localhost:3100",
    trace: "on",
    video: "on",
    screenshot: "on",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
