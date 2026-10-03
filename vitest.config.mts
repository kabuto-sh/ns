import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      include: ["src/**"],
      exclude: ["lib/**", "src/**/__tests__/**"],
    },
  },
});
