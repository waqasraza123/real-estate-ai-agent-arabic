import Fastify from "fastify";

import {
  approveHandoverCustomerUpdateInputSchema,
  completeHandoverInputSchema,
  confirmHandoverAppointmentInputSchema,
  createHandoverBlockerInputSchema,
  createHandoverPostCompletionFollowUpInputSchema,
  createHandoverIntakeInputSchema,
  createWebsiteLeadInputSchema,
  markHandoverCustomerUpdateDispatchReadyInputSchema,
  manageCaseFollowUpInputSchema,
  planHandoverAppointmentInputSchema,
  prepareHandoverCustomerUpdateDeliveryInputSchema,
  qualifyCaseInputSchema,
  resolveHandoverPostCompletionFollowUpInputSchema,
  saveHandoverArchiveReviewInputSchema,
  saveHandoverReviewInputSchema,
  scheduleVisitInputSchema,
  operatorRoleSchema,
  startHandoverExecutionInputSchema,
  type OperatorRole,
  updateHandoverArchiveStatusInputSchema,
  updateAutomationStatusInputSchema,
  updateDocumentRequestInputSchema,
  updateHandoverBlockerInputSchema,
  updateHandoverMilestoneInputSchema,
  updateHandoverTaskStatusInputSchema
} from "@real-estate-ai/contracts";
import type { LeadCaptureStore } from "@real-estate-ai/database";
import {
  approvePersistedHandoverCustomerUpdate,
  completePersistedHandover,
  confirmPersistedHandoverAppointment,
  createPersistedHandoverBlocker,
  createPersistedHandoverPostCompletionFollowUp,
  resolvePersistedHandoverPostCompletionFollowUp,
  savePersistedHandoverArchiveReview,
  savePersistedHandoverReview,
  startPersistedHandoverExecution,
  WorkflowRuleError,
  getPersistedCaseDetail,
  getPersistedHandoverCaseDetail,
  listPersistedCases,
  markPersistedHandoverCustomerUpdateDispatchReady,
  managePersistedCaseFollowUp,
  planPersistedHandoverAppointment,
  preparePersistedHandoverCustomerUpdateDelivery,
  qualifyPersistedCase,
  schedulePersistedVisit,
  setPersistedAutomationStatus,
  startPersistedHandoverIntake,
  submitWebsiteLead,
  updatePersistedHandoverArchiveStatus,
  updatePersistedDocumentRequest,
  updatePersistedHandoverBlocker,
  updatePersistedHandoverMilestone,
  updatePersistedHandoverTask
} from "@real-estate-ai/workflows";

export function buildApiApp(dependencies: {
  store: LeadCaptureStore;
}) {
  const app = Fastify({
    logger: false
  });

  const handoverGovernanceRoles: OperatorRole[] = ["handover_manager", "admin"];

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
    };
  }>("/v1/handover-cases/:handoverCaseId/appointment", async (request, reply) => {
    const result = planHandoverAppointmentInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const handoverCase = await planPersistedHandoverAppointment(dependencies.store, request.params.handoverCaseId, result.data);

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
      appointmentId: string;
      handoverCaseId: string;
    };
  }>("/v1/handover-cases/:handoverCaseId/appointment/:appointmentId/confirmation", async (request, reply) => {
    const result = confirmHandoverAppointmentInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const handoverCase = await confirmPersistedHandoverAppointment(
        dependencies.store,
        request.params.handoverCaseId,
        request.params.appointmentId,
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
      customerUpdateId: string;
      handoverCaseId: string;
    };
  }>("/v1/handover-cases/:handoverCaseId/customer-updates/:customerUpdateId/delivery", async (request, reply) => {
    const result = prepareHandoverCustomerUpdateDeliveryInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const handoverCase = await preparePersistedHandoverCustomerUpdateDelivery(
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
      customerUpdateId: string;
      handoverCaseId: string;
    };
  }>("/v1/handover-cases/:handoverCaseId/customer-updates/:customerUpdateId/dispatch-ready", async (request, reply) => {
    const result = markHandoverCustomerUpdateDispatchReadyInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const handoverCase = await markPersistedHandoverCustomerUpdateDispatchReady(
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

  app.post<{
    Params: {
      handoverCaseId: string;
    };
  }>("/v1/handover-cases/:handoverCaseId/blockers", async (request, reply) => {
    const result = createHandoverBlockerInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const handoverCase = await createPersistedHandoverBlocker(dependencies.store, request.params.handoverCaseId, result.data);

      if (!handoverCase) {
        return reply.status(404).send({
          error: "resource_not_found"
        });
      }

      return reply.status(201).send(handoverCase);
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
      blockerId: string;
      handoverCaseId: string;
    };
  }>("/v1/handover-cases/:handoverCaseId/blockers/:blockerId", async (request, reply) => {
    const result = updateHandoverBlockerInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    const handoverCase = await updatePersistedHandoverBlocker(
      dependencies.store,
      request.params.handoverCaseId,
      request.params.blockerId,
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
      handoverCaseId: string;
    };
  }>("/v1/handover-cases/:handoverCaseId/execution", async (request, reply) => {
    const result = startHandoverExecutionInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const handoverCase = await startPersistedHandoverExecution(dependencies.store, request.params.handoverCaseId, result.data);

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
    };
  }>("/v1/handover-cases/:handoverCaseId/review", async (request, reply) => {
    if (!hasRequiredOperatorRole(request.headers["x-operator-role"], handoverGovernanceRoles)) {
      return reply.status(403).send({
        error: "insufficient_role",
        requiredRoles: handoverGovernanceRoles
      });
    }

    const result = saveHandoverReviewInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const handoverCase = await savePersistedHandoverReview(dependencies.store, request.params.handoverCaseId, result.data);

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
    };
  }>("/v1/handover-cases/:handoverCaseId/archive-review", async (request, reply) => {
    if (!hasRequiredOperatorRole(request.headers["x-operator-role"], handoverGovernanceRoles)) {
      return reply.status(403).send({
        error: "insufficient_role",
        requiredRoles: handoverGovernanceRoles
      });
    }

    const result = saveHandoverArchiveReviewInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const handoverCase = await savePersistedHandoverArchiveReview(dependencies.store, request.params.handoverCaseId, result.data);

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
    };
  }>("/v1/handover-cases/:handoverCaseId/archive-status", async (request, reply) => {
    if (!hasRequiredOperatorRole(request.headers["x-operator-role"], handoverGovernanceRoles)) {
      return reply.status(403).send({
        error: "insufficient_role",
        requiredRoles: handoverGovernanceRoles
      });
    }

    const result = updateHandoverArchiveStatusInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const handoverCase = await updatePersistedHandoverArchiveStatus(dependencies.store, request.params.handoverCaseId, result.data);

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
    };
  }>("/v1/handover-cases/:handoverCaseId/post-completion-follow-up", async (request, reply) => {
    if (!hasRequiredOperatorRole(request.headers["x-operator-role"], handoverGovernanceRoles)) {
      return reply.status(403).send({
        error: "insufficient_role",
        requiredRoles: handoverGovernanceRoles
      });
    }

    const result = createHandoverPostCompletionFollowUpInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const handoverCase = await createPersistedHandoverPostCompletionFollowUp(
        dependencies.store,
        request.params.handoverCaseId,
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
      followUpId: string;
      handoverCaseId: string;
    };
  }>("/v1/handover-cases/:handoverCaseId/post-completion-follow-up/:followUpId", async (request, reply) => {
    if (!hasRequiredOperatorRole(request.headers["x-operator-role"], handoverGovernanceRoles)) {
      return reply.status(403).send({
        error: "insufficient_role",
        requiredRoles: handoverGovernanceRoles
      });
    }

    const result = resolveHandoverPostCompletionFollowUpInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const handoverCase = await resolvePersistedHandoverPostCompletionFollowUp(
        dependencies.store,
        request.params.handoverCaseId,
        request.params.followUpId,
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
    };
  }>("/v1/handover-cases/:handoverCaseId/completion", async (request, reply) => {
    const result = completeHandoverInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const handoverCase = await completePersistedHandover(dependencies.store, request.params.handoverCaseId, result.data);

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

function hasRequiredOperatorRole(headerValue: string | string[] | undefined, requiredRoles: OperatorRole[]) {
  const resolvedRole = resolveOperatorRole(headerValue);

  return requiredRoles.includes(resolvedRole);
}

function resolveOperatorRole(headerValue: string | string[] | undefined): OperatorRole {
  const candidate = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const parsedRole = operatorRoleSchema.safeParse(candidate);

  return parsedRole.success ? parsedRole.data : "handover_manager";
}
