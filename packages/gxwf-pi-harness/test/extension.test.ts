import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { expect, test } from "vitest";

import foundryPiHarness from "../src/extension.js";

test("does not let the parent redefine expected artifacts", () => {
  let registered: unknown;
  foundryPiHarness({ registerTool: (tool: unknown) => (registered = tool) } as ExtensionAPI);

  const parameters = (registered as { parameters: { properties: Record<string, unknown> } })
    .parameters;
  expect(Object.keys(parameters.properties)).toEqual(["skill", "task", "inputs"]);
  expect(parameters.properties).not.toHaveProperty("expected_artifacts");
});
