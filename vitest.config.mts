import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/.capacitor-build/**",
      "**/mobile-dist/**",
      "**/.next/**",
      "**/ios/**",
      "**/android/**",
    ],
  },
});
