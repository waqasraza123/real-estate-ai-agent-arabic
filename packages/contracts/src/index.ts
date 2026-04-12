import { z } from "zod";

export const supportedLocaleSchema = z.enum(["en", "ar"]);
export const leadSourceSchema = z.enum(["website"]);
export const caseStageSchema = z.enum(["new", "qualified", "visit_scheduled", "documents_in_progress", "handover_initiated"]);
export const followUpStatusSchema = z.enum(["on_track", "attention"]);
export const qualificationReadinessSchema = z.enum(["watch", "medium", "high"]);
export const documentRequestTypeSchema = z.enum(["government_id", "proof_of_funds", "employment_letter"]);
export const documentRequestStatusSchema = z.enum(["requested", "under_review", "accepted", "rejected"]);
export const automationStatusSchema = z.enum(["active", "paused"]);
export const managerInterventionTypeSchema = z.enum(["follow_up_overdue"]);
export const managerInterventionSeveritySchema = z.enum(["warning", "critical"]);
export const managerInterventionStatusSchema = z.enum(["open", "resolved"]);
export const handoverCaseStatusSchema = z.enum(["pending_readiness", "internal_tasks_open", "customer_scheduling_ready"]);
export const handoverTaskTypeSchema = z.enum(["unit_readiness_review", "customer_document_pack", "access_preparation"]);
export const handoverTaskStatusSchema = z.enum(["open", "blocked", "complete"]);
export const handoverMilestoneTypeSchema = z.enum(["readiness_gate", "customer_scheduling_window", "handover_appointment_hold"]);
export const handoverMilestoneStatusSchema = z.enum(["planned", "blocked", "ready"]);
export const handoverCustomerUpdateTypeSchema = z.enum(["readiness_update", "scheduling_invite", "appointment_confirmation"]);
export const handoverCustomerUpdateStatusSchema = z.enum(["blocked", "ready_for_approval", "approved"]);

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

export const updateHandoverTaskStatusInputSchema = z.object({
  status: handoverTaskStatusSchema
});

export const updateHandoverMilestoneInputSchema = z.object({
  ownerName: z.string().trim().min(2).max(120).optional(),
  status: handoverMilestoneStatusSchema,
  targetAt: z.iso.datetime()
});

export const approveHandoverCustomerUpdateInputSchema = z.object({
  status: z.literal("approved")
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

export const persistedHandoverTaskSchema = z.object({
  createdAt: z.iso.datetime(),
  dueAt: z.iso.datetime(),
  ownerName: z.string(),
  status: handoverTaskStatusSchema,
  taskId: z.uuid(),
  type: handoverTaskTypeSchema,
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
  status: handoverCustomerUpdateStatusSchema,
  type: handoverCustomerUpdateTypeSchema,
  updatedAt: z.iso.datetime()
});

export const persistedLinkedHandoverCaseSchema = z.object({
  createdAt: z.iso.datetime(),
  handoverCaseId: z.uuid(),
  ownerName: z.string(),
  status: handoverCaseStatusSchema,
  updatedAt: z.iso.datetime()
});

export const persistedAuditEventSchema = z.object({
  createdAt: z.iso.datetime(),
  eventType: z.string(),
  payload: z.record(z.string(), z.unknown())
});

export const persistedCaseSummarySchema = z.object({
  automationStatus: automationStatusSchema,
  caseId: z.uuid(),
  createdAt: z.iso.datetime(),
  customerName: z.string(),
  followUpStatus: followUpStatusSchema,
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
  qualificationSnapshot: persistedQualificationSnapshotSchema.nullable()
});

export const persistedHandoverCaseDetailSchema = persistedLinkedHandoverCaseSchema.extend({
  auditEvents: z.array(persistedAuditEventSchema),
  caseId: z.uuid(),
  customerUpdates: z.array(persistedHandoverCustomerUpdateSchema),
  customerName: z.string(),
  milestones: z.array(persistedHandoverMilestoneSchema),
  preferredLocale: supportedLocaleSchema,
  projectInterest: z.string(),
  readinessSummary: z.string(),
  tasks: z.array(persistedHandoverTaskSchema)
});

export const createWebsiteLeadResultSchema = persistedCaseSummarySchema.extend({
  leadId: z.uuid()
});

export type ApproveHandoverCustomerUpdateInput = z.infer<typeof approveHandoverCustomerUpdateInputSchema>;
export type AutomationStatus = z.infer<typeof automationStatusSchema>;
export type CaseStage = z.infer<typeof caseStageSchema>;
export type CreateHandoverIntakeInput = z.infer<typeof createHandoverIntakeInputSchema>;
export type CreateWebsiteLeadInput = z.infer<typeof createWebsiteLeadInputSchema>;
export type CreateWebsiteLeadResult = z.infer<typeof createWebsiteLeadResultSchema>;
export type DocumentRequestStatus = z.infer<typeof documentRequestStatusSchema>;
export type DocumentRequestType = z.infer<typeof documentRequestTypeSchema>;
export type FollowUpStatus = z.infer<typeof followUpStatusSchema>;
export type HandoverCaseStatus = z.infer<typeof handoverCaseStatusSchema>;
export type HandoverCustomerUpdateStatus = z.infer<typeof handoverCustomerUpdateStatusSchema>;
export type HandoverCustomerUpdateType = z.infer<typeof handoverCustomerUpdateTypeSchema>;
export type HandoverMilestoneStatus = z.infer<typeof handoverMilestoneStatusSchema>;
export type HandoverMilestoneType = z.infer<typeof handoverMilestoneTypeSchema>;
export type HandoverTaskStatus = z.infer<typeof handoverTaskStatusSchema>;
export type HandoverTaskType = z.infer<typeof handoverTaskTypeSchema>;
export type ManageCaseFollowUpInput = z.infer<typeof manageCaseFollowUpInputSchema>;
export type ManagerInterventionSeverity = z.infer<typeof managerInterventionSeveritySchema>;
export type ManagerInterventionStatus = z.infer<typeof managerInterventionStatusSchema>;
export type ManagerInterventionType = z.infer<typeof managerInterventionTypeSchema>;
export type PersistedCaseDetail = z.infer<typeof persistedCaseDetailSchema>;
export type PersistedCaseSummary = z.infer<typeof persistedCaseSummarySchema>;
export type PersistedDocumentRequest = z.infer<typeof persistedDocumentRequestSchema>;
export type PersistedHandoverCaseDetail = z.infer<typeof persistedHandoverCaseDetailSchema>;
export type PersistedHandoverCustomerUpdate = z.infer<typeof persistedHandoverCustomerUpdateSchema>;
export type PersistedHandoverMilestone = z.infer<typeof persistedHandoverMilestoneSchema>;
export type PersistedHandoverTask = z.infer<typeof persistedHandoverTaskSchema>;
export type PersistedLinkedHandoverCase = z.infer<typeof persistedLinkedHandoverCaseSchema>;
export type PersistedManagerIntervention = z.infer<typeof persistedManagerInterventionSchema>;
export type PersistedQualificationSnapshot = z.infer<typeof persistedQualificationSnapshotSchema>;
export type PersistedVisit = z.infer<typeof persistedVisitSchema>;
export type QualificationReadiness = z.infer<typeof qualificationReadinessSchema>;
export type QualifyCaseInput = z.infer<typeof qualifyCaseInputSchema>;
export type ScheduleVisitInput = z.infer<typeof scheduleVisitInputSchema>;
export type SupportedLocale = z.infer<typeof supportedLocaleSchema>;
export type UpdateHandoverMilestoneInput = z.infer<typeof updateHandoverMilestoneInputSchema>;
export type UpdateAutomationStatusInput = z.infer<typeof updateAutomationStatusInputSchema>;
export type UpdateDocumentRequestInput = z.infer<typeof updateDocumentRequestInputSchema>;
export type UpdateHandoverTaskStatusInput = z.infer<typeof updateHandoverTaskStatusInputSchema>;
