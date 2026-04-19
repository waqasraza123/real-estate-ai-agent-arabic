import { describe, expect, it } from "vitest";

import { runCaseAgentEvalScenarios } from "./agent-evals";

describe("case agent evaluation harness", () => {
  it(
    "passes the default production-grade scenario corpus",
    async () => {
      const results = await runCaseAgentEvalScenarios();

      expect(results.every((result) => result.passed)).toBe(true);
    },
    300000
  );
});
