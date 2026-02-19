import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/test/e2e/**", "node_modules/**"],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov", "json-summary"],
      include: [
        "src/lib/**",
        "src/hooks/**",
        "src/components/**",
        "src/app/api/**",
      ],
      exclude: [
        "src/lib/help/content/**",
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 75,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
