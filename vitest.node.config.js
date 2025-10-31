import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/**/__tests__/**/*.node.test.js",
      "src/__tests__/**/*.node.test.js",
    ],
    globals: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage/node",
      reporter: ["text", "html"],
      include: ["src/**/*.js"],
      exclude: ["src/renderer/**", "src/**/__tests__/**", "**/*.test.*"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 55,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
});
