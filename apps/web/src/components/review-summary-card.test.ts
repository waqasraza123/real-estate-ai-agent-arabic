import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ReviewSummaryCard } from "./review-summary-card";

Object.assign(globalThis, { React });

describe("ReviewSummaryCard", () => {
  it("renders badges, body copy, detail items, and actions through the shared workflow shell", () => {
    const html = renderToStaticMarkup(
      createElement(
        ReviewSummaryCard,
        {
          actions: createElement("a", { href: "/qa/cases/case-1" }, "Open QA record"),
          badges: [
            { label: "Approved", tone: "success" },
            { label: "Prepared reply" },
            { label: "Manual request" }
          ],
          details: [
            { label: "Prepared draft", value: "Reply draft body" },
            { label: "Requested by", value: "QA Team" }
          ],
          meta: createElement("p", null, "QA Team · 2026-04-18 18:00"),
          summary: "Approved for the next human response.",
          title: "Current takeover gate",
          tone: "warning"
        },
        createElement("p", null, "Matched pricing evidence")
      )
    );

    expect(html).toContain("Current takeover gate");
    expect(html).toContain("Approved");
    expect(html).toContain("Prepared reply");
    expect(html).toContain("Reply draft body");
    expect(html).toContain("Open QA record");
    expect(html).toContain("Matched pricing evidence");
  });
});
