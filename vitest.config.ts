import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@foundry/lib": new URL("./scripts/lib", import.meta.url).pathname,
    },
  },
});
