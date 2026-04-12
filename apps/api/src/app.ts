import Fastify from "fastify";

import {
  approveHandoverCustomerUpdateInputSchema,
  createHandoverIntakeInputSchema,
  createWebsiteLeadInputSchema,
  manageCaseFollowUpInputSchema,
  qualifyCaseInputSchema,
  scheduleVisitInputSchema,
  updateAutomationStatusInputSchema,
  updateDocumentRequestInputSchema,
  updateHandoverMilestoneInputSchema,
  updateHandoverTaskStatusInputSchema
} from "@real-estate-ai/contracts";
import type { LeadCaptureStore } from "@real-estate-ai/database";
import {
  approvePersistedHandoverCustomerUpdate,
  WorkflowRuleError,
  getPersistedCaseDetail,
  getPersistedHandoverCaseDetail,
  listPersistedCases,
  managePersistedCaseFollowUp,
  qualifyPersistedCase,
  schedulePersistedVisit,
  setPersistedAutomationStatus,
  startPersistedHandoverIntake,
  submitWebsiteLead,
  updatePersistedDocumentRequest,
  updatePersistedHandoverMilestone,
  updatePersistedHandoverTask
} from "@real-estate-ai/workflows";

export function buildApiApp(dependencies: {
  store: LeadCaptureStore;
}) {
  const app = Fastify({
    logger: false
  });

  app.get("/health", async () => ({
    status: "ok"
  }));

  app.post("/v1/website-leads", async (request, reply) => {
    const result = createWebsiteLeadInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    const createdCase = await submitWebsiteLead(dependencies.store, result.data);

    return reply.status(201).send(createdCase);
  });

  app.get("/v1/cases", async () => ({
    cases: await listPersistedCases(dependencies.store)
  }));

  app.get<{
    Params: {
      caseId: string;
    };
  }>("/v1/cases/:caseId", async (request, reply) => {
    const caseDetail = await getPersistedCaseDetail(dependencies.store, request.params.caseId);

    if (!caseDetail) {
      return reply.status(404).send({
        error: "case_not_found"
      });
    }

    return caseDetail;
  });

  app.get<{
    Params: {
      handoverCaseId: string;
    };
  }>("/v1/handover-cases/:handoverCaseId", async (request, reply) => {
    const handoverCase = await getPersistedHandoverCaseDetail(dependencies.store, request.params.handoverCaseId);

    if (!handoverCase) {
      return reply.status(404).send({
        error: "handover_case_not_found"
      });
    }

    return handoverCase;
  });

  app.post<{
    Params: {
      caseId: string;
    };
  }>("/v1/cases/:caseId/qualification", async (request, reply) => {
    const result = qualifyCaseInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    const caseDetail = await qualifyPersistedCase(dependencies.store, request.params.caseId, result.data);

    if (!caseDetail) {
      return reply.status(404).send({
        error: "case_not_found"
      });
    }

    return reply.status(200).send(caseDetail);
  });

  app.post<{
    Params: {
      caseId: string;
    };
  }>("/v1/cases/:caseId/visits", async (request, reply) => {
    const result = scheduleVisitInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    const caseDetail = await schedulePersistedVisit(dependencies.store, request.params.caseId, result.data);

    if (!caseDetail) {
      return reply.status(404).send({
        error: "case_not_found"
      });
    }

    return reply.status(200).send(caseDetail);
  });

  app.post<{
    Params: {
      caseId: string;
    };
  }>("/v1/cases/:caseId/follow-up-plan", async (request, reply) => {
    const result = manageCaseFollowUpInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    const caseDetail = await managePersistedCaseFollowUp(dependencies.store, request.params.caseId, result.data);

    if (!caseDetail) {
      return reply.status(404).send({
        error: "case_not_found"
      });
    }

    return reply.status(200).send(caseDetail);
  });

  app.post<{
    Params: {
      caseId: string;
    };
  }>("/v1/cases/:caseId/automation", async (request, reply) => {
    const result = updateAutomationStatusInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    const caseDetail = await setPersistedAutomationStatus(dependencies.store, request.params.caseId, result.data);

    if (!caseDetail) {
      return reply.status(404).send({
        error: "case_not_found"
      });
    }

    return reply.status(200).send(caseDetail);
  });

  app.post<{
    Params: {
      caseId: string;
    };
  }>("/v1/cases/:caseId/handover-intake", async (request, reply) => {
    const result = createHandoverIntakeInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const caseDetail = await startPersistedHandoverIntake(dependencies.store, request.params.caseId, result.data);

      if (!caseDetail) {
        return reply.status(404).send({
          error: "case_not_found"
        });
      }

      return reply.status(200).send(caseDetail);
    } catch (error) {
      if (error instanceof WorkflowRuleError) {
        return reply.status(409).send({
          error: error.code
        });
      }

      throw error;
    }
  });

  app.patch<{
    Params: {
      caseId: string;
      documentRequestId: string;
    };
  }>("/v1/cases/:caseId/documents/:documentRequestId", async (request, reply) => {
    const result = updateDocumentRequestInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    const caseDetail = await updatePersistedDocumentRequest(
      dependencies.store,
      request.params.caseId,
      request.params.documentRequestId,
      result.data
    );

    if (!caseDetail) {
      return reply.status(404).send({
        error: "resource_not_found"
      });
    }

    return reply.status(200).send(caseDetail);
  });

  app.patch<{
    Params: {
      handoverCaseId: string;
      milestoneId: string;
    };
  }>("/v1/handover-cases/:handoverCaseId/milestones/:milestoneId", async (request, reply) => {
    const result = updateHandoverMilestoneInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    const handoverCase = await updatePersistedHandoverMilestone(
      dependencies.store,
      request.params.handoverCaseId,
      request.params.milestoneId,
      result.data
    );

    if (!handoverCase) {
      return reply.status(404).send({
        error: "resource_not_found"
      });
    }

    return reply.status(200).send(handoverCase);
  });

  app.patch<{
    Params: {
      customerUpdateId: string;
      handoverCaseId: string;
    };
  }>("/v1/handover-cases/:handoverCaseId/customer-updates/:customerUpdateId", async (request, reply) => {
    const result = approveHandoverCustomerUpdateInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const handoverCase = await approvePersistedHandoverCustomerUpdate(
        dependencies.store,
        request.params.handoverCaseId,
        request.params.customerUpdateId,
        result.data
      );

      if (!handoverCase) {
        return reply.status(404).send({
          error: "resource_not_found"
        });
      }

      return reply.status(200).send(handoverCase);
    } catch (error) {
      if (error instanceof WorkflowRuleError) {
        return reply.status(409).send({
          error: error.code
        });
      }

      throw error;
    }
  });

  app.patch<{
    Params: {
      handoverCaseId: string;
      handoverTaskId: string;
    };
  }>("/v1/handover-cases/:handoverCaseId/tasks/:handoverTaskId", async (request, reply) => {
    const result = updateHandoverTaskStatusInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    const handoverCase = await updatePersistedHandoverTask(
      dependencies.store,
      request.params.handoverCaseId,
      request.params.handoverTaskId,
      result.data
    );

    if (!handoverCase) {
      return reply.status(404).send({
        error: "resource_not_found"
      });
    }

    return reply.status(200).send(handoverCase);
  });

  return app;
}
