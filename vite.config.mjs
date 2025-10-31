import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(process.cwd(), "src/renderer"),
  plugins: [react()],
  build: {
    outDir: path.resolve(process.cwd(), "dist/renderer"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src/renderer"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    globals: true,
    css: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage/renderer",
      reporter: ["text", "html"],
      include: ["src/renderer/**/*.{js,jsx,ts,tsx}"],
      exclude: ["**/__tests__/**", "**/*.test.*", "src/renderer/main.jsx"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
