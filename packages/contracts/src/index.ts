import { z } from "zod";

export const supportedLocaleSchema = z.enum(["en", "ar"]);
export const operatorRoleSchema = z.enum(["sales_manager", "handover_coordinator", "handover_manager", "qa_reviewer", "admin"]);
export const operatorWorkspaceSchema = z.enum(["sales", "handover", "manager_revenue", "manager_handover", "qa"]);
export const operatorPermissionSchema = z.enum([
  "send_case_replies",
  "manage_case_follow_up",
  "manage_case_automation",
  "manage_handover_intake",
  "manage_handover_tasks",
  "manage_handover_milestones",
  "manage_handover_appointments",
  "manage_handover_customer_updates",
  "manage_handover_blockers",
  "manage_handover_execution",
  "manage_handover_governance",
  "manage_qa_sampling",
  "manage_qa_reviews"
]);
export const operatorSessionPayloadSchema = z.object({
  expiresAt: z.iso.datetime(),
  issuedAt: z.iso.datetime(),
  role: operatorRoleSchema,
  version: z.literal(1)
});
export const leadSourceSchema = z.enum(["website"]);
export const caseStageSchema = z.enum(["new", "qualified", "visit_scheduled", "documents_in_progress", "handover_initiated"]);
export const followUpStatusSchema = z.enum(["on_track", "attention"]);
export const qualificationReadinessSchema = z.enum(["watch", "medium", "high"]);
export const documentRequestTypeSchema = z.enum(["government_id", "proof_of_funds", "employment_letter"]);
export const documentRequestStatusSchema = z.enum(["requested", "under_review", "accepted", "rejected"]);
export const automationStatusSchema = z.enum(["active", "paused"]);
export const caseAutomationHoldReasonSchema = z.enum(["qa_pending_review", "qa_follow_up_required"]);
export const managerInterventionTypeSchema = z.enum(["follow_up_overdue"]);
export const managerInterventionSeveritySchema = z.enum(["warning", "critical"]);
export const managerInterventionStatusSchema = z.enum(["open", "resolved"]);
export const caseQaReviewStatusSchema = z.enum(["pending_review", "approved", "follow_up_required"]);
export const caseQaReviewTriggerSourceSchema = z.enum(["manual_request", "policy_rule"]);
export const caseQaReviewSubjectTypeSchema = z.enum(["case_message", "prepared_reply_draft"]);
export const caseQaPolicySignalSchema = z.enum([
  "exception_request",
  "pricing_or_exception_promise",
  "guaranteed_outcome_promise",
  "frustrated_customer_language",
  "discrimination_risk",
  "legal_escalation_risk"
]);
export const handoverCaseStatusSchema = z.enum([
  "pending_readiness",
  "internal_tasks_open",
  "customer_scheduling_ready",
  "scheduled",
  "in_progress",
  "completed"
]);
export const handoverTaskTypeSchema = z.enum(["unit_readiness_review", "customer_document_pack", "access_preparation"]);
export const handoverTaskStatusSchema = z.enum(["open", "blocked", "complete"]);
export const handoverBlockerTypeSchema = z.enum(["unit_snag", "access_blocker", "document_gap"]);
export const handoverBlockerStatusSchema = z.enum(["open", "in_progress", "resolved"]);
export const handoverBlockerSeveritySchema = z.enum(["warning", "critical"]);
export const handoverMilestoneTypeSchema = z.enum(["readiness_gate", "customer_scheduling_window", "handover_appointment_hold"]);
export const handoverMilestoneStatusSchema = z.enum(["planned", "blocked", "ready"]);
export const handoverCustomerUpdateTypeSchema = z.enum(["readiness_update", "scheduling_invite", "appointment_confirmation"]);
export const handoverCustomerUpdateStatusSchema = z.enum([
  "blocked",
  "ready_for_approval",
  "approved",
  "prepared_for_delivery",
  "ready_to_dispatch"
]);
export const handoverCustomerUpdateQaReviewStatusSchema = z.enum([
  "not_required",
  "pending_review",
  "approved",
  "follow_up_required"
]);
export const handoverCustomerUpdateQaPolicySignalSchema = z.enum([
  "possession_date_promise",
  "pricing_or_exception_promise",
  "legal_claim_risk",
  "discrimination_risk"
]);
export const governanceReviewKindSchema = z.enum(["case_message", "handover_customer_update"]);
export const governanceReviewEventActionSchema = z.enum(["opened", "resolved"]);
export const governanceEventStatusSchema = z.enum(["pending_review", "approved", "follow_up_required"]);
export const governancePolicySignalSchema = z.union([caseQaPolicySignalSchema, handoverCustomerUpdateQaPolicySignalSchema]);
export const governanceSubjectTypeSchema = z.union([caseQaReviewSubjectTypeSchema, handoverCustomerUpdateTypeSchema]);
export const handoverAppointmentStatusSchema = z.enum(["planned", "internally_confirmed"]);
export const handoverReviewOutcomeSchema = z.enum(["accepted", "follow_up_required"]);
export const handoverPostCompletionFollowUpStatusSchema = z.enum(["open", "resolved"]);
export const handoverArchiveOutcomeSchema = z.enum(["ready_to_archive", "hold_for_review"]);
export const handoverArchiveStatusSchema = z.enum(["ready", "held", "archived"]);
export const handoverClosureStateSchema = z.enum(["closure_review_required", "aftercare_open", "held", "ready_to_archive", "archived"]);

export const createWebsiteLeadInputSchema = z.object({
  budget: z.string().trim().min(2).max(120).optional(),
  customerName: z.string().trim().min(2).max(120),
  email: z.email(),
  message: z.string().trim().min(10).max(2000),
  phone: z.string().trim().min(7).max(40).optional(),
  preferredLocale: supportedLocaleSchema,
  projectInterest: z.string().trim().min(2).max(160)
});

export const qualifyCaseInputSchema = z.object({
  budgetBand: z.string().trim().min(2).max(120),
  intentSummary: z.string().trim().min(10).max(240),
  moveInTimeline: z.string().trim().min(2).max(120),
  readiness: qualificationReadinessSchema
});

export const scheduleVisitInputSchema = z.object({
  location: z.string().trim().min(2).max(180),
  scheduledAt: z.iso.datetime()
});

export const updateDocumentRequestInputSchema = z.object({
  status: documentRequestStatusSchema
});

export const manageCaseFollowUpInputSchema = z.object({
  nextAction: z.string().trim().min(4).max(200),
  nextActionDueAt: z.iso.datetime(),
  ownerName: z.string().trim().min(2).max(120).optional()
});

export const createHandoverIntakeInputSchema = z.object({
  ownerName: z.string().trim().min(2).max(120).optional(),
  readinessSummary: z.string().trim().min(10).max(240)
});

export const updateAutomationStatusInputSchema = z.object({
  status: automationStatusSchema
});

export const requestCaseQaReviewInputSchema = z.object({
  requestedByName: z.string().trim().min(2).max(120).optional(),
  sampleSummary: z.string().trim().min(10).max(280)
});

export const prepareCaseReplyDraftQaReviewInputSchema = z.object({
  draftMessage: z.string().trim().min(10).max(2000),
  requestedByName: z.string().trim().min(2).max(120).optional()
});

export const sendCaseReplyInputSchema = z.object({
  message: z.string().trim().min(10).max(2000),
  nextAction: z.string().trim().min(4).max(200),
  nextActionDueAt: z.iso.datetime(),
  sentByName: z.string().trim().min(2).max(120).optional()
});

export const resolveCaseQaReviewInputSchema = z.object({
  reviewSummary: z.string().trim().min(10).max(280),
  reviewerName: z.string().trim().min(2).max(120).optional(),
  status: z.enum(["approved", "follow_up_required"])
});

export const updateHandoverTaskStatusInputSchema = z.object({
  status: handoverTaskStatusSchema
});

export const createHandoverBlockerInputSchema = z.object({
  dueAt: z.iso.datetime(),
  ownerName: z.string().trim().min(2).max(120).optional(),
  severity: handoverBlockerSeveritySchema,
  status: z.literal("open"),
  summary: z.string().trim().min(10).max(240),
  type: handoverBlockerTypeSchema
});

export const updateHandoverBlockerInputSchema = z.object({
  dueAt: z.iso.datetime(),
  ownerName: z.string().trim().min(2).max(120).optional(),
  severity: handoverBlockerSeveritySchema,
  status: handoverBlockerStatusSchema,
  summary: z.string().trim().min(10).max(240)
});

export const updateHandoverMilestoneInputSchema = z.object({
  ownerName: z.string().trim().min(2).max(120).optional(),
  status: handoverMilestoneStatusSchema,
  targetAt: z.iso.datetime()
});

export const approveHandoverCustomerUpdateInputSchema = z.object({
  status: z.literal("approved")
});

export const prepareHandoverCustomerUpdateDeliveryInputSchema = z.object({
  deliverySummary: z.string().trim().min(10).max(280),
  status: z.literal("prepared_for_delivery")
});

export const markHandoverCustomerUpdateDispatchReadyInputSchema = z.object({
  status: z.literal("ready_to_dispatch")
});

export const resolveHandoverCustomerUpdateQaReviewInputSchema = z.object({
  reviewSummary: z.string().trim().min(10).max(280),
  reviewerName: z.string().trim().min(2).max(120).optional(),
  status: z.enum(["approved", "follow_up_required"])
});

export const planHandoverAppointmentInputSchema = z.object({
  coordinatorName: z.string().trim().min(2).max(120).optional(),
  location: z.string().trim().min(2).max(180),
  scheduledAt: z.iso.datetime()
});

export const confirmHandoverAppointmentInputSchema = z.object({
  status: z.literal("internally_confirmed")
});

export const startHandoverExecutionInputSchema = z.object({
  status: z.literal("in_progress")
});

export const completeHandoverInputSchema = z.object({
  completionSummary: z.string().trim().min(10).max(280),
  status: z.literal("completed")
});

export const saveHandoverReviewInputSchema = z.object({
  outcome: handoverReviewOutcomeSchema,
  summary: z.string().trim().min(10).max(280)
});

export const createHandoverPostCompletionFollowUpInputSchema = z.object({
  dueAt: z.iso.datetime(),
  ownerName: z.string().trim().min(2).max(120).optional(),
  status: z.literal("open"),
  summary: z.string().trim().min(10).max(240)
});

export const resolveHandoverPostCompletionFollowUpInputSchema = z.object({
  resolutionSummary: z.string().trim().min(10).max(280),
  status: z.literal("resolved")
});

export const saveHandoverArchiveReviewInputSchema = z.object({
  outcome: handoverArchiveOutcomeSchema,
  summary: z.string().trim().min(10).max(280)
});

export const updateHandoverArchiveStatusInputSchema = z.object({
  status: handoverArchiveStatusSchema,
  summary: z.string().trim().min(10).max(280)
});

export const insufficientRoleErrorSchema = z.object({
  error: z.literal("insufficient_role"),
  permission: operatorPermissionSchema,
  requiredRoles: z.array(operatorRoleSchema).min(1)
});
export const insufficientWorkspaceErrorSchema = z.object({
  error: z.literal("insufficient_workspace"),
  requiredWorkspaces: z.array(operatorWorkspaceSchema).min(1),
  workspace: operatorWorkspaceSchema
});

export const persistedQualificationSnapshotSchema = z.object({
  budgetBand: z.string(),
  intentSummary: z.string(),
  moveInTimeline: z.string(),
  readiness: qualificationReadinessSchema,
  updatedAt: z.iso.datetime()
});

export const persistedVisitSchema = z.object({
  createdAt: z.iso.datetime(),
  location: z.string(),
  scheduledAt: z.iso.datetime(),
  visitId: z.uuid()
});

export const persistedDocumentRequestSchema = z.object({
  createdAt: z.iso.datetime(),
  documentRequestId: z.uuid(),
  status: documentRequestStatusSchema,
  type: documentRequestTypeSchema,
  updatedAt: z.iso.datetime()
});

export const persistedManagerInterventionSchema = z.object({
  createdAt: z.iso.datetime(),
  interventionId: z.uuid(),
  resolutionNote: z.string().nullable(),
  resolvedAt: z.iso.datetime().nullable(),
  severity: managerInterventionSeveritySchema,
  status: managerInterventionStatusSchema,
  summary: z.string(),
  type: managerInterventionTypeSchema
});

export const persistedCaseQaReviewSchema = z.object({
  createdAt: z.iso.datetime(),
  draftMessage: z.string().nullable(),
  policySignals: z.array(caseQaPolicySignalSchema),
  qaReviewId: z.uuid(),
  requestedByName: z.string(),
  reviewSummary: z.string().nullable(),
  reviewedAt: z.iso.datetime().nullable(),
  reviewerName: z.string().nullable(),
  sampleSummary: z.string(),
  status: caseQaReviewStatusSchema,
  subjectType: caseQaReviewSubjectTypeSchema,
  triggerEvidence: z.array(z.string()),
  triggerSource: caseQaReviewTriggerSourceSchema,
  updatedAt: z.iso.datetime()
});

export const persistedHandoverTaskSchema = z.object({
  createdAt: z.iso.datetime(),
  dueAt: z.iso.datetime(),
  ownerName: z.string(),
  status: handoverTaskStatusSchema,
  taskId: z.uuid(),
  type: handoverTaskTypeSchema,
  updatedAt: z.iso.datetime()
});

export const persistedHandoverBlockerSchema = z.object({
  blockerId: z.uuid(),
  createdAt: z.iso.datetime(),
  dueAt: z.iso.datetime(),
  ownerName: z.string(),
  severity: handoverBlockerSeveritySchema,
  status: handoverBlockerStatusSchema,
  summary: z.string(),
  type: handoverBlockerTypeSchema,
  updatedAt: z.iso.datetime()
});

export const persistedHandoverMilestoneSchema = z.object({
  createdAt: z.iso.datetime(),
  milestoneId: z.uuid(),
  ownerName: z.string(),
  status: handoverMilestoneStatusSchema,
  targetAt: z.iso.datetime(),
  type: handoverMilestoneTypeSchema,
  updatedAt: z.iso.datetime()
});

export const persistedHandoverCustomerUpdateSchema = z.object({
  createdAt: z.iso.datetime(),
  customerUpdateId: z.uuid(),
  deliveryPreparedAt: z.iso.datetime().nullable(),
  deliverySummary: z.string().nullable(),
  dispatchReadyAt: z.iso.datetime().nullable(),
  qaPolicySignals: z.array(handoverCustomerUpdateQaPolicySignalSchema),
  qaReviewSampleSummary: z.string().nullable(),
  qaReviewStatus: handoverCustomerUpdateQaReviewStatusSchema,
  qaReviewSummary: z.string().nullable(),
  qaReviewedAt: z.iso.datetime().nullable(),
  qaReviewerName: z.string().nullable(),
  qaTriggerEvidence: z.array(z.string()),
  status: handoverCustomerUpdateStatusSchema,
  type: handoverCustomerUpdateTypeSchema,
  updatedAt: z.iso.datetime()
});

export const persistedCurrentHandoverCustomerUpdateQaReviewSchema = z.object({
  customerUpdateId: z.uuid(),
  deliverySummary: z.string().nullable(),
  handoverCaseId: z.uuid(),
  policySignals: z.array(handoverCustomerUpdateQaPolicySignalSchema),
  reviewSampleSummary: z.string(),
  reviewStatus: handoverCustomerUpdateQaReviewStatusSchema,
  reviewSummary: z.string().nullable(),
  reviewedAt: z.iso.datetime().nullable(),
  reviewerName: z.string().nullable(),
  triggerEvidence: z.array(z.string()),
  type: handoverCustomerUpdateTypeSchema,
  updatedAt: z.iso.datetime()
});

export const persistedHandoverAppointmentSchema = z.object({
  appointmentId: z.uuid(),
  coordinatorName: z.string(),
  createdAt: z.iso.datetime(),
  location: z.string(),
  scheduledAt: z.iso.datetime(),
  status: handoverAppointmentStatusSchema,
  updatedAt: z.iso.datetime()
});

export const persistedHandoverReviewSchema = z.object({
  createdAt: z.iso.datetime(),
  outcome: handoverReviewOutcomeSchema,
  reviewId: z.uuid(),
  summary: z.string(),
  updatedAt: z.iso.datetime()
});

export const persistedHandoverPostCompletionFollowUpSchema = z.object({
  createdAt: z.iso.datetime(),
  dueAt: z.iso.datetime(),
  followUpId: z.uuid(),
  ownerName: z.string(),
  resolutionSummary: z.string().nullable(),
  resolvedAt: z.iso.datetime().nullable(),
  status: handoverPostCompletionFollowUpStatusSchema,
  summary: z.string(),
  updatedAt: z.iso.datetime()
});

export const persistedHandoverArchiveReviewSchema = z.object({
  createdAt: z.iso.datetime(),
  outcome: handoverArchiveOutcomeSchema,
  reviewId: z.uuid(),
  summary: z.string(),
  updatedAt: z.iso.datetime()
});

export const persistedHandoverArchiveStatusSchema = z.object({
  createdAt: z.iso.datetime(),
  status: handoverArchiveStatusSchema,
  statusId: z.uuid(),
  summary: z.string(),
  updatedAt: z.iso.datetime()
});

export const persistedLinkedHandoverCaseSchema = z.object({
  createdAt: z.iso.datetime(),
  handoverCaseId: z.uuid(),
  ownerName: z.string(),
  status: handoverCaseStatusSchema,
  updatedAt: z.iso.datetime()
});

export const persistedHandoverClosureSummarySchema = z.object({
  handoverCaseId: z.uuid(),
  status: handoverClosureStateSchema,
  updatedAt: z.iso.datetime()
});

export const persistedAuditEventSchema = z.object({
  createdAt: z.iso.datetime(),
  eventType: z.string(),
  payload: z.record(z.string(), z.unknown())
});

export const persistedGovernanceCurrentOpenSummarySchema = z.object({
  caseMessageCount: z.number().int().min(0),
  followUpRequiredCount: z.number().int().min(0),
  handoverCustomerUpdateCount: z.number().int().min(0),
  pendingCount: z.number().int().min(0),
  stalePendingCount: z.number().int().min(0),
  totalCount: z.number().int().min(0)
});

export const persistedGovernanceOpenedSummarySchema = z.object({
  caseMessageCount: z.number().int().min(0),
  handoverCustomerUpdateCount: z.number().int().min(0),
  manualCaseMessageCount: z.number().int().min(0),
  policyTriggeredCaseMessageCount: z.number().int().min(0),
  totalCount: z.number().int().min(0)
});

export const persistedGovernanceResolvedSummarySchema = z.object({
  approvedCount: z.number().int().min(0),
  caseMessageCount: z.number().int().min(0),
  followUpRequiredCount: z.number().int().min(0),
  handoverCustomerUpdateCount: z.number().int().min(0),
  totalCount: z.number().int().min(0)
});

export const persistedGovernancePolicySignalCountSchema = z.object({
  count: z.number().int().min(0),
  kind: governanceReviewKindSchema,
  signal: governancePolicySignalSchema
});

export const persistedGovernanceDailyActivitySchema = z.object({
  date: z.string(),
  openedCaseMessageCount: z.number().int().min(0),
  openedCount: z.number().int().min(0),
  openedHandoverCustomerUpdateCount: z.number().int().min(0),
  resolvedApprovedCount: z.number().int().min(0),
  resolvedCaseMessageCount: z.number().int().min(0),
  resolvedCount: z.number().int().min(0),
  resolvedFollowUpRequiredCount: z.number().int().min(0),
  resolvedHandoverCustomerUpdateCount: z.number().int().min(0)
});

export const persistedGovernanceRecentEventSchema = z.object({
  action: governanceReviewEventActionSchema,
  actorName: z.string().nullable(),
  caseId: z.uuid(),
  createdAt: z.iso.datetime(),
  customerName: z.string(),
  handoverCaseId: z.uuid().nullable(),
  kind: governanceReviewKindSchema,
  policySignals: z.array(governancePolicySignalSchema),
  status: z.union([caseQaReviewStatusSchema, handoverCustomerUpdateQaReviewStatusSchema]),
  subjectType: z.string().nullable(),
  triggerSource: caseQaReviewTriggerSourceSchema.nullable()
});

export const listGovernanceEventsQuerySchema = z.object({
  action: governanceReviewEventActionSchema.optional(),
  kind: governanceReviewKindSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  status: governanceEventStatusSchema.optional(),
  subjectType: governanceSubjectTypeSchema.optional(),
  triggerSource: caseQaReviewTriggerSourceSchema.optional(),
  windowDays: z.coerce.number().int().min(1).max(90).default(30)
});

export const persistedGovernanceEventRecordSchema = z.object({
  action: governanceReviewEventActionSchema,
  actorName: z.string().nullable(),
  caseId: z.uuid(),
  createdAt: z.iso.datetime(),
  customerName: z.string(),
  draftMessage: z.string().nullable(),
  handoverCaseId: z.uuid().nullable(),
  kind: governanceReviewKindSchema,
  policySignals: z.array(governancePolicySignalSchema),
  reviewSummary: z.string().nullable(),
  sampleSummary: z.string().nullable(),
  status: governanceEventStatusSchema,
  subjectType: governanceSubjectTypeSchema.nullable(),
  triggerEvidence: z.array(z.string()),
  triggerSource: caseQaReviewTriggerSourceSchema.nullable()
});

export const persistedGovernanceEventListSchema = z.object({
  generatedAt: z.iso.datetime(),
  items: z.array(persistedGovernanceEventRecordSchema),
  totalCount: z.number().int().min(0),
  windowEnd: z.iso.datetime(),
  windowStart: z.iso.datetime()
});

export const persistedGovernanceSummarySchema = z.object({
  currentOpenItems: persistedGovernanceCurrentOpenSummarySchema,
  dailyActivity: z.array(persistedGovernanceDailyActivitySchema),
  generatedAt: z.iso.datetime(),
  openedItems: persistedGovernanceOpenedSummarySchema,
  recentEvents: z.array(persistedGovernanceRecentEventSchema),
  resolvedItems: persistedGovernanceResolvedSummarySchema,
  topPolicySignals: z.array(persistedGovernancePolicySignalCountSchema),
  windowEnd: z.iso.datetime(),
  windowStart: z.iso.datetime()
});

export const persistedCaseSummarySchema = z.object({
  automationHoldReason: caseAutomationHoldReasonSchema.nullable(),
  automationStatus: automationStatusSchema,
  caseId: z.uuid(),
  createdAt: z.iso.datetime(),
  currentHandoverCustomerUpdateQaReview: persistedCurrentHandoverCustomerUpdateQaReviewSchema.nullable(),
  currentQaReview: persistedCaseQaReviewSchema.nullable(),
  customerName: z.string(),
  followUpStatus: followUpStatusSchema,
  handoverCase: persistedLinkedHandoverCaseSchema.nullable(),
  handoverClosure: persistedHandoverClosureSummarySchema.nullable(),
  nextAction: z.string(),
  nextActionDueAt: z.iso.datetime(),
  openInterventionsCount: z.number().int().min(0),
  ownerName: z.string(),
  preferredLocale: supportedLocaleSchema,
  projectInterest: z.string(),
  source: leadSourceSchema,
  stage: caseStageSchema,
  updatedAt: z.iso.datetime()
});

export const persistedCaseDetailSchema = persistedCaseSummarySchema.extend({
  auditEvents: z.array(persistedAuditEventSchema),
  budget: z.string().nullable(),
  currentVisit: persistedVisitSchema.nullable(),
  documentRequests: z.array(persistedDocumentRequestSchema),
  email: z.email(),
  handoverCase: persistedLinkedHandoverCaseSchema.nullable(),
  managerInterventions: z.array(persistedManagerInterventionSchema),
  message: z.string(),
  phone: z.string().nullable(),
  qaReviews: z.array(persistedCaseQaReviewSchema),
  qualificationSnapshot: persistedQualificationSnapshotSchema.nullable()
});

export const persistedHandoverCaseDetailSchema = persistedLinkedHandoverCaseSchema.extend({
  archiveReview: persistedHandoverArchiveReviewSchema.nullable(),
  archiveStatus: persistedHandoverArchiveStatusSchema.nullable(),
  auditEvents: z.array(persistedAuditEventSchema),
  appointment: persistedHandoverAppointmentSchema.nullable(),
  blockers: z.array(persistedHandoverBlockerSchema),
  caseId: z.uuid(),
  completedAt: z.iso.datetime().nullable(),
  completionSummary: z.string().nullable(),
  customerUpdates: z.array(persistedHandoverCustomerUpdateSchema),
  customerName: z.string(),
  executionStartedAt: z.iso.datetime().nullable(),
  milestones: z.array(persistedHandoverMilestoneSchema),
  postCompletionFollowUp: persistedHandoverPostCompletionFollowUpSchema.nullable(),
  preferredLocale: supportedLocaleSchema,
  projectInterest: z.string(),
  readinessSummary: z.string(),
  review: persistedHandoverReviewSchema.nullable(),
  tasks: z.array(persistedHandoverTaskSchema)
});

export const createWebsiteLeadResultSchema = persistedCaseSummarySchema.extend({
  leadId: z.uuid()
});

export type ApproveHandoverCustomerUpdateInput = z.infer<typeof approveHandoverCustomerUpdateInputSchema>;
export type AutomationStatus = z.infer<typeof automationStatusSchema>;
export type CaseAutomationHoldReason = z.infer<typeof caseAutomationHoldReasonSchema>;
export type CaseStage = z.infer<typeof caseStageSchema>;
export type CaseQaReviewStatus = z.infer<typeof caseQaReviewStatusSchema>;
export type CaseQaPolicySignal = z.infer<typeof caseQaPolicySignalSchema>;
export type CaseQaReviewTriggerSource = z.infer<typeof caseQaReviewTriggerSourceSchema>;
export type CaseQaReviewSubjectType = z.infer<typeof caseQaReviewSubjectTypeSchema>;
export type CompleteHandoverInput = z.infer<typeof completeHandoverInputSchema>;
export type ConfirmHandoverAppointmentInput = z.infer<typeof confirmHandoverAppointmentInputSchema>;
export type HandoverClosureState = z.infer<typeof handoverClosureStateSchema>;
export type HandoverArchiveOutcome = z.infer<typeof handoverArchiveOutcomeSchema>;
export type HandoverArchiveStatus = z.infer<typeof handoverArchiveStatusSchema>;
export type CreateHandoverPostCompletionFollowUpInput = z.infer<typeof createHandoverPostCompletionFollowUpInputSchema>;
export type CreateHandoverBlockerInput = z.infer<typeof createHandoverBlockerInputSchema>;
export type CreateHandoverIntakeInput = z.infer<typeof createHandoverIntakeInputSchema>;
export type CreateWebsiteLeadInput = z.infer<typeof createWebsiteLeadInputSchema>;
export type CreateWebsiteLeadResult = z.infer<typeof createWebsiteLeadResultSchema>;
export type DocumentRequestStatus = z.infer<typeof documentRequestStatusSchema>;
export type DocumentRequestType = z.infer<typeof documentRequestTypeSchema>;
export type FollowUpStatus = z.infer<typeof followUpStatusSchema>;
export type GovernancePolicySignal = z.infer<typeof governancePolicySignalSchema>;
export type GovernanceEventStatus = z.infer<typeof governanceEventStatusSchema>;
export type GovernanceReviewEventAction = z.infer<typeof governanceReviewEventActionSchema>;
export type GovernanceReviewKind = z.infer<typeof governanceReviewKindSchema>;
export type GovernanceSubjectType = z.infer<typeof governanceSubjectTypeSchema>;
export type HandoverAppointmentStatus = z.infer<typeof handoverAppointmentStatusSchema>;
export type HandoverBlockerSeverity = z.infer<typeof handoverBlockerSeveritySchema>;
export type HandoverBlockerStatus = z.infer<typeof handoverBlockerStatusSchema>;
export type HandoverBlockerType = z.infer<typeof handoverBlockerTypeSchema>;
export type HandoverCaseStatus = z.infer<typeof handoverCaseStatusSchema>;
export type HandoverCustomerUpdateStatus = z.infer<typeof handoverCustomerUpdateStatusSchema>;
export type HandoverCustomerUpdateQaPolicySignal = z.infer<typeof handoverCustomerUpdateQaPolicySignalSchema>;
export type HandoverCustomerUpdateQaReviewStatus = z.infer<typeof handoverCustomerUpdateQaReviewStatusSchema>;
export type HandoverCustomerUpdateType = z.infer<typeof handoverCustomerUpdateTypeSchema>;
export type HandoverMilestoneStatus = z.infer<typeof handoverMilestoneStatusSchema>;
export type HandoverMilestoneType = z.infer<typeof handoverMilestoneTypeSchema>;
export type HandoverPostCompletionFollowUpStatus = z.infer<typeof handoverPostCompletionFollowUpStatusSchema>;
export type HandoverReviewOutcome = z.infer<typeof handoverReviewOutcomeSchema>;
export type HandoverTaskStatus = z.infer<typeof handoverTaskStatusSchema>;
export type HandoverTaskType = z.infer<typeof handoverTaskTypeSchema>;
export type ManageCaseFollowUpInput = z.infer<typeof manageCaseFollowUpInputSchema>;
export type MarkHandoverCustomerUpdateDispatchReadyInput = z.infer<typeof markHandoverCustomerUpdateDispatchReadyInputSchema>;
export type ManagerInterventionSeverity = z.infer<typeof managerInterventionSeveritySchema>;
export type ManagerInterventionStatus = z.infer<typeof managerInterventionStatusSchema>;
export type ManagerInterventionType = z.infer<typeof managerInterventionTypeSchema>;
export type OperatorPermission = z.infer<typeof operatorPermissionSchema>;
export type OperatorRole = z.infer<typeof operatorRoleSchema>;
export type OperatorSessionPayload = z.infer<typeof operatorSessionPayloadSchema>;
export type OperatorWorkspace = z.infer<typeof operatorWorkspaceSchema>;
export type PrepareCaseReplyDraftQaReviewInput = z.infer<typeof prepareCaseReplyDraftQaReviewInputSchema>;
export type ListGovernanceEventsQuery = z.infer<typeof listGovernanceEventsQuerySchema>;
export type PersistedCaseDetail = z.infer<typeof persistedCaseDetailSchema>;
export type PersistedCaseQaReview = z.infer<typeof persistedCaseQaReviewSchema>;
export type PersistedCaseSummary = z.infer<typeof persistedCaseSummarySchema>;
export type PersistedCurrentHandoverCustomerUpdateQaReview = z.infer<typeof persistedCurrentHandoverCustomerUpdateQaReviewSchema>;
export type PersistedDocumentRequest = z.infer<typeof persistedDocumentRequestSchema>;
export type PersistedGovernanceDailyActivity = z.infer<typeof persistedGovernanceDailyActivitySchema>;
export type PersistedGovernanceEventList = z.infer<typeof persistedGovernanceEventListSchema>;
export type PersistedGovernanceEventRecord = z.infer<typeof persistedGovernanceEventRecordSchema>;
export type PersistedGovernancePolicySignalCount = z.infer<typeof persistedGovernancePolicySignalCountSchema>;
export type PersistedGovernanceRecentEvent = z.infer<typeof persistedGovernanceRecentEventSchema>;
export type PersistedGovernanceSummary = z.infer<typeof persistedGovernanceSummarySchema>;
export type PersistedHandoverAppointment = z.infer<typeof persistedHandoverAppointmentSchema>;
export type PersistedHandoverArchiveReview = z.infer<typeof persistedHandoverArchiveReviewSchema>;
export type PersistedHandoverArchiveStatus = z.infer<typeof persistedHandoverArchiveStatusSchema>;
export type PersistedHandoverBlocker = z.infer<typeof persistedHandoverBlockerSchema>;
export type PersistedHandoverCaseDetail = z.infer<typeof persistedHandoverCaseDetailSchema>;
export type PersistedHandoverClosureSummary = z.infer<typeof persistedHandoverClosureSummarySchema>;
export type PersistedHandoverCustomerUpdate = z.infer<typeof persistedHandoverCustomerUpdateSchema>;
export type PersistedHandoverMilestone = z.infer<typeof persistedHandoverMilestoneSchema>;
export type PersistedHandoverPostCompletionFollowUp = z.infer<typeof persistedHandoverPostCompletionFollowUpSchema>;
export type PersistedHandoverReview = z.infer<typeof persistedHandoverReviewSchema>;
export type PersistedHandoverTask = z.infer<typeof persistedHandoverTaskSchema>;
export type PersistedLinkedHandoverCase = z.infer<typeof persistedLinkedHandoverCaseSchema>;
export type PersistedManagerIntervention = z.infer<typeof persistedManagerInterventionSchema>;
export type PersistedQualificationSnapshot = z.infer<typeof persistedQualificationSnapshotSchema>;
export type PersistedVisit = z.infer<typeof persistedVisitSchema>;
export type PlanHandoverAppointmentInput = z.infer<typeof planHandoverAppointmentInputSchema>;
export type PrepareHandoverCustomerUpdateDeliveryInput = z.infer<typeof prepareHandoverCustomerUpdateDeliveryInputSchema>;
export type QualificationReadiness = z.infer<typeof qualificationReadinessSchema>;
export type QualifyCaseInput = z.infer<typeof qualifyCaseInputSchema>;
export type RequestCaseQaReviewInput = z.infer<typeof requestCaseQaReviewInputSchema>;
export type ResolveHandoverPostCompletionFollowUpInput = z.infer<typeof resolveHandoverPostCompletionFollowUpInputSchema>;
export type ResolveCaseQaReviewInput = z.infer<typeof resolveCaseQaReviewInputSchema>;
export type ResolveHandoverCustomerUpdateQaReviewInput = z.infer<typeof resolveHandoverCustomerUpdateQaReviewInputSchema>;
export type SaveHandoverArchiveReviewInput = z.infer<typeof saveHandoverArchiveReviewInputSchema>;
export type SaveHandoverReviewInput = z.infer<typeof saveHandoverReviewInputSchema>;
export type ScheduleVisitInput = z.infer<typeof scheduleVisitInputSchema>;
export type SendCaseReplyInput = z.infer<typeof sendCaseReplyInputSchema>;
export type StartHandoverExecutionInput = z.infer<typeof startHandoverExecutionInputSchema>;
export type SupportedLocale = z.infer<typeof supportedLocaleSchema>;
export type UpdateHandoverMilestoneInput = z.infer<typeof updateHandoverMilestoneInputSchema>;
export type UpdateAutomationStatusInput = z.infer<typeof updateAutomationStatusInputSchema>;
export type UpdateDocumentRequestInput = z.infer<typeof updateDocumentRequestInputSchema>;
export type UpdateHandoverArchiveStatusInput = z.infer<typeof updateHandoverArchiveStatusInputSchema>;
export type UpdateHandoverBlockerInput = z.infer<typeof updateHandoverBlockerInputSchema>;
export type UpdateHandoverTaskStatusInput = z.infer<typeof updateHandoverTaskStatusInputSchema>;
export type InsufficientRoleError = z.infer<typeof insufficientRoleErrorSchema>;
export type InsufficientWorkspaceError = z.infer<typeof insufficientWorkspaceErrorSchema>;

export const operatorSessionCookieName = "operator_session";
export const operatorSessionHeaderName = "x-operator-session";
export const localOperatorSessionSecretEnvironmentKey = "LOCAL_OPERATOR_SESSION_SECRET";
export const localOperatorSessionDurationSeconds = 60 * 60 * 8;

const operatorWorkspaceAccess = {
  admin: ["sales", "handover", "manager_revenue", "manager_handover", "qa"],
  handover_coordinator: ["handover"],
  handover_manager: ["sales", "handover", "manager_handover"],
  qa_reviewer: ["qa"],
  sales_manager: ["sales", "manager_revenue"]
} as const satisfies Record<OperatorRole, readonly OperatorWorkspace[]>;

const operatorPermissionRequirements = {
  send_case_replies: ["sales_manager", "handover_manager", "admin"],
  manage_case_automation: ["sales_manager", "handover_manager", "admin"],
  manage_case_follow_up: ["sales_manager", "handover_manager", "admin"],
  manage_handover_intake: ["handover_manager", "admin"],
  manage_handover_appointments: ["handover_coordinator", "handover_manager", "admin"],
  manage_handover_blockers: ["handover_coordinator", "handover_manager", "admin"],
  manage_handover_customer_updates: ["handover_manager", "admin"],
  manage_handover_execution: ["handover_manager", "admin"],
  manage_handover_milestones: ["handover_coordinator", "handover_manager", "admin"],
  manage_handover_tasks: ["handover_coordinator", "handover_manager", "admin"],
  manage_handover_governance: ["handover_manager", "admin"],
  manage_qa_reviews: ["qa_reviewer", "admin"],
  manage_qa_sampling: ["sales_manager", "handover_manager", "admin"]
} as const satisfies Record<OperatorPermission, readonly OperatorRole[]>;

export function getAccessibleOperatorWorkspaces(operatorRole: OperatorRole): OperatorWorkspace[] {
  return [...operatorWorkspaceAccess[operatorRole]];
}

export function canOperatorRoleAccessWorkspace(workspace: OperatorWorkspace, operatorRole: OperatorRole) {
  return getAccessibleOperatorWorkspaces(operatorRole).includes(workspace);
}

export function getRequiredOperatorRoles(permission: OperatorPermission): OperatorRole[] {
  return [...operatorPermissionRequirements[permission]];
}

export function canOperatorRolePerform(permission: OperatorPermission, operatorRole: OperatorRole) {
  return getRequiredOperatorRoles(permission).includes(operatorRole);
}
