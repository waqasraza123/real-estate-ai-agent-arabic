import Fastify from "fastify";

import {
  approveHandoverCustomerUpdateInputSchema,
  approveCommercialFactProposalInputSchema,
  bulkApproveCommercialFactProposalsInputSchema,
  bulkRejectCommercialFactProposalsInputSchema,
  completeHandoverInputSchema,
  confirmHandoverAppointmentInputSchema,
  createCommercialSourceInputSchema,
  createHandoverBlockerInputSchema,
  createHandoverPostCompletionFollowUpInputSchema,
  createHandoverIntakeInputSchema,
  createManualCommercialFactInputSchema,
  createWebsiteLeadInputSchema,
  importInventoryCsvInputSchema,
  listActiveCommercialFactsQuerySchema,
  listCommercialFactExpiryReviewsQuerySchema,
  listCommercialFactProposalsQuerySchema,
  listCommercialSourceRefreshTasksQuerySchema,
  listGovernanceEventsQuerySchema,
  manageBulkCaseFollowUpInputSchema,
  prepareCaseReplyDraftQaReviewInputSchema,
  requestCaseQaReviewInputSchema,
  rejectCommercialFactProposalInputSchema,
  reviewCommercialFactExpiryInputSchema,
  resolveCaseQaReviewInputSchema,
  resolveCommercialSourceRefreshTaskInputSchema,
  resolveHandoverCustomerUpdateQaReviewInputSchema,
  sendCaseReplyInputSchema,
  updateHandoverArchiveStatusInputSchema,
  updateAutomationStatusInputSchema,
  updateDocumentRequestInputSchema,
  updateHandoverBlockerInputSchema,
  updateHandoverMilestoneInputSchema,
  updateHandoverTaskStatusInputSchema,
  markHandoverCustomerUpdateDispatchReadyInputSchema,
  manageCaseFollowUpInputSchema,
  planHandoverAppointmentInputSchema,
  prepareHandoverCustomerUpdateDeliveryInputSchema,
  qualifyCaseInputSchema,
  resolveHandoverPostCompletionFollowUpInputSchema,
  saveHandoverArchiveReviewInputSchema,
  saveHandoverReviewInputSchema,
  scheduleVisitInputSchema,
  startHandoverExecutionInputSchema
} from "@real-estate-ai/contracts";
import type { LeadCaptureStore } from "@real-estate-ai/database";
import {
  parseMetaWhatsAppWebhook,
  type CalendarBookingClient,
  verifyMetaWhatsAppWebhookSignature
} from "@real-estate-ai/integrations";
import {
  approvePersistedHandoverCustomerUpdate,
  approvePersistedCommercialFactProposal,
  bulkApprovePersistedCommercialFactProposals,
  bulkRejectPersistedCommercialFactProposals,
  completePersistedHandover,
  confirmPersistedHandoverAppointment,
  createPersistedCommercialSource,
  createPersistedHandoverBlocker,
  createPersistedHandoverPostCompletionFollowUp,
  createPersistedManualCommercialFact,
  getPersistedCommercialSourceDetail,
  preparePersistedCaseReplyDraftQaReview,
  getPersistedProjectCommercialReadinessSummary,
  importPersistedInventoryCsv,
  listPersistedActiveCommercialFacts,
  listPersistedCommercialFactExpiryReviews,
  listPersistedCommercialFactProposals,
  listPersistedCommercialSourceRefreshTasks,
  listPersistedCommercialSources,
  resolvePersistedCaseQaReview,
  resolvePersistedHandoverPostCompletionFollowUp,
  requestPersistedCaseQaReview,
  rejectPersistedCommercialFactProposal,
  reviewPersistedCommercialFactExpiry,
  resolvePersistedCommercialSourceRefreshTask,
  resolvePersistedHandoverCustomerUpdateQaReview,
  sendPersistedCaseReply,
  savePersistedHandoverArchiveReview,
  savePersistedHandoverReview,
  startPersistedHandoverExecution,
  WorkflowRuleError,
  getPersistedCaseDetail,
  getPersistedGovernanceSummary,
  getPersistedHandoverCaseDetail,
  listPersistedGovernanceEvents,
  listPersistedCases,
  markPersistedHandoverCustomerUpdateDispatchReady,
  managePersistedBulkCaseFollowUp,
  managePersistedCaseFollowUp,
  planPersistedHandoverAppointment,
  preparePersistedHandoverCustomerUpdateDelivery,
  qualifyPersistedCase,
  schedulePersistedVisit,
  setPersistedAutomationStatus,
  startPersistedHandoverIntake,
  submitWebsiteLead,
  uploadPersistedDocument,
  updatePersistedHandoverArchiveStatus,
  updatePersistedDocumentRequest,
  updatePersistedHandoverBlocker,
  updatePersistedHandoverMilestone,
  updatePersistedHandoverTask
} from "@real-estate-ai/workflows";

import type { DocumentStorage } from "./document-storage";
import { requireAnyOperatorWorkspace, requireOperatorPermission, requireOperatorWorkspace } from "./operator-session";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
  }
}

function mapMetaStatusToDeliveryStatus(status: string) {
  if (status === "delivered" || status === "read") {
    return "delivered" as const;
  }

  if (status === "sent") {
    return "sent" as const;
  }

  return "failed" as const;
}

function readSingleHeaderValue(headerValue: string | string[] | undefined) {
  return typeof headerValue === "string" && headerValue.trim().length > 0 ? decodeURIComponent(headerValue) : null;
}

function isSupportedDocumentMimeType(mimeType: string) {
  return mimeType === "application/pdf" || mimeType === "image/jpeg" || mimeType === "image/png";
}

function buildAttachmentHeader(fileName: string) {
  return `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export function buildApiApp(dependencies: {
  calendarClient?: CalendarBookingClient | null;
  documentStorage: DocumentStorage;
  documentUploadMaxBytes: number;
  store: LeadCaptureStore;
  whatsappWebhookAppSecret?: string | null;
  whatsappWebhookVerifyToken?: string | null;
}) {
  const app = Fastify({
    logger: false
  });

  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    const rawBody = typeof body === "string" ? body : body.toString("utf8");

    request.rawBody = rawBody;

    try {
      done(null, rawBody.length > 0 ? JSON.parse(rawBody) : {});
    } catch (error) {
      done(error as Error, undefined);
    }
  });

  app.addContentTypeParser("application/octet-stream", { parseAs: "buffer" }, (request, body, done) => {
    request.rawBody = typeof body === "string" ? body : body.toString("utf8");
    done(null, body);
  });

  app.get("/health", async () => ({
    status: "ok"
  }));

  app.get<{
    Querystring: {
      "hub.challenge"?: string;
      "hub.mode"?: string;
      "hub.verify_token"?: string;
    };
  }>("/v1/integrations/meta/whatsapp/webhook", async (request, reply) => {
    const verifyToken = dependencies.whatsappWebhookVerifyToken ?? null;

    if (
      request.query["hub.mode"] !== "subscribe" ||
      !verifyToken ||
      request.query["hub.verify_token"] !== verifyToken ||
      !request.query["hub.challenge"]
    ) {
      return reply.status(403).send({
        error: "webhook_verification_failed"
      });
    }

    return reply.type("text/plain").send(request.query["hub.challenge"]);
  });

  app.post("/v1/integrations/meta/whatsapp/webhook", async (request, reply) => {
    if (
      dependencies.whatsappWebhookAppSecret &&
      !verifyMetaWhatsAppWebhookSignature({
        appSecret: dependencies.whatsappWebhookAppSecret,
        rawBody: request.rawBody ?? "",
        signatureHeader: request.headers["x-hub-signature-256"]
      })
    ) {
      return reply.status(401).send({
        error: "webhook_signature_invalid"
      });
    }

    const parsedWebhook = parseMetaWhatsAppWebhook(request.body);

    await Promise.all([
      ...parsedWebhook.inboundMessages.map((message) =>
        dependencies.store.recordWhatsAppInboundMessage({
          messageId: message.messageId,
          normalizedPhone: message.phoneNumber,
          profileName: message.profileName,
          receivedAt: message.timestamp,
          textBody: message.textBody
        })
      ),
      ...parsedWebhook.deliveryStatuses.map((status) =>
        dependencies.store.recordWhatsAppDeliveryStatus({
          failureCode: status.failureCode,
          failureDetail: status.failureDetail,
          normalizedPhone: status.phoneNumber,
          providerMessageId: status.providerMessageId,
          status: mapMetaStatusToDeliveryStatus(status.status),
          updatedAt: status.timestamp
        })
      )
    ]);

    return reply.status(200).send({
      received: true
    });
  });

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
    Querystring: {
      projectCode?: string;
      tenantId?: string;
    };
  }>("/v1/commercial-sources", async (request, reply) => {
    if (!requireAnyOperatorWorkspace(request, reply, ["manager_revenue"])) {
      return reply;
    }

    return {
      sources: await listPersistedCommercialSources(dependencies.store, {
        ...(request.query.projectCode ? { projectCode: request.query.projectCode } : {}),
        ...(request.query.tenantId ? { tenantId: request.query.tenantId } : {})
      })
    };
  });

  app.post("/v1/commercial-sources", async (request, reply) => {
    const permission = "manage_commercial_sources";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

    const result = createCommercialSourceInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    return reply.status(201).send(await createPersistedCommercialSource(dependencies.store, result.data));
  });

  app.get<{
    Params: {
      sourceId: string;
    };
  }>("/v1/commercial-sources/:sourceId", async (request, reply) => {
    if (!requireAnyOperatorWorkspace(request, reply, ["manager_revenue"])) {
      return reply;
    }

    const source = await getPersistedCommercialSourceDetail(dependencies.store, request.params.sourceId);

    if (!source) {
      return reply.status(404).send({
        error: "commercial_source_not_found"
      });
    }

    return source;
  });

  app.post<{
    Params: {
      sourceId: string;
    };
  }>("/v1/commercial-sources/:sourceId/inventory-import", async (request, reply) => {
    const permission = "manage_commercial_sources";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

    const result = importInventoryCsvInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    const source = await importPersistedInventoryCsv(dependencies.store, request.params.sourceId, result.data);

    if (!source) {
      return reply.status(404).send({
        error: "commercial_source_not_found"
      });
    }

    return reply.status(200).send(source);
  });

  app.post("/v1/commercial-facts/manual", async (request, reply) => {
    const permission = "manage_commercial_sources";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

    const result = createManualCommercialFactInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    return reply.status(201).send(await createPersistedManualCommercialFact(dependencies.store, result.data));
  });

  app.get("/v1/commercial-fact-proposals", async (request, reply) => {
    if (!requireAnyOperatorWorkspace(request, reply, ["manager_revenue"])) {
      return reply;
    }

    const result = listCommercialFactProposalsQuerySchema.safeParse(request.query);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    return {
      proposals: await listPersistedCommercialFactProposals(dependencies.store, result.data)
    };
  });

  app.post<{
    Params: {
      proposalId: string;
    };
  }>("/v1/commercial-fact-proposals/:proposalId/approve", async (request, reply) => {
    const permission = "manage_commercial_sources";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

    const result = approveCommercialFactProposalInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    const proposal = await approvePersistedCommercialFactProposal(dependencies.store, request.params.proposalId, result.data);

    if (!proposal) {
      return reply.status(404).send({
        error: "proposal_not_found"
      });
    }

    return proposal;
  });

  app.post("/v1/commercial-fact-proposals/bulk-approve", async (request, reply) => {
    const permission = "manage_commercial_sources";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

    const result = bulkApproveCommercialFactProposalsInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    return bulkApprovePersistedCommercialFactProposals(dependencies.store, result.data);
  });

  app.post<{
    Params: {
      proposalId: string;
    };
  }>("/v1/commercial-fact-proposals/:proposalId/reject", async (request, reply) => {
    const permission = "manage_commercial_sources";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

    const result = rejectCommercialFactProposalInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    const proposal = await rejectPersistedCommercialFactProposal(dependencies.store, request.params.proposalId, result.data);

    if (!proposal) {
      return reply.status(404).send({
        error: "proposal_not_found"
      });
    }

    return proposal;
  });

  app.post("/v1/commercial-fact-proposals/bulk-reject", async (request, reply) => {
    const permission = "manage_commercial_sources";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

    const result = bulkRejectCommercialFactProposalsInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    return bulkRejectPersistedCommercialFactProposals(dependencies.store, result.data);
  });

  app.get("/v1/commercial-facts/active", async (request, reply) => {
    if (!requireAnyOperatorWorkspace(request, reply, ["manager_revenue"])) {
      return reply;
    }

    const result = listActiveCommercialFactsQuerySchema.safeParse(request.query);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    return {
      facts: await listPersistedActiveCommercialFacts(dependencies.store, result.data)
    };
  });

  app.get("/v1/commercial-facts/expiring", async (request, reply) => {
    if (!requireAnyOperatorWorkspace(request, reply, ["manager_revenue"])) {
      return reply;
    }

    const result = listActiveCommercialFactsQuerySchema.safeParse(request.query);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    const facts = await listPersistedActiveCommercialFacts(dependencies.store, result.data);

    return {
      facts: facts.filter((fact) => fact.freshnessStatus === "expiring_soon" || fact.freshnessStatus === "stale" || fact.freshnessStatus === "expired")
    };
  });

  app.get("/v1/commercial-facts/expiry-reviews", async (request, reply) => {
    if (!requireAnyOperatorWorkspace(request, reply, ["manager_revenue"])) {
      return reply;
    }

    const result = listCommercialFactExpiryReviewsQuerySchema.safeParse(request.query);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    return {
      reviews: await listPersistedCommercialFactExpiryReviews(dependencies.store, result.data)
    };
  });

  app.post<{
    Params: {
      factId: string;
    };
  }>("/v1/commercial-facts/:factId/expiry-review", async (request, reply) => {
    const permission = "manage_commercial_sources";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

    const result = reviewCommercialFactExpiryInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    const review = await reviewPersistedCommercialFactExpiry(dependencies.store, request.params.factId, result.data);

    if (!review) {
      return reply.status(404).send({
        error: "commercial_fact_not_found"
      });
    }

    return review;
  });

  app.get("/v1/commercial-source-refresh-tasks", async (request, reply) => {
    if (!requireAnyOperatorWorkspace(request, reply, ["manager_revenue"])) {
      return reply;
    }

    const result = listCommercialSourceRefreshTasksQuerySchema.safeParse(request.query);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    return {
      tasks: await listPersistedCommercialSourceRefreshTasks(dependencies.store, result.data)
    };
  });

  app.post<{
    Params: {
      taskId: string;
    };
  }>("/v1/commercial-source-refresh-tasks/:taskId/resolve", async (request, reply) => {
    const permission = "manage_commercial_sources";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

    const result = resolveCommercialSourceRefreshTaskInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    const task = await resolvePersistedCommercialSourceRefreshTask(dependencies.store, request.params.taskId, result.data);

    if (!task) {
      return reply.status(404).send({
        error: "commercial_source_refresh_task_not_found"
      });
    }

    return task;
  });

  app.get<{
    Params: {
      projectCode: string;
    };
    Querystring: {
      tenantId?: string;
    };
  }>("/v1/projects/:projectCode/commercial-readiness", async (request, reply) => {
    if (!requireAnyOperatorWorkspace(request, reply, ["manager_revenue"])) {
      return reply;
    }

    return getPersistedProjectCommercialReadinessSummary(dependencies.store, {
      projectCode: request.params.projectCode,
      ...(request.query.tenantId ? { tenantId: request.query.tenantId } : {})
    });
  });

  app.get<{
    Params: {
      caseId: string;
    };
  }>("/v1/cases/:caseId/commercial-evidence", async (request, reply) => {
    if (!requireAnyOperatorWorkspace(request, reply, ["manager_revenue", "qa", "sales"])) {
      return reply;
    }

    const caseDetail = await getPersistedCaseDetail(dependencies.store, request.params.caseId);

    if (!caseDetail) {
      return reply.status(404).send({
        error: "case_not_found"
      });
    }

    return {
      caseId: caseDetail.caseId,
      evidence: caseDetail.agentRuns?.[0]?.commercialFactReferences ?? []
    };
  });

  app.post("/v1/cases/follow-up-plan/bulk", async (request, reply) => {
    const permission = "manage_case_follow_up";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

    const result = manageBulkCaseFollowUpInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const updatedCases = await managePersistedBulkCaseFollowUp(dependencies.store, result.data);

      if (!updatedCases || updatedCases.length === 0) {
        return reply.status(404).send({
          error: "case_not_found"
        });
      }

      return reply.status(200).send({
        updatedCases
      });
    } catch (error) {
      if (error instanceof WorkflowRuleError) {
        return reply.status(409).send({
          error: error.code
        });
      }

      throw error;
    }
  });

  app.get("/v1/governance/summary", async (request, reply) => {
    if (!requireAnyOperatorWorkspace(request, reply, ["manager_revenue", "manager_handover", "qa"])) {
      return reply;
    }

    return getPersistedGovernanceSummary(dependencies.store);
  });

  app.get("/v1/governance/events", async (request, reply) => {
    if (!requireAnyOperatorWorkspace(request, reply, ["manager_revenue", "manager_handover"])) {
      return reply;
    }

    const result = listGovernanceEventsQuerySchema.safeParse(request.query);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    return listPersistedGovernanceEvents(dependencies.store, result.data);
  });

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

  app.post<{
    Params: {
      caseId: string;
    };
  }>("/v1/cases/:caseId/reply-draft/qa-review", async (request, reply) => {
    const permission = "manage_qa_sampling";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

    const result = prepareCaseReplyDraftQaReviewInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const caseDetail = await preparePersistedCaseReplyDraftQaReview(dependencies.store, request.params.caseId, result.data);

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

  app.post<{
    Params: {
      caseId: string;
    };
  }>("/v1/cases/:caseId/replies", async (request, reply) => {
    const permission = "send_case_replies";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

    const result = sendCaseReplyInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const caseDetail = await sendPersistedCaseReply(dependencies.store, request.params.caseId, result.data);

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

  app.post<{
    Params: {
      caseId: string;
    };
  }>("/v1/cases/:caseId/qa-review", async (request, reply) => {
    const permission = "manage_qa_sampling";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

    const result = requestCaseQaReviewInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const caseDetail = await requestPersistedCaseQaReview(dependencies.store, request.params.caseId, result.data);

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
      qaReviewId: string;
    };
  }>("/v1/cases/:caseId/qa-review/:qaReviewId", async (request, reply) => {
    const permission = "manage_qa_reviews";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

    const result = resolveCaseQaReviewInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const caseDetail = await resolvePersistedCaseQaReview(
        dependencies.store,
        request.params.caseId,
        request.params.qaReviewId,
        result.data
      );

      if (!caseDetail) {
        return reply.status(404).send({
          error: "resource_not_found"
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

  app.get<{
    Params: {
      handoverCaseId: string;
    };
  }>("/v1/handover-cases/:handoverCaseId", async (request, reply) => {
    if (!requireOperatorWorkspace(request, reply, "handover")) {
      return reply;
    }

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

    const currentVisit = caseDetail.currentVisit;

    if (!currentVisit) {
      return reply.status(200).send(caseDetail);
    }

    if (!dependencies.calendarClient) {
      const failedCaseDetail = await dependencies.store.recordVisitBooking(caseDetail.caseId, currentVisit.visitId, {
        confirmedAt: null,
        failureCode: "client_credentials_pending",
        failureDetail: "Google Calendar sync code is ready, but client credentials are not configured for this environment yet.",
        provider: "google_calendar",
        providerEventId: null,
        status: "blocked",
        updatedAt: new Date().toISOString()
      });

      return reply.status(200).send(failedCaseDetail ?? caseDetail);
    }

    const scheduledStart = new Date(result.data.scheduledAt);
    const scheduledEnd = new Date(scheduledStart.getTime() + 60 * 60 * 1000).toISOString();
    const bookingResult = await dependencies.calendarClient.createBooking({
      customerName: caseDetail.customerName,
      description: `${caseDetail.customerName} visit for ${caseDetail.projectInterest}`,
      endAt: scheduledEnd,
      location: result.data.location,
      startAt: result.data.scheduledAt,
      title: `${caseDetail.customerName} visit`,
    });

    const bookingCaseDetail = await dependencies.store.recordVisitBooking(caseDetail.caseId, currentVisit.visitId, {
      confirmedAt: bookingResult.kind === "confirmed" ? bookingResult.confirmedAt : null,
      failureCode: bookingResult.kind === "failed" ? bookingResult.code : null,
      failureDetail: bookingResult.kind === "failed" ? bookingResult.detail : null,
      provider: "google_calendar",
      providerEventId: bookingResult.kind === "confirmed" ? bookingResult.providerEventId : null,
      status: bookingResult.kind === "confirmed" ? "confirmed" : "failed",
      updatedAt: new Date().toISOString()
    });

    return reply.status(200).send(bookingCaseDetail ?? caseDetail);
  });

  app.post<{
    Params: {
      caseId: string;
    };
  }>("/v1/cases/:caseId/follow-up-plan", async (request, reply) => {
    const permission = "manage_case_follow_up";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

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
    const permission = "manage_case_automation";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

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
    const permission = "manage_handover_intake";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

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

  app.post<{
    Params: {
      caseId: string;
      documentRequestId: string;
    };
  }>("/v1/cases/:caseId/documents/:documentRequestId/uploads", async (request, reply) => {
    if (!requireOperatorWorkspace(request, reply, "sales")) {
      return reply;
    }

    const fileName = readSingleHeaderValue(request.headers["x-document-file-name"]);
    const mimeType = readSingleHeaderValue(request.headers["x-document-mime-type"]);
    const body = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);

    if (!fileName || !mimeType || body.byteLength === 0) {
      return reply.status(400).send({
        error: "invalid_document_upload"
      });
    }

    if (!isSupportedDocumentMimeType(mimeType)) {
      return reply.status(415).send({
        error: "unsupported_document_mime_type"
      });
    }

    if (body.byteLength > dependencies.documentUploadMaxBytes) {
      return reply.status(413).send({
        error: "document_upload_too_large"
      });
    }

    const caseDetail = await getPersistedCaseDetail(dependencies.store, request.params.caseId);

    if (!caseDetail || !caseDetail.documentRequests.some((documentRequest) => documentRequest.documentRequestId === request.params.documentRequestId)) {
      return reply.status(404).send({
        error: "resource_not_found"
      });
    }

    const storedUpload = await dependencies.documentStorage.saveUpload({
      bytes: body,
      caseId: request.params.caseId,
      documentRequestId: request.params.documentRequestId,
      fileName
    });

    try {
      const updatedCase = await uploadPersistedDocument(dependencies.store, request.params.caseId, request.params.documentRequestId, {
        checksumSha256: storedUpload.checksumSha256,
        documentUploadId: storedUpload.documentUploadId,
        fileName,
        mimeType,
        sizeBytes: storedUpload.sizeBytes,
        storagePath: storedUpload.storagePath,
        uploadedAt: new Date().toISOString()
      });

      if (!updatedCase) {
        await dependencies.documentStorage.deleteUpload(storedUpload.storagePath);

        return reply.status(404).send({
          error: "resource_not_found"
        });
      }

      return reply.status(201).send(updatedCase);
    } catch (error) {
      await dependencies.documentStorage.deleteUpload(storedUpload.storagePath);
      throw error;
    }
  });

  app.get<{
    Params: {
      caseId: string;
      documentRequestId: string;
      uploadId: string;
    };
  }>("/v1/cases/:caseId/documents/:documentRequestId/uploads/:uploadId", async (request, reply) => {
    if (!requireOperatorWorkspace(request, reply, "sales")) {
      return reply;
    }

    const uploadRecord = await dependencies.store.getDocumentUploadRecord(
      request.params.caseId,
      request.params.documentRequestId,
      request.params.uploadId
    );

    if (!uploadRecord) {
      return reply.status(404).send({
        error: "resource_not_found"
      });
    }

    const fileBuffer = await dependencies.documentStorage.readUpload(uploadRecord.storagePath);

    reply.header("content-disposition", buildAttachmentHeader(uploadRecord.fileName));
    reply.header("content-length", String(uploadRecord.sizeBytes));
    reply.type(uploadRecord.mimeType);

    return reply.send(fileBuffer);
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
    const permission = "manage_handover_appointments";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

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
    const permission = "manage_handover_appointments";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

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
    const permission = "manage_handover_customer_updates";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

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
  }>("/v1/handover-cases/:handoverCaseId/customer-updates/:customerUpdateId/qa-review", async (request, reply) => {
    const permission = "manage_qa_reviews";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

    const result = resolveHandoverCustomerUpdateQaReviewInputSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        error: "invalid_request",
        issues: result.error.issues
      });
    }

    try {
      const handoverCase = await resolvePersistedHandoverCustomerUpdateQaReview(
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
    const permission = "manage_handover_customer_updates";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

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
    const permission = "manage_handover_blockers";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

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
    const permission = "manage_handover_blockers";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

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
    const permission = "manage_handover_execution";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

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
    const permission = "manage_handover_governance";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
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
    const permission = "manage_handover_governance";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
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
    const permission = "manage_handover_governance";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
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
    const permission = "manage_handover_governance";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
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
    const permission = "manage_handover_governance";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
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
    const permission = "manage_handover_execution";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

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
    const permission = "manage_handover_milestones";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

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
    const permission = "manage_handover_customer_updates";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

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
    const permission = "manage_handover_tasks";

    if (!requireOperatorPermission(request, reply, permission)) {
      return reply;
    }

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
