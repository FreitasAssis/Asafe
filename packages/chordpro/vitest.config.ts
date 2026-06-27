import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
    // Wrappers (parse/transpose/hideChords/detectFormat) entram na Fase 1 via TDD.
    passWithNoTests: true,
  },
});
