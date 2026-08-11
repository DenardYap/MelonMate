import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
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
