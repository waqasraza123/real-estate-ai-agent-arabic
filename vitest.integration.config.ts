import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["apps/**/*.integration.ts"],
    hookTimeout: 30000,
    testTimeout: 45000
  }
});
