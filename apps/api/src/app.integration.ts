import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApiApp } from "./app";

import { createAlphaLeadCaptureStore } from "@real-estate-ai/database";

describe("lead capture api", () => {
  let store: Awaited<ReturnType<typeof createAlphaLeadCaptureStore>>;
  let app: ReturnType<typeof buildApiApp>;

  beforeEach(async () => {
    store = await createAlphaLeadCaptureStore({
      inMemory: true
    });
    app = buildApiApp({
      store
    });
  });

  afterEach(async () => {
    await app.close();
    await store.close();
  });

  it("creates a persisted website lead case", async () => {
    const response = await app.inject({
      method: "POST",
      payload: {
        budget: "USD 650,000",
        customerName: "Aisha Rahman",
        email: "aisha@example.com",
        message: "Looking for a three-bedroom apartment and can visit this weekend.",
        phone: "+1-555-0100",
        preferredLocale: "en",
        projectInterest: "Sunrise Residences"
      },
      url: "/v1/website-leads"
    });

    expect(response.statusCode).toBe(201);

    const createdCase = response.json();

    expect(createdCase.stage).toBe("new");
    expect(createdCase.source).toBe("website");
    expect(createdCase.customerName).toBe("Aisha Rahman");
    expect(createdCase.projectInterest).toBe("Sunrise Residences");
  });

  it("lists the same persisted case for manager review", async () => {
    const createResponse = await app.inject({
      method: "POST",
      payload: {
        customerName: "Omar Haddad",
        email: "omar@example.com",
        message: "Need an Arabic-speaking follow-up for a family home search.",
        preferredLocale: "ar",
        projectInterest: "Palm Horizon"
      },
      url: "/v1/website-leads"
    });

    const createdCase = createResponse.json();

    const listResponse = await app.inject({
      method: "GET",
      url: "/v1/cases"
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().cases).toHaveLength(1);
    expect(listResponse.json().cases[0]?.caseId).toBe(createdCase.caseId);

    const detailResponse = await app.inject({
      method: "GET",
      url: `/v1/cases/${createdCase.caseId}`
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().auditEvents).toHaveLength(1);
    expect(detailResponse.json().auditEvents[0]?.eventType).toBe("website_lead_received");
  });

  it("rejects an invalid website lead payload", async () => {
    const response = await app.inject({
      method: "POST",
      payload: {
        customerName: "X",
        email: "invalid-email"
      },
      url: "/v1/website-leads"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("invalid_request");
  });
});
