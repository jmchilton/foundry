import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    globals: false,
  },
});
