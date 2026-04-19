import { randomUUID } from "node:crypto";

import { PGlite } from "@electric-sql/pglite";
import type {
  ApproveHandoverCustomerUpdateInput,
  AutomationStatus,
  CalendarProvider,
  CaseAgentActionType,
  CaseAgentBlockedReason,
  CaseAgentRiskLevel,
  CaseAgentRunStatus,
  CaseAgentToolExecutionStatus,
  CaseAgentTriggerType,
  CaseAutomationHoldReason,
  CaseContactChannel,
  CaseStage,
  CaseQaPolicySignal,
  CaseQaReviewStatus,
  CaseQaReviewSubjectType,
  CaseQaReviewTriggerSource,
  CompleteHandoverInput,
  ConfirmHandoverAppointmentInput,
  HandoverClosureState,
  HandoverArchiveOutcome,
  HandoverArchiveStatus,
  CreateHandoverPostCompletionFollowUpInput,
  CreateHandoverIntakeInput,
  CreateHandoverBlockerInput,
  CreateWebsiteLeadInput,
  CreateWebsiteLeadResult,
  DocumentRequestStatus,
  DocumentRequestType,
  FollowUpStatus,
  GovernanceEventStatus,
  GovernancePolicySignal,
  GovernanceSubjectType,
  HandoverAppointmentStatus,
  HandoverBlockerSeverity,
  HandoverBlockerStatus,
  HandoverBlockerType,
  HandoverCaseStatus,
  HandoverCustomerUpdateStatus,
  HandoverCustomerUpdateQaPolicySignal,
  HandoverCustomerUpdateQaReviewStatus,
  HandoverCustomerUpdateType,
  HandoverMilestoneStatus,
  HandoverMilestoneType,
  HandoverTaskStatus,
  HandoverTaskType,
  MarkHandoverCustomerUpdateDispatchReadyInput,
  ManageCaseFollowUpInput,
  ManagerInterventionSeverity,
  ManagerInterventionStatus,
  ManagerInterventionType,
  MessageDeliveryBlockReason,
  MessageDeliveryStatus,
  MessageProvider,
  ListGovernanceEventsQuery,
  PersistedCaseAgentMemory,
  PersistedCaseAgentRun,
  PersistedCaseAgentState,
  PersistedCaseChannelSummary,
  PersistedCaseQaReview,
  PersistedCaseDetail,
  PersistedCaseSummary,
  PersistedCurrentHandoverCustomerUpdateQaReview,
  PersistedDocumentRequest,
  PersistedGovernanceEventList,
  PersistedGovernanceEventRecord,
  PersistedGovernanceSummary,
  PersistedHandoverAppointment,
  PersistedHandoverArchiveReview,
  PersistedHandoverArchiveStatus,
  PersistedHandoverBlocker,
  PersistedHandoverCaseDetail,
  PersistedHandoverClosureSummary,
  PersistedHandoverCustomerUpdate,
  PersistedHandoverMilestone,
  PersistedLatestCaseReply,
  PersistedLatestManagerFollowUp,
  PersistedHandoverPostCompletionFollowUp,
  PersistedHandoverReview,
  PersistedHandoverTask,
  PersistedLinkedHandoverCase,
  PersistedManagerIntervention,
  PlanHandoverAppointmentInput,
  PrepareCaseReplyDraftQaReviewInput,
  PrepareHandoverCustomerUpdateDeliveryInput,
  QualifyCaseInput,
  QualificationReadiness,
  RequestCaseQaReviewInput,
  ResolveCaseQaReviewInput,
  ResolveHandoverCustomerUpdateQaReviewInput,
  ResolveHandoverPostCompletionFollowUpInput,
  SaveHandoverArchiveReviewInput,
  SaveHandoverReviewInput,
  ScheduleVisitInput,
  SendCaseReplyInput,
  StartHandoverExecutionInput,
  SupportedLocale,
  PersistedVisitBooking,
  UpdateHandoverArchiveStatusInput,
  UpdateHandoverMilestoneInput,
  UpdateHandoverBlockerInput,
  UpdateHandoverTaskStatusInput,
  VisitBookingStatus
} from "@real-estate-ai/contracts";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { normalizePhoneNumber } from "@real-estate-ai/integrations";

import {
  buildAutomaticQaSampleSummary,
  buildCaseReplyDraftQaSampleSummary,
  buildHandoverCustomerUpdateQaSampleSummary,
  detectCaseReplyDraftQaPolicyMatches,
  detectHandoverCustomerUpdateQaPolicyMatches,
  detectQaPolicyMatches,
  type HandoverCustomerUpdateQaPolicyMatch,
  type QaPolicySignal
} from "./qa-policy";

const defaultOwnerName = "Revenue Ops Queue";
const defaultDocumentTypes: DocumentRequestType[] = ["government_id", "proof_of_funds", "employment_letter"];
const defaultHandoverTaskTypes: HandoverTaskType[] = ["unit_readiness_review", "customer_document_pack", "access_preparation"];
const defaultHandoverMilestoneTypes: HandoverMilestoneType[] = [
  "readiness_gate",
  "customer_scheduling_window",
  "handover_appointment_hold"
];
const defaultHandoverCustomerUpdateTypes: HandoverCustomerUpdateType[] = [
  "readiness_update",
  "scheduling_invite",
  "appointment_confirmation"
];
const followUpWatchJobType = "follow_up_watch";
const caseAgentJobType = "case_agent_trigger";
const whatsappAgentReplyJobType = "whatsapp_agent_reply";
const whatsappCaseReplyJobType = "whatsapp_case_reply";

const leads = pgTable("leads", {
  budget: text("budget"),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  id: uuid("id").primaryKey(),
  message: text("message").notNull(),
  normalizedPhone: text("normalized_phone"),
  phone: text("phone"),
  preferredLocale: text("preferred_locale").notNull(),
  projectInterest: text("project_interest").notNull(),
  source: text("source").notNull()
});

const cases = pgTable("cases", {
  automationStatus: text("automation_status").notNull(),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  currentNextAction: text("current_next_action").notNull(),
  id: uuid("id").primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  nextActionDueAt: timestamp("next_action_due_at", { mode: "string", withTimezone: true }).notNull(),
  ownerName: text("owner_name").notNull(),
  stage: text("stage").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const caseAgentMemories = pgTable("case_agent_memories", {
  activeRiskFlags: jsonb("active_risk_flags").$type<string[]>().notNull(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" })
    .unique(),
  documentGapSummary: text("document_gap_summary"),
  lastDecisionSummary: text("last_decision_summary"),
  lastInboundAt: timestamp("last_inbound_at", { mode: "string", withTimezone: true }),
  lastObjectionSummary: text("last_objection_summary"),
  lastSuccessfulOutboundAt: timestamp("last_successful_outbound_at", { mode: "string", withTimezone: true }),
  latestIntentSummary: text("latest_intent_summary"),
  qualificationSummary: text("qualification_summary"),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const caseAgentRuns = pgTable("case_agent_runs", {
  actionType: text("action_type"),
  blockedReason: text("blocked_reason"),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  confidencePercent: integer("confidence_percent").notNull(),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  escalationReason: text("escalation_reason"),
  finishedAt: timestamp("finished_at", { mode: "string", withTimezone: true }).notNull(),
  id: uuid("id").primaryKey(),
  modelMode: text("model_mode").notNull(),
  proposedMessage: text("proposed_message"),
  proposedNextAction: text("proposed_next_action"),
  proposedNextActionDueAt: timestamp("proposed_next_action_due_at", { mode: "string", withTimezone: true }),
  rationaleSummary: text("rationale_summary").notNull(),
  riskLevel: text("risk_level").notNull(),
  startedAt: timestamp("started_at", { mode: "string", withTimezone: true }).notNull(),
  status: text("status").notNull(),
  toolExecutionStatus: text("tool_execution_status"),
  triggerType: text("trigger_type").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const qualificationSnapshots = pgTable("qualification_snapshots", {
  budgetBand: text("budget_band").notNull(),
  caseId: uuid("case_id")
    .notNull()
    .unique()
    .references(() => cases.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  id: uuid("id").primaryKey(),
  intentSummary: text("intent_summary").notNull(),
  moveInTimeline: text("move_in_timeline").notNull(),
  readiness: text("readiness").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const visits = pgTable("visits", {
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  id: uuid("id").primaryKey(),
  location: text("location").notNull(),
  scheduledAt: timestamp("scheduled_at", { mode: "string", withTimezone: true }).notNull()
});

const visitBookings = pgTable("visit_bookings", {
  confirmedAt: timestamp("confirmed_at", { mode: "string", withTimezone: true }),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  failureCode: text("failure_code"),
  failureDetail: text("failure_detail"),
  id: uuid("id").primaryKey(),
  provider: text("provider"),
  providerEventId: text("provider_event_id"),
  status: text("status").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }),
  visitId: uuid("visit_id")
    .notNull()
    .unique()
    .references(() => visits.id, { onDelete: "cascade" })
});

const caseChannelStates = pgTable("case_channel_states", {
  caseId: uuid("case_id")
    .notNull()
    .unique()
    .references(() => cases.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  contactValue: text("contact_value"),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  id: uuid("id").primaryKey(),
  lastInboundAt: timestamp("last_inbound_at", { mode: "string", withTimezone: true }),
  latestOutboundBlockReason: text("latest_outbound_block_reason"),
  latestOutboundFailureCode: text("latest_outbound_failure_code"),
  latestOutboundFailureDetail: text("latest_outbound_failure_detail"),
  latestOutboundMessage: text("latest_outbound_message"),
  latestOutboundProviderMessageId: text("latest_outbound_provider_message_id"),
  latestOutboundStatus: text("latest_outbound_status").notNull(),
  latestOutboundUpdatedAt: timestamp("latest_outbound_updated_at", { mode: "string", withTimezone: true }),
  provider: text("provider"),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const documentRequests = pgTable("document_requests", {
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  id: uuid("id").primaryKey(),
  status: text("status").notNull(),
  type: text("type").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const handoverCases = pgTable("handover_cases", {
  caseId: uuid("case_id")
    .notNull()
    .unique()
    .references(() => cases.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at", { mode: "string", withTimezone: true }),
  completionSummary: text("completion_summary"),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  executionStartedAt: timestamp("execution_started_at", { mode: "string", withTimezone: true }),
  id: uuid("id").primaryKey(),
  ownerName: text("owner_name").notNull(),
  readinessSummary: text("readiness_summary").notNull(),
  status: text("status").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const handoverTasks = pgTable("handover_tasks", {
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  dueAt: timestamp("due_at", { mode: "string", withTimezone: true }).notNull(),
  handoverCaseId: uuid("handover_case_id")
    .notNull()
    .references(() => handoverCases.id, { onDelete: "cascade" }),
  id: uuid("id").primaryKey(),
  ownerName: text("owner_name").notNull(),
  status: text("status").notNull(),
  type: text("type").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const handoverBlockers = pgTable("handover_blockers", {
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  dueAt: timestamp("due_at", { mode: "string", withTimezone: true }).notNull(),
  handoverCaseId: uuid("handover_case_id")
    .notNull()
    .references(() => handoverCases.id, { onDelete: "cascade" }),
  id: uuid("id").primaryKey(),
  ownerName: text("owner_name").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull(),
  summary: text("summary").notNull(),
  type: text("type").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const handoverMilestones = pgTable("handover_milestones", {
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  handoverCaseId: uuid("handover_case_id")
    .notNull()
    .references(() => handoverCases.id, { onDelete: "cascade" }),
  id: uuid("id").primaryKey(),
  ownerName: text("owner_name").notNull(),
  status: text("status").notNull(),
  targetAt: timestamp("target_at", { mode: "string", withTimezone: true }).notNull(),
  type: text("type").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const handoverCustomerUpdates = pgTable("handover_customer_updates", {
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  deliveryPreparedAt: timestamp("delivery_prepared_at", { mode: "string", withTimezone: true }),
  deliverySummary: text("delivery_summary"),
  dispatchReadyAt: timestamp("dispatch_ready_at", { mode: "string", withTimezone: true }),
  handoverCaseId: uuid("handover_case_id")
    .notNull()
    .references(() => handoverCases.id, { onDelete: "cascade" }),
  id: uuid("id").primaryKey(),
  qaPolicySignals: jsonb("qa_policy_signals").$type<HandoverCustomerUpdateQaPolicySignal[]>().notNull(),
  qaReviewSampleSummary: text("qa_review_sample_summary"),
  qaReviewStatus: text("qa_review_status").notNull(),
  qaReviewSummary: text("qa_review_summary"),
  qaReviewedAt: timestamp("qa_reviewed_at", { mode: "string", withTimezone: true }),
  qaReviewerName: text("qa_reviewer_name"),
  qaTriggerEvidence: jsonb("qa_trigger_evidence").$type<string[]>().notNull(),
  status: text("status").notNull(),
  type: text("type").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const handoverAppointments = pgTable("handover_appointments", {
  coordinatorName: text("coordinator_name").notNull(),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  handoverCaseId: uuid("handover_case_id")
    .notNull()
    .unique()
    .references(() => handoverCases.id, { onDelete: "cascade" }),
  id: uuid("id").primaryKey(),
  location: text("location").notNull(),
  scheduledAt: timestamp("scheduled_at", { mode: "string", withTimezone: true }).notNull(),
  status: text("status").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const handoverReviews = pgTable("handover_reviews", {
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  handoverCaseId: uuid("handover_case_id")
    .notNull()
    .unique()
    .references(() => handoverCases.id, { onDelete: "cascade" }),
  id: uuid("id").primaryKey(),
  outcome: text("outcome").notNull(),
  summary: text("summary").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const handoverPostCompletionFollowUps = pgTable("handover_post_completion_follow_ups", {
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  dueAt: timestamp("due_at", { mode: "string", withTimezone: true }).notNull(),
  handoverCaseId: uuid("handover_case_id")
    .notNull()
    .unique()
    .references(() => handoverCases.id, { onDelete: "cascade" }),
  id: uuid("id").primaryKey(),
  ownerName: text("owner_name").notNull(),
  resolutionSummary: text("resolution_summary"),
  resolvedAt: timestamp("resolved_at", { mode: "string", withTimezone: true }),
  status: text("status").notNull(),
  summary: text("summary").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const handoverArchiveReviews = pgTable("handover_archive_reviews", {
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  handoverCaseId: uuid("handover_case_id")
    .notNull()
    .unique()
    .references(() => handoverCases.id, { onDelete: "cascade" }),
  id: uuid("id").primaryKey(),
  outcome: text("outcome").notNull(),
  summary: text("summary").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const handoverArchiveStatuses = pgTable("handover_archive_statuses", {
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  handoverCaseId: uuid("handover_case_id")
    .notNull()
    .unique()
    .references(() => handoverCases.id, { onDelete: "cascade" }),
  id: uuid("id").primaryKey(),
  status: text("status").notNull(),
  summary: text("summary").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const managerInterventions = pgTable("manager_interventions", {
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  id: uuid("id").primaryKey(),
  resolutionNote: text("resolution_note"),
  resolvedAt: timestamp("resolved_at", { mode: "string", withTimezone: true }),
  severity: text("severity").notNull(),
  status: text("status").notNull(),
  summary: text("summary").notNull(),
  type: text("type").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const caseQaReviews = pgTable("case_qa_reviews", {
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  draftMessage: text("draft_message"),
  id: uuid("id").primaryKey(),
  policySignals: jsonb("policy_signals").$type<QaPolicySignal[]>().notNull(),
  requestedByName: text("requested_by_name").notNull(),
  reviewSummary: text("review_summary"),
  reviewedAt: timestamp("reviewed_at", { mode: "string", withTimezone: true }),
  reviewerName: text("reviewer_name"),
  sampleSummary: text("sample_summary").notNull(),
  status: text("status").notNull(),
  subjectType: text("subject_type").notNull(),
  triggerEvidence: jsonb("trigger_evidence").$type<string[]>().notNull(),
  triggerSource: text("trigger_source").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const automationJobs = pgTable("automation_jobs", {
  attempts: integer("attempts").notNull(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  id: uuid("id").primaryKey(),
  jobType: text("job_type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  runAfter: timestamp("run_after", { mode: "string", withTimezone: true }).notNull(),
  status: text("status").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull()
});

const auditEvents = pgTable("audit_events", {
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  eventType: text("event_type").notNull(),
  id: uuid("id").primaryKey(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull()
});

export interface FollowUpCycleResult {
  openedInterventions: number;
  processedJobs: number;
  touchedCaseIds: string[];
}

export interface CaseAgentCycleResult {
  blockedRuns: number;
  escalatedRuns: number;
  processedJobs: number;
  touchedCaseIds: string[];
}

export interface DueAutomationJob {
  attempts: number;
  caseId: string;
  jobId: string;
  payload: Record<string, unknown>;
  runAfter: string;
}

export interface LeadCaptureStore {
  applyQualification(
    caseId: string,
    input: QualifyCaseInput & {
      nextAction: string;
      nextActionDueAt: string;
    }
  ): Promise<PersistedCaseDetail | null>;
  close(): Promise<void>;
  createWebsiteLeadCase(
    input: CreateWebsiteLeadInput & {
      nextAction: string;
      nextActionDueAt: string;
      source?: "website" | "whatsapp";
    }
  ): Promise<CreateWebsiteLeadResult>;
  findCaseIdByNormalizedPhone(normalizedPhone: string): Promise<string | null>;
  createCaseAgentReplyDraft(
    caseId: string,
    input: {
      agentRunId: string;
      messageBody: string;
      nextAction: string;
      nextActionDueAt: string;
      summary: string;
      triggerType: CaseAgentTriggerType;
      updatedAt: string;
    }
  ): Promise<PersistedCaseDetail | null>;
  createCaseAgentRun(
    caseId: string,
    input: {
      actionType: CaseAgentActionType | null;
      agentRunId: string;
      blockedReason: string | null;
      confidence: number;
      escalationReason: string | null;
      finishedAt: string;
      modelMode: string;
      proposedMessage: string | null;
      proposedNextAction: string | null;
      proposedNextActionDueAt: string | null;
      rationaleSummary: string;
      riskLevel: CaseAgentRiskLevel;
      startedAt: string;
      status: CaseAgentRunStatus;
      toolExecutionStatus: CaseAgentToolExecutionStatus | null;
      triggerType: CaseAgentTriggerType;
      updatedAt: string;
    }
  ): Promise<void>;
  getDueAutomationJobs(input: {
    jobType: string;
    limit: number;
    runAt: string;
  }): Promise<DueAutomationJob[]>;
  recordVisitBooking(
    caseId: string,
    visitId: string,
    input: {
      confirmedAt: string | null;
      failureCode: string | null;
      failureDetail: string | null;
      provider: CalendarProvider | null;
      providerEventId: string | null;
      status: VisitBookingStatus;
      updatedAt: string;
    }
  ): Promise<PersistedCaseDetail | null>;
  recordWhatsAppDeliveryStatus(input: {
    failureCode: string | null;
    failureDetail: string | null;
    normalizedPhone: string | null;
    providerMessageId: string;
    status: MessageDeliveryStatus;
    updatedAt: string;
  }): Promise<PersistedCaseDetail | null>;
  recordWhatsAppInboundMessage(input: {
    messageId: string;
    normalizedPhone: string;
    profileName: string | null;
    receivedAt: string;
    textBody: string;
  }): Promise<PersistedCaseDetail | null>;
  recordWhatsAppOutboundAttempt(
    caseId: string,
    input: {
      blockReason: MessageDeliveryBlockReason | null;
      failureCode: string | null;
      failureDetail: string | null;
      jobId: string;
      messageBody: string;
      origin: "manager" | "system";
      provider: MessageProvider;
      providerMessageId: string | null;
      retryAfter: string | null;
      sentByName: string | null;
      status: MessageDeliveryStatus;
      updatedAt: string;
    }
  ): Promise<PersistedCaseDetail | null>;
  prepareCaseReplyDraftQaReview(caseId: string, input: PrepareCaseReplyDraftQaReviewInput): Promise<PersistedCaseDetail | null>;
  requestCaseQaReview(caseId: string, input: RequestCaseQaReviewInput): Promise<PersistedCaseDetail | null>;
  resolveCaseQaReview(caseId: string, qaReviewId: string, input: ResolveCaseQaReviewInput): Promise<PersistedCaseDetail | null>;
  sendCaseReply(
    caseId: string,
    input: SendCaseReplyInput & {
      approvedDraftQaReviewId: string | null;
    }
  ): Promise<PersistedCaseDetail | null>;
  getCaseDetail(caseId: string): Promise<PersistedCaseDetail | null>;
  listGovernanceEvents(input: ListGovernanceEventsQuery): Promise<PersistedGovernanceEventList>;
  getGovernanceSummary(): Promise<PersistedGovernanceSummary>;
  getHandoverCaseDetail(handoverCaseId: string): Promise<PersistedHandoverCaseDetail | null>;
  listCases(): Promise<PersistedCaseSummary[]>;
  markAutomationJobCompleted(jobId: string, updatedAt: string): Promise<void>;
  manageCaseFollowUp(caseId: string, input: ManageCaseFollowUpInput): Promise<PersistedCaseDetail | null>;
  manageCaseFollowUpBulk(caseIds: string[], input: ManageCaseFollowUpInput): Promise<PersistedCaseDetail[]>;
  openCaseManagerIntervention(
    caseId: string,
    input: {
      agentRunId: string;
      severity: ManagerInterventionSeverity;
      summary: string;
      triggerType: CaseAgentTriggerType;
      updatedAt: string;
    }
  ): Promise<PersistedCaseDetail | null>;
  queueCaseAgentReply(
    caseId: string,
    input: {
      agentRunId: string;
      messageBody: string;
      nextAction: string;
      nextActionDueAt: string;
      triggerType: CaseAgentTriggerType;
      updatedAt: string;
    }
  ): Promise<PersistedCaseDetail | null>;
  queueCaseAgentTrigger(
    caseId: string,
    input: {
      payload?: Record<string, unknown>;
      runAfter: string;
      triggerType: CaseAgentTriggerType;
      updatedAt: string;
    }
  ): Promise<void>;
  rescheduleAutomationJob(jobId: string, input: {
    attempts: number;
    runAfter: string;
    updatedAt: string;
  }): Promise<void>;
  saveCaseAgentFollowUp(
    caseId: string,
    input: {
      agentRunId: string;
      nextAction: string;
      nextActionDueAt: string;
      summary: string;
      triggerType: CaseAgentTriggerType;
      updatedAt: string;
    }
  ): Promise<PersistedCaseDetail | null>;
  createHandoverBlocker(
    handoverCaseId: string,
    input: CreateHandoverBlockerInput & {
      nextAction: string;
      nextActionDueAt: string;
      nextHandoverStatus: HandoverCaseStatus;
    }
  ): Promise<PersistedHandoverCaseDetail | null>;
  createHandoverPostCompletionFollowUp(
    handoverCaseId: string,
    input: CreateHandoverPostCompletionFollowUpInput & {
      nextAction: string;
      nextActionDueAt: string;
      nextHandoverStatus: HandoverCaseStatus;
    }
  ): Promise<PersistedHandoverCaseDetail | null>;
  saveHandoverArchiveReview(
    handoverCaseId: string,
    input: SaveHandoverArchiveReviewInput & {
      nextAction: string;
      nextActionDueAt: string;
      nextHandoverStatus: HandoverCaseStatus;
    }
  ): Promise<PersistedHandoverCaseDetail | null>;
  saveHandoverReview(
    handoverCaseId: string,
    input: SaveHandoverReviewInput & {
      nextAction: string;
      nextActionDueAt: string;
      nextHandoverStatus: HandoverCaseStatus;
    }
  ): Promise<PersistedHandoverCaseDetail | null>;
  startHandoverExecution(
    handoverCaseId: string,
    input: StartHandoverExecutionInput & {
      nextAction: string;
      nextActionDueAt: string;
      nextHandoverStatus: HandoverCaseStatus;
    }
  ): Promise<PersistedHandoverCaseDetail | null>;
  runDueFollowUpCycle(input: {
    limit: number;
    runAt: string;
  }): Promise<FollowUpCycleResult>;
  scheduleVisit(
    caseId: string,
    input: ScheduleVisitInput & {
      nextAction: string;
      nextActionDueAt: string;
    }
  ): Promise<PersistedCaseDetail | null>;
  setAutomationStatus(
    caseId: string,
    input: {
      status: AutomationStatus;
    }
  ): Promise<PersistedCaseDetail | null>;
  upsertCaseAgentMemory(
    caseId: string,
    input: Omit<PersistedCaseAgentMemory, "updatedAt"> & {
      updatedAt: string;
    }
  ): Promise<void>;
  startHandoverIntake(
    caseId: string,
    input: CreateHandoverIntakeInput & {
      nextAction: string;
      nextActionDueAt: string;
    }
  ): Promise<PersistedCaseDetail | null>;
  updateDocumentRequestStatus(
    caseId: string,
    documentRequestId: string,
    input: {
      nextAction: string;
      nextActionDueAt: string;
      status: DocumentRequestStatus;
    }
  ): Promise<PersistedCaseDetail | null>;
  planHandoverAppointment(
    handoverCaseId: string,
    input: PlanHandoverAppointmentInput & {
      nextAction: string;
      nextActionDueAt: string;
      nextHandoverStatus: HandoverCaseStatus;
    }
  ): Promise<PersistedHandoverCaseDetail | null>;
  confirmHandoverAppointment(
    handoverCaseId: string,
    appointmentId: string,
    input: ConfirmHandoverAppointmentInput & {
      nextAction: string;
      nextActionDueAt: string;
      nextHandoverStatus: HandoverCaseStatus;
    }
  ): Promise<PersistedHandoverCaseDetail | null>;
  markHandoverCustomerUpdateDispatchReady(
    handoverCaseId: string,
    customerUpdateId: string,
    input: MarkHandoverCustomerUpdateDispatchReadyInput & {
      nextAction: string;
      nextActionDueAt: string;
      nextHandoverStatus: HandoverCaseStatus;
    }
  ): Promise<PersistedHandoverCaseDetail | null>;
  prepareHandoverCustomerUpdateDelivery(
    handoverCaseId: string,
    customerUpdateId: string,
    input: PrepareHandoverCustomerUpdateDeliveryInput & {
      qaReview:
        | {
            policyMatches: HandoverCustomerUpdateQaPolicyMatch[];
            sampleSummary: string;
          }
        | null;
      nextAction: string;
      nextActionDueAt: string;
      nextHandoverStatus: HandoverCaseStatus;
    }
  ): Promise<PersistedHandoverCaseDetail | null>;
  resolveHandoverCustomerUpdateQaReview(
    handoverCaseId: string,
    customerUpdateId: string,
    input: ResolveHandoverCustomerUpdateQaReviewInput & {
      nextAction: string;
      nextActionDueAt: string;
      nextHandoverStatus: HandoverCaseStatus;
    }
  ): Promise<PersistedHandoverCaseDetail | null>;
  completeHandover(
    handoverCaseId: string,
    input: CompleteHandoverInput & {
      nextAction: string;
      nextActionDueAt: string;
      nextHandoverStatus: HandoverCaseStatus;
    }
  ): Promise<PersistedHandoverCaseDetail | null>;
  resolveHandoverPostCompletionFollowUp(
    handoverCaseId: string,
    followUpId: string,
    input: ResolveHandoverPostCompletionFollowUpInput & {
      nextAction: string;
      nextActionDueAt: string;
      nextHandoverStatus: HandoverCaseStatus;
    }
  ): Promise<PersistedHandoverCaseDetail | null>;
  updateHandoverCustomerUpdateStatus(
    handoverCaseId: string,
    customerUpdateId: string,
    input: ApproveHandoverCustomerUpdateInput & {
      nextAction: string;
      nextActionDueAt: string;
      nextHandoverStatus: HandoverCaseStatus;
    }
  ): Promise<PersistedHandoverCaseDetail | null>;
  updateHandoverMilestone(
    handoverCaseId: string,
    milestoneId: string,
    input: UpdateHandoverMilestoneInput & {
      nextAction: string;
      nextActionDueAt: string;
      nextCustomerUpdateStatus: HandoverCustomerUpdateStatus;
      nextHandoverStatus: HandoverCaseStatus;
    }
  ): Promise<PersistedHandoverCaseDetail | null>;
  updateHandoverBlocker(
    handoverCaseId: string,
    blockerId: string,
    input: UpdateHandoverBlockerInput & {
      nextAction: string;
      nextActionDueAt: string;
      nextHandoverStatus: HandoverCaseStatus;
    }
  ): Promise<PersistedHandoverCaseDetail | null>;
  updateHandoverArchiveStatus(
    handoverCaseId: string,
    input: UpdateHandoverArchiveStatusInput & {
      nextAction: string;
      nextActionDueAt: string;
      nextHandoverStatus: HandoverCaseStatus;
    }
  ): Promise<PersistedHandoverCaseDetail | null>;
  updateHandoverTaskStatus(
    handoverCaseId: string,
    handoverTaskId: string,
    input: UpdateHandoverTaskStatusInput & {
      nextAction: string;
      nextActionDueAt: string;
      nextHandoverStatus: HandoverCaseStatus;
    }
  ): Promise<PersistedHandoverCaseDetail | null>;
}

export async function createAlphaLeadCaptureStore(options?: {
  dataPath?: string;
  inMemory?: boolean;
}): Promise<LeadCaptureStore> {
  const client = options?.inMemory ? new PGlite() : new PGlite(options?.dataPath ?? ".data/phase2-alpha");
  const db = drizzle(client, {
    schema: {
      auditEvents,
      automationJobs,
      caseAgentMemories,
      caseAgentRuns,
      caseChannelStates,
      caseQaReviews,
      cases,
      documentRequests,
      handoverAppointments,
      handoverArchiveReviews,
      handoverArchiveStatuses,
      handoverBlockers,
      handoverCases,
      handoverCustomerUpdates,
      handoverMilestones,
      handoverPostCompletionFollowUps,
      handoverReviews,
      handoverTasks,
      leads,
      managerInterventions,
      qualificationSnapshots,
      visitBookings,
      visits
    }
  });

  await client.exec(`
    create table if not exists leads (
      id uuid primary key,
      source text not null,
      customer_name text not null,
      email text not null,
      phone text,
      normalized_phone text,
      preferred_locale text not null,
      project_interest text not null,
      budget text,
      message text not null,
      created_at timestamptz not null default now()
    );

    alter table leads add column if not exists normalized_phone text;

    create table if not exists cases (
      id uuid primary key,
      lead_id uuid not null unique references leads(id) on delete cascade,
      stage text not null,
      owner_name text not null,
      current_next_action text not null,
      next_action_due_at timestamptz not null,
      automation_status text not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table cases add column if not exists automation_status text not null default 'active';

    create table if not exists case_agent_memories (
      case_id uuid not null unique references cases(id) on delete cascade,
      latest_intent_summary text,
      qualification_summary text,
      last_objection_summary text,
      document_gap_summary text,
      last_decision_summary text,
      last_inbound_at timestamptz,
      last_successful_outbound_at timestamptz,
      active_risk_flags jsonb not null default '[]'::jsonb,
      updated_at timestamptz not null default now()
    );

    alter table case_agent_memories add column if not exists latest_intent_summary text;
    alter table case_agent_memories add column if not exists qualification_summary text;
    alter table case_agent_memories add column if not exists last_objection_summary text;
    alter table case_agent_memories add column if not exists document_gap_summary text;
    alter table case_agent_memories add column if not exists last_decision_summary text;
    alter table case_agent_memories add column if not exists last_inbound_at timestamptz;
    alter table case_agent_memories add column if not exists last_successful_outbound_at timestamptz;
    alter table case_agent_memories add column if not exists active_risk_flags jsonb not null default '[]'::jsonb;
    alter table case_agent_memories add column if not exists updated_at timestamptz not null default now();

    create table if not exists case_agent_runs (
      id uuid primary key,
      case_id uuid not null references cases(id) on delete cascade,
      trigger_type text not null,
      status text not null,
      risk_level text not null,
      confidence_percent integer not null default 0,
      action_type text,
      tool_execution_status text,
      blocked_reason text,
      escalation_reason text,
      rationale_summary text not null,
      proposed_message text,
      proposed_next_action text,
      proposed_next_action_due_at timestamptz,
      model_mode text not null,
      started_at timestamptz not null,
      finished_at timestamptz not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table case_agent_runs add column if not exists trigger_type text not null default 'new_lead';
    alter table case_agent_runs add column if not exists status text not null default 'completed';
    alter table case_agent_runs add column if not exists risk_level text not null default 'low';
    alter table case_agent_runs add column if not exists confidence_percent integer not null default 0;
    alter table case_agent_runs add column if not exists action_type text;
    alter table case_agent_runs add column if not exists tool_execution_status text;
    alter table case_agent_runs add column if not exists blocked_reason text;
    alter table case_agent_runs add column if not exists escalation_reason text;
    alter table case_agent_runs add column if not exists rationale_summary text not null default '';
    alter table case_agent_runs add column if not exists proposed_message text;
    alter table case_agent_runs add column if not exists proposed_next_action text;
    alter table case_agent_runs add column if not exists proposed_next_action_due_at timestamptz;
    alter table case_agent_runs add column if not exists model_mode text not null default 'deterministic_v1';
    alter table case_agent_runs add column if not exists started_at timestamptz not null default now();
    alter table case_agent_runs add column if not exists finished_at timestamptz not null default now();
    alter table case_agent_runs add column if not exists created_at timestamptz not null default now();
    alter table case_agent_runs add column if not exists updated_at timestamptz not null default now();

    create table if not exists qualification_snapshots (
      id uuid primary key,
      case_id uuid not null unique references cases(id) on delete cascade,
      budget_band text not null,
      move_in_timeline text not null,
      intent_summary text not null,
      readiness text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists visits (
      id uuid primary key,
      case_id uuid not null references cases(id) on delete cascade,
      location text not null,
      scheduled_at timestamptz not null,
      created_at timestamptz not null default now()
    );

    create table if not exists visit_bookings (
      id uuid primary key,
      visit_id uuid not null unique references visits(id) on delete cascade,
      provider text,
      provider_event_id text,
      status text not null,
      failure_code text,
      failure_detail text,
      confirmed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz
    );

    alter table visit_bookings add column if not exists provider text;
    alter table visit_bookings add column if not exists provider_event_id text;
    alter table visit_bookings add column if not exists status text not null default 'not_requested';
    alter table visit_bookings add column if not exists failure_code text;
    alter table visit_bookings add column if not exists failure_detail text;
    alter table visit_bookings add column if not exists confirmed_at timestamptz;
    alter table visit_bookings add column if not exists updated_at timestamptz;

    create table if not exists case_channel_states (
      id uuid primary key,
      case_id uuid not null unique references cases(id) on delete cascade,
      channel text not null,
      provider text,
      contact_value text,
      latest_outbound_status text not null,
      latest_outbound_block_reason text,
      latest_outbound_failure_code text,
      latest_outbound_failure_detail text,
      latest_outbound_provider_message_id text,
      latest_outbound_message text,
      latest_outbound_updated_at timestamptz,
      last_inbound_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table case_channel_states add column if not exists provider text;
    alter table case_channel_states add column if not exists contact_value text;
    alter table case_channel_states add column if not exists latest_outbound_status text not null default 'not_started';
    alter table case_channel_states add column if not exists latest_outbound_block_reason text;
    alter table case_channel_states add column if not exists latest_outbound_failure_code text;
    alter table case_channel_states add column if not exists latest_outbound_failure_detail text;
    alter table case_channel_states add column if not exists latest_outbound_provider_message_id text;
    alter table case_channel_states add column if not exists latest_outbound_message text;
    alter table case_channel_states add column if not exists latest_outbound_updated_at timestamptz;
    alter table case_channel_states add column if not exists last_inbound_at timestamptz;

    create table if not exists document_requests (
      id uuid primary key,
      case_id uuid not null references cases(id) on delete cascade,
      type text not null,
      status text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists handover_cases (
      id uuid primary key,
      case_id uuid not null unique references cases(id) on delete cascade,
      owner_name text not null,
      readiness_summary text not null,
      status text not null,
      execution_started_at timestamptz,
      completed_at timestamptz,
      completion_summary text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table handover_cases add column if not exists execution_started_at timestamptz;
    alter table handover_cases add column if not exists completed_at timestamptz;
    alter table handover_cases add column if not exists completion_summary text;

    create table if not exists handover_tasks (
      id uuid primary key,
      handover_case_id uuid not null references handover_cases(id) on delete cascade,
      type text not null,
      status text not null,
      owner_name text not null,
      due_at timestamptz not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists handover_blockers (
      id uuid primary key,
      handover_case_id uuid not null references handover_cases(id) on delete cascade,
      type text not null,
      summary text not null,
      status text not null,
      severity text not null,
      owner_name text not null,
      due_at timestamptz not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists handover_milestones (
      id uuid primary key,
      handover_case_id uuid not null references handover_cases(id) on delete cascade,
      type text not null,
      status text not null,
      owner_name text not null,
      target_at timestamptz not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists handover_customer_updates (
      id uuid primary key,
      handover_case_id uuid not null references handover_cases(id) on delete cascade,
      type text not null,
      status text not null,
      delivery_summary text,
      delivery_prepared_at timestamptz,
      dispatch_ready_at timestamptz,
      qa_review_status text not null default 'not_required',
      qa_review_sample_summary text,
      qa_review_summary text,
      qa_reviewer_name text,
      qa_reviewed_at timestamptz,
      qa_policy_signals jsonb not null default '[]'::jsonb,
      qa_trigger_evidence jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table handover_customer_updates add column if not exists delivery_summary text;
    alter table handover_customer_updates add column if not exists delivery_prepared_at timestamptz;
    alter table handover_customer_updates add column if not exists dispatch_ready_at timestamptz;
    alter table handover_customer_updates add column if not exists qa_review_status text not null default 'not_required';
    alter table handover_customer_updates add column if not exists qa_review_sample_summary text;
    alter table handover_customer_updates add column if not exists qa_review_summary text;
    alter table handover_customer_updates add column if not exists qa_reviewer_name text;
    alter table handover_customer_updates add column if not exists qa_reviewed_at timestamptz;
    alter table handover_customer_updates add column if not exists qa_policy_signals jsonb not null default '[]'::jsonb;
    alter table handover_customer_updates add column if not exists qa_trigger_evidence jsonb not null default '[]'::jsonb;

    create table if not exists handover_appointments (
      id uuid primary key,
      handover_case_id uuid not null unique references handover_cases(id) on delete cascade,
      location text not null,
      coordinator_name text not null,
      scheduled_at timestamptz not null,
      status text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists handover_reviews (
      id uuid primary key,
      handover_case_id uuid not null unique references handover_cases(id) on delete cascade,
      outcome text not null,
      summary text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists handover_post_completion_follow_ups (
      id uuid primary key,
      handover_case_id uuid not null unique references handover_cases(id) on delete cascade,
      owner_name text not null,
      due_at timestamptz not null,
      status text not null,
      summary text not null,
      resolution_summary text,
      resolved_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists handover_archive_reviews (
      id uuid primary key,
      handover_case_id uuid not null unique references handover_cases(id) on delete cascade,
      outcome text not null,
      summary text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists handover_archive_statuses (
      id uuid primary key,
      handover_case_id uuid not null unique references handover_cases(id) on delete cascade,
      status text not null,
      summary text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists manager_interventions (
      id uuid primary key,
      case_id uuid not null references cases(id) on delete cascade,
      type text not null,
      severity text not null,
      status text not null,
      summary text not null,
      resolution_note text,
      resolved_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists case_qa_reviews (
      id uuid primary key,
      case_id uuid not null references cases(id) on delete cascade,
      requested_by_name text not null,
      sample_summary text not null,
      status text not null,
      subject_type text not null default 'case_message',
      draft_message text,
      trigger_source text not null default 'manual_request',
      policy_signals jsonb not null default '[]'::jsonb,
      trigger_evidence jsonb not null default '[]'::jsonb,
      reviewer_name text,
      review_summary text,
      reviewed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table case_qa_reviews add column if not exists trigger_source text not null default 'manual_request';
    alter table case_qa_reviews add column if not exists policy_signals jsonb not null default '[]'::jsonb;
    alter table case_qa_reviews add column if not exists trigger_evidence jsonb not null default '[]'::jsonb;
    alter table case_qa_reviews add column if not exists subject_type text not null default 'case_message';
    alter table case_qa_reviews add column if not exists draft_message text;

    create table if not exists automation_jobs (
      id uuid primary key,
      case_id uuid not null references cases(id) on delete cascade,
      job_type text not null,
      payload jsonb not null default '{}'::jsonb,
      attempts integer not null default 0,
      run_after timestamptz not null,
      status text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table automation_jobs add column if not exists payload jsonb not null default '{}'::jsonb;
    alter table automation_jobs add column if not exists attempts integer not null default 0;

    create table if not exists audit_events (
      id uuid primary key,
      case_id uuid not null references cases(id) on delete cascade,
      event_type text not null,
      payload jsonb not null,
      created_at timestamptz not null default now()
    );

    create index if not exists cases_created_at_idx on cases (created_at desc);
    create index if not exists case_agent_memories_case_id_idx on case_agent_memories (case_id);
    create index if not exists case_agent_runs_case_id_idx on case_agent_runs (case_id, created_at desc);
    create index if not exists leads_normalized_phone_idx on leads (normalized_phone);
    create index if not exists visits_case_id_idx on visits (case_id, scheduled_at desc);
    create index if not exists visit_bookings_visit_id_idx on visit_bookings (visit_id);
    create index if not exists case_channel_states_case_id_idx on case_channel_states (case_id);
    create index if not exists document_requests_case_id_idx on document_requests (case_id, created_at asc);
    create index if not exists handover_tasks_case_id_idx on handover_tasks (handover_case_id, due_at asc);
    create index if not exists handover_blockers_case_id_idx on handover_blockers (handover_case_id, due_at asc);
    create index if not exists handover_milestones_case_id_idx on handover_milestones (handover_case_id, target_at asc);
    create index if not exists handover_customer_updates_case_id_idx on handover_customer_updates (handover_case_id, created_at asc);
    create index if not exists handover_appointments_case_id_idx on handover_appointments (handover_case_id, scheduled_at asc);
    create index if not exists handover_reviews_case_id_idx on handover_reviews (handover_case_id, updated_at desc);
    create index if not exists handover_post_completion_follow_ups_case_id_idx on handover_post_completion_follow_ups (handover_case_id, due_at asc);
    create index if not exists handover_archive_reviews_case_id_idx on handover_archive_reviews (handover_case_id, updated_at desc);
    create index if not exists handover_archive_statuses_case_id_idx on handover_archive_statuses (handover_case_id, updated_at desc);
    create index if not exists audit_events_case_id_idx on audit_events (case_id, created_at asc);
    create index if not exists manager_interventions_case_id_idx on manager_interventions (case_id, created_at desc);
    create index if not exists manager_interventions_open_case_idx on manager_interventions (case_id, status);
    create index if not exists case_qa_reviews_case_id_idx on case_qa_reviews (case_id, created_at desc);
    create index if not exists automation_jobs_due_idx on automation_jobs (status, run_after asc);
  `);

  type AlphaTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

  const getHandoverCaseDetail = async (handoverCaseId: string): Promise<PersistedHandoverCaseDetail | null> => {
    const handoverRecord = await db
      .select({
        caseId: handoverCases.caseId,
        completedAt: handoverCases.completedAt,
        completionSummary: handoverCases.completionSummary,
        createdAt: handoverCases.createdAt,
        customerName: leads.customerName,
        executionStartedAt: handoverCases.executionStartedAt,
        handoverCaseId: handoverCases.id,
        ownerName: handoverCases.ownerName,
        preferredLocale: leads.preferredLocale,
        projectInterest: leads.projectInterest,
        readinessSummary: handoverCases.readinessSummary,
        status: handoverCases.status,
        updatedAt: handoverCases.updatedAt
      })
      .from(handoverCases)
      .innerJoin(cases, eq(handoverCases.caseId, cases.id))
      .innerJoin(leads, eq(cases.leadId, leads.id))
      .where(eq(handoverCases.id, handoverCaseId))
      .limit(1);

    const baseRecord = handoverRecord[0];

    if (!baseRecord) {
      return null;
    }

    const [
      taskRecords,
      blockerRecords,
      milestoneRecords,
      customerUpdateRecords,
      appointmentRecords,
      reviewRecords,
      postCompletionFollowUpRecords,
      archiveReviewRecords,
      archiveStatusRecords,
      eventRecords
    ] = await Promise.all([
      db
        .select({
          createdAt: handoverTasks.createdAt,
          dueAt: handoverTasks.dueAt,
          ownerName: handoverTasks.ownerName,
          status: handoverTasks.status,
          taskId: handoverTasks.id,
          type: handoverTasks.type,
          updatedAt: handoverTasks.updatedAt
        })
        .from(handoverTasks)
        .where(eq(handoverTasks.handoverCaseId, handoverCaseId))
        .orderBy(asc(handoverTasks.dueAt)),
      db
        .select({
          blockerId: handoverBlockers.id,
          createdAt: handoverBlockers.createdAt,
          dueAt: handoverBlockers.dueAt,
          ownerName: handoverBlockers.ownerName,
          severity: handoverBlockers.severity,
          status: handoverBlockers.status,
          summary: handoverBlockers.summary,
          type: handoverBlockers.type,
          updatedAt: handoverBlockers.updatedAt
        })
        .from(handoverBlockers)
        .where(eq(handoverBlockers.handoverCaseId, handoverCaseId))
        .orderBy(asc(handoverBlockers.dueAt)),
      db
        .select({
          createdAt: handoverMilestones.createdAt,
          milestoneId: handoverMilestones.id,
          ownerName: handoverMilestones.ownerName,
          status: handoverMilestones.status,
          targetAt: handoverMilestones.targetAt,
          type: handoverMilestones.type,
          updatedAt: handoverMilestones.updatedAt
        })
        .from(handoverMilestones)
        .where(eq(handoverMilestones.handoverCaseId, handoverCaseId))
        .orderBy(asc(handoverMilestones.targetAt)),
      db
        .select({
          createdAt: handoverCustomerUpdates.createdAt,
          customerUpdateId: handoverCustomerUpdates.id,
          deliveryPreparedAt: handoverCustomerUpdates.deliveryPreparedAt,
          deliverySummary: handoverCustomerUpdates.deliverySummary,
          dispatchReadyAt: handoverCustomerUpdates.dispatchReadyAt,
          qaPolicySignals: handoverCustomerUpdates.qaPolicySignals,
          qaReviewSampleSummary: handoverCustomerUpdates.qaReviewSampleSummary,
          qaReviewStatus: handoverCustomerUpdates.qaReviewStatus,
          qaReviewSummary: handoverCustomerUpdates.qaReviewSummary,
          qaReviewedAt: handoverCustomerUpdates.qaReviewedAt,
          qaReviewerName: handoverCustomerUpdates.qaReviewerName,
          qaTriggerEvidence: handoverCustomerUpdates.qaTriggerEvidence,
          status: handoverCustomerUpdates.status,
          type: handoverCustomerUpdates.type,
          updatedAt: handoverCustomerUpdates.updatedAt
        })
        .from(handoverCustomerUpdates)
        .where(eq(handoverCustomerUpdates.handoverCaseId, handoverCaseId))
        .orderBy(asc(handoverCustomerUpdates.createdAt)),
      db
        .select({
          appointmentId: handoverAppointments.id,
          coordinatorName: handoverAppointments.coordinatorName,
          createdAt: handoverAppointments.createdAt,
          location: handoverAppointments.location,
          scheduledAt: handoverAppointments.scheduledAt,
          status: handoverAppointments.status,
          updatedAt: handoverAppointments.updatedAt
        })
        .from(handoverAppointments)
        .where(eq(handoverAppointments.handoverCaseId, handoverCaseId))
        .limit(1),
      db
        .select({
          createdAt: handoverReviews.createdAt,
          outcome: handoverReviews.outcome,
          reviewId: handoverReviews.id,
          summary: handoverReviews.summary,
          updatedAt: handoverReviews.updatedAt
        })
        .from(handoverReviews)
        .where(eq(handoverReviews.handoverCaseId, handoverCaseId))
        .limit(1),
      db
        .select({
          createdAt: handoverPostCompletionFollowUps.createdAt,
          dueAt: handoverPostCompletionFollowUps.dueAt,
          followUpId: handoverPostCompletionFollowUps.id,
          ownerName: handoverPostCompletionFollowUps.ownerName,
          resolutionSummary: handoverPostCompletionFollowUps.resolutionSummary,
          resolvedAt: handoverPostCompletionFollowUps.resolvedAt,
          status: handoverPostCompletionFollowUps.status,
          summary: handoverPostCompletionFollowUps.summary,
          updatedAt: handoverPostCompletionFollowUps.updatedAt
        })
        .from(handoverPostCompletionFollowUps)
        .where(eq(handoverPostCompletionFollowUps.handoverCaseId, handoverCaseId))
        .limit(1),
      db
        .select({
          createdAt: handoverArchiveReviews.createdAt,
          outcome: handoverArchiveReviews.outcome,
          reviewId: handoverArchiveReviews.id,
          summary: handoverArchiveReviews.summary,
          updatedAt: handoverArchiveReviews.updatedAt
        })
        .from(handoverArchiveReviews)
        .where(eq(handoverArchiveReviews.handoverCaseId, handoverCaseId))
        .limit(1),
      db
        .select({
          createdAt: handoverArchiveStatuses.createdAt,
          status: handoverArchiveStatuses.status,
          statusId: handoverArchiveStatuses.id,
          summary: handoverArchiveStatuses.summary,
          updatedAt: handoverArchiveStatuses.updatedAt
        })
        .from(handoverArchiveStatuses)
        .where(eq(handoverArchiveStatuses.handoverCaseId, handoverCaseId))
        .limit(1),
      db
        .select({
          createdAt: auditEvents.createdAt,
          eventType: auditEvents.eventType,
          payload: auditEvents.payload
        })
        .from(auditEvents)
        .where(eq(auditEvents.caseId, baseRecord.caseId))
        .orderBy(asc(auditEvents.createdAt))
    ]);

    return {
      archiveReview: archiveReviewRecords[0] ? hydrateHandoverArchiveReview(archiveReviewRecords[0]) : null,
      archiveStatus: archiveStatusRecords[0] ? hydrateHandoverArchiveStatus(archiveStatusRecords[0]) : null,
      auditEvents: eventRecords.map((event) => ({
        createdAt: event.createdAt,
        eventType: event.eventType,
        payload: event.payload
      })),
      appointment: appointmentRecords[0] ? hydrateHandoverAppointment(appointmentRecords[0]) : null,
      blockers: blockerRecords.map((blocker) => hydrateHandoverBlocker(blocker)),
      caseId: baseRecord.caseId,
      completedAt: baseRecord.completedAt,
      completionSummary: baseRecord.completionSummary,
      createdAt: baseRecord.createdAt,
      customerUpdates: customerUpdateRecords.map((customerUpdate) => hydrateHandoverCustomerUpdate(customerUpdate)),
      customerName: baseRecord.customerName,
      executionStartedAt: baseRecord.executionStartedAt,
      handoverCaseId: baseRecord.handoverCaseId,
      milestones: milestoneRecords.map((milestone) => hydrateHandoverMilestone(milestone)),
      ownerName: baseRecord.ownerName,
      postCompletionFollowUp: postCompletionFollowUpRecords[0] ? hydrateHandoverPostCompletionFollowUp(postCompletionFollowUpRecords[0]) : null,
      preferredLocale: toSupportedLocale(baseRecord.preferredLocale),
      projectInterest: baseRecord.projectInterest,
      readinessSummary: baseRecord.readinessSummary,
      review: reviewRecords[0] ? hydrateHandoverReview(reviewRecords[0]) : null,
      status: toHandoverCaseStatus(baseRecord.status),
      tasks: taskRecords.map((task) => hydrateHandoverTask(task)),
      updatedAt: baseRecord.updatedAt
    };
  };

  const listHandoverClosureSummaries = async (caseIds: string[]) => {
    const caseIdsWithValues = caseIds.filter(Boolean);

    if (caseIdsWithValues.length === 0) {
      return new Map<string, PersistedHandoverClosureSummary>();
    }

    const linkedHandoverRecords = await db
      .select({
        caseId: handoverCases.caseId,
        handoverCaseId: handoverCases.id,
        status: handoverCases.status,
        updatedAt: handoverCases.updatedAt
      })
      .from(handoverCases)
      .where(inArray(handoverCases.caseId, caseIdsWithValues));

    if (linkedHandoverRecords.length === 0) {
      return new Map<string, PersistedHandoverClosureSummary>();
    }

    const handoverCaseIds = linkedHandoverRecords.map((record) => record.handoverCaseId);
    const [reviewRecords, followUpRecords, archiveReviewRecords, archiveStatusRecords] = await Promise.all([
      db
        .select({
          handoverCaseId: handoverReviews.handoverCaseId,
          outcome: handoverReviews.outcome,
          updatedAt: handoverReviews.updatedAt
        })
        .from(handoverReviews)
        .where(inArray(handoverReviews.handoverCaseId, handoverCaseIds)),
      db
        .select({
          handoverCaseId: handoverPostCompletionFollowUps.handoverCaseId,
          status: handoverPostCompletionFollowUps.status,
          updatedAt: handoverPostCompletionFollowUps.updatedAt
        })
        .from(handoverPostCompletionFollowUps)
        .where(inArray(handoverPostCompletionFollowUps.handoverCaseId, handoverCaseIds)),
      db
        .select({
          handoverCaseId: handoverArchiveReviews.handoverCaseId,
          outcome: handoverArchiveReviews.outcome,
          updatedAt: handoverArchiveReviews.updatedAt
        })
        .from(handoverArchiveReviews)
        .where(inArray(handoverArchiveReviews.handoverCaseId, handoverCaseIds)),
      db
        .select({
          handoverCaseId: handoverArchiveStatuses.handoverCaseId,
          status: handoverArchiveStatuses.status,
          updatedAt: handoverArchiveStatuses.updatedAt
        })
        .from(handoverArchiveStatuses)
        .where(inArray(handoverArchiveStatuses.handoverCaseId, handoverCaseIds))
    ]);

    const reviewMap = new Map(reviewRecords.map((record) => [record.handoverCaseId, record]));
    const followUpMap = new Map(followUpRecords.map((record) => [record.handoverCaseId, record]));
    const archiveReviewMap = new Map(archiveReviewRecords.map((record) => [record.handoverCaseId, record]));
    const archiveStatusMap = new Map(archiveStatusRecords.map((record) => [record.handoverCaseId, record]));

    return new Map(
      linkedHandoverRecords
        .map((record) => {
          const summary = deriveHandoverClosureSummary(
            {
              handoverCaseId: record.handoverCaseId,
              status: toHandoverCaseStatus(record.status),
              updatedAt: record.updatedAt
            },
            reviewMap.get(record.handoverCaseId),
            followUpMap.get(record.handoverCaseId),
            archiveReviewMap.get(record.handoverCaseId),
            archiveStatusMap.get(record.handoverCaseId)
          );

          return summary ? [record.caseId, summary] : null;
        })
        .filter((entry): entry is [string, PersistedHandoverClosureSummary] => entry !== null)
    );
  };

  const listLinkedHandoverCases = async (caseIds: string[]) => {
    const caseIdsWithValues = caseIds.filter(Boolean);

    if (caseIdsWithValues.length === 0) {
      return new Map<string, PersistedLinkedHandoverCase>();
    }

    const linkedHandoverRecords = await db
      .select({
        caseId: handoverCases.caseId,
        createdAt: handoverCases.createdAt,
        handoverCaseId: handoverCases.id,
        ownerName: handoverCases.ownerName,
        status: handoverCases.status,
        updatedAt: handoverCases.updatedAt
      })
      .from(handoverCases)
      .where(inArray(handoverCases.caseId, caseIdsWithValues));

    return new Map(
      linkedHandoverRecords.map((record) => [
        record.caseId,
        hydrateLinkedHandoverCase({
          createdAt: record.createdAt,
          handoverCaseId: record.handoverCaseId,
          ownerName: record.ownerName,
          status: record.status,
          updatedAt: record.updatedAt
        })
      ])
    );
  };

  const listCurrentQaReviews = async (caseIds: string[]) => {
    const caseIdsWithValues = caseIds.filter(Boolean);

    if (caseIdsWithValues.length === 0) {
      return new Map<string, PersistedCaseQaReview>();
    }

    const records = await db
      .select({
        caseId: caseQaReviews.caseId,
        createdAt: caseQaReviews.createdAt,
        draftMessage: caseQaReviews.draftMessage,
        policySignals: caseQaReviews.policySignals,
        qaReviewId: caseQaReviews.id,
        requestedByName: caseQaReviews.requestedByName,
        reviewSummary: caseQaReviews.reviewSummary,
        reviewedAt: caseQaReviews.reviewedAt,
        reviewerName: caseQaReviews.reviewerName,
        sampleSummary: caseQaReviews.sampleSummary,
        status: caseQaReviews.status,
        subjectType: caseQaReviews.subjectType,
        triggerEvidence: caseQaReviews.triggerEvidence,
        triggerSource: caseQaReviews.triggerSource,
        updatedAt: caseQaReviews.updatedAt
      })
      .from(caseQaReviews)
      .where(inArray(caseQaReviews.caseId, caseIdsWithValues))
      .orderBy(desc(caseQaReviews.createdAt), desc(caseQaReviews.updatedAt));

    const latestReviews = new Map<string, PersistedCaseQaReview>();

    for (const record of records) {
      if (!latestReviews.has(record.caseId)) {
        latestReviews.set(record.caseId, hydrateCaseQaReview(record));
      }
    }

    return latestReviews;
  };

  const listLatestCaseReplies = async (caseIds: string[]) => {
    const caseIdsWithValues = caseIds.filter(Boolean);

    if (caseIdsWithValues.length === 0) {
      return new Map<string, PersistedLatestCaseReply>();
    }

    const records = await db
      .select({
        caseId: auditEvents.caseId,
        createdAt: auditEvents.createdAt,
        payload: auditEvents.payload
      })
      .from(auditEvents)
      .where(and(inArray(auditEvents.caseId, caseIdsWithValues), eq(auditEvents.eventType, "case_reply_sent")))
      .orderBy(desc(auditEvents.createdAt));

    const latestReplies = new Map<string, PersistedLatestCaseReply>();

    for (const record of records) {
      if (!latestReplies.has(record.caseId)) {
        const hydratedReply = hydrateLatestCaseReply(record);

        if (hydratedReply) {
          latestReplies.set(record.caseId, hydratedReply);
        }
      }
    }

    return latestReplies;
  };

  const listLatestManagerFollowUps = async (caseIds: string[]) => {
    const caseIdsWithValues = caseIds.filter(Boolean);

    if (caseIdsWithValues.length === 0) {
      return new Map<string, PersistedLatestManagerFollowUp>();
    }

    const records = await db
      .select({
        caseId: auditEvents.caseId,
        createdAt: auditEvents.createdAt,
        payload: auditEvents.payload
      })
      .from(auditEvents)
      .where(and(inArray(auditEvents.caseId, caseIdsWithValues), eq(auditEvents.eventType, "manager_follow_up_updated")))
      .orderBy(desc(auditEvents.createdAt));

    const latestFollowUps = new Map<string, PersistedLatestManagerFollowUp>();

    for (const record of records) {
      if (!latestFollowUps.has(record.caseId)) {
        const hydratedFollowUp = hydrateLatestManagerFollowUp(record);

        if (hydratedFollowUp) {
          latestFollowUps.set(record.caseId, hydratedFollowUp);
        }
      }
    }

    return latestFollowUps;
  };

  const listCaseChannelSummaries = async (caseIds: string[]) => {
    const caseIdsWithValues = caseIds.filter(Boolean);

    if (caseIdsWithValues.length === 0) {
      return new Map<string, PersistedCaseChannelSummary>();
    }

    const records = await db
      .select({
        caseId: caseChannelStates.caseId,
        channel: caseChannelStates.channel,
        contactValue: caseChannelStates.contactValue,
        lastInboundAt: caseChannelStates.lastInboundAt,
        latestOutboundBlockReason: caseChannelStates.latestOutboundBlockReason,
        latestOutboundFailureCode: caseChannelStates.latestOutboundFailureCode,
        latestOutboundFailureDetail: caseChannelStates.latestOutboundFailureDetail,
        latestOutboundMessage: caseChannelStates.latestOutboundMessage,
        latestOutboundProviderMessageId: caseChannelStates.latestOutboundProviderMessageId,
        latestOutboundStatus: caseChannelStates.latestOutboundStatus,
        latestOutboundUpdatedAt: caseChannelStates.latestOutboundUpdatedAt,
        provider: caseChannelStates.provider
      })
      .from(caseChannelStates)
      .where(inArray(caseChannelStates.caseId, caseIdsWithValues));

    return new Map(records.map((record) => [record.caseId, hydrateCaseChannelSummary(record)]));
  };

  const listVisitBookingsByCaseId = async (caseIds: string[]) => {
    const caseIdsWithValues = caseIds.filter(Boolean);

    if (caseIdsWithValues.length === 0) {
      return new Map<string, PersistedVisitBooking>();
    }

    const records = await db
      .select({
        caseId: visits.caseId,
        confirmedAt: visitBookings.confirmedAt,
        failureCode: visitBookings.failureCode,
        failureDetail: visitBookings.failureDetail,
        provider: visitBookings.provider,
        providerEventId: visitBookings.providerEventId,
        status: visitBookings.status,
        updatedAt: visitBookings.updatedAt
      })
      .from(visitBookings)
      .innerJoin(visits, eq(visitBookings.visitId, visits.id))
      .where(inArray(visits.caseId, caseIdsWithValues));

    return new Map(records.map((record) => [record.caseId, hydrateVisitBooking(record)]));
  };

  const listLatestCaseAgentRuns = async (caseIds: string[]) => {
    const caseIdsWithValues = caseIds.filter(Boolean);

    if (caseIdsWithValues.length === 0) {
      return new Map<string, PersistedCaseAgentRun>();
    }

    const records = await db
      .select({
        actionType: caseAgentRuns.actionType,
        blockedReason: caseAgentRuns.blockedReason,
        caseId: caseAgentRuns.caseId,
        confidencePercent: caseAgentRuns.confidencePercent,
        createdAt: caseAgentRuns.createdAt,
        escalationReason: caseAgentRuns.escalationReason,
        finishedAt: caseAgentRuns.finishedAt,
        modelMode: caseAgentRuns.modelMode,
        proposedMessage: caseAgentRuns.proposedMessage,
        proposedNextAction: caseAgentRuns.proposedNextAction,
        proposedNextActionDueAt: caseAgentRuns.proposedNextActionDueAt,
        rationaleSummary: caseAgentRuns.rationaleSummary,
        riskLevel: caseAgentRuns.riskLevel,
        runId: caseAgentRuns.id,
        startedAt: caseAgentRuns.startedAt,
        status: caseAgentRuns.status,
        toolExecutionStatus: caseAgentRuns.toolExecutionStatus,
        triggerType: caseAgentRuns.triggerType,
        updatedAt: caseAgentRuns.updatedAt
      })
      .from(caseAgentRuns)
      .where(inArray(caseAgentRuns.caseId, caseIdsWithValues))
      .orderBy(desc(caseAgentRuns.createdAt), desc(caseAgentRuns.updatedAt));

    const latestRuns = new Map<string, PersistedCaseAgentRun>();

    for (const record of records) {
      if (!latestRuns.has(record.caseId)) {
        latestRuns.set(record.caseId, hydrateCaseAgentRun(record));
      }
    }

    return latestRuns;
  };

  const listCaseAgentWakeUps = async (caseIds: string[]) => {
    const caseIdsWithValues = caseIds.filter(Boolean);

    if (caseIdsWithValues.length === 0) {
      return new Map<string, string>();
    }

    const records = await db
      .select({
        caseId: automationJobs.caseId,
        runAfter: automationJobs.runAfter
      })
      .from(automationJobs)
      .where(
        and(
          inArray(automationJobs.caseId, caseIdsWithValues),
          inArray(automationJobs.jobType, [caseAgentJobType, followUpWatchJobType]),
          eq(automationJobs.status, "queued")
        )
      )
      .orderBy(asc(automationJobs.runAfter));

    const wakeUps = new Map<string, string>();

    for (const record of records) {
      if (!wakeUps.has(record.caseId)) {
        wakeUps.set(record.caseId, toIsoDateTimeString(record.runAfter));
      }
    }

    return wakeUps;
  };

  const listCurrentHandoverCustomerUpdateQaReviews = async (caseIds: string[]) => {
    const caseIdsWithValues = caseIds.filter(Boolean);

    if (caseIdsWithValues.length === 0) {
      return new Map<string, PersistedCurrentHandoverCustomerUpdateQaReview>();
    }

    const records = await db
      .select({
        caseId: handoverCases.caseId,
        customerUpdateId: handoverCustomerUpdates.id,
        deliverySummary: handoverCustomerUpdates.deliverySummary,
        handoverCaseId: handoverCustomerUpdates.handoverCaseId,
        policySignals: handoverCustomerUpdates.qaPolicySignals,
        reviewSampleSummary: handoverCustomerUpdates.qaReviewSampleSummary,
        reviewStatus: handoverCustomerUpdates.qaReviewStatus,
        reviewSummary: handoverCustomerUpdates.qaReviewSummary,
        reviewedAt: handoverCustomerUpdates.qaReviewedAt,
        reviewerName: handoverCustomerUpdates.qaReviewerName,
        triggerEvidence: handoverCustomerUpdates.qaTriggerEvidence,
        type: handoverCustomerUpdates.type,
        updatedAt: handoverCustomerUpdates.updatedAt
      })
      .from(handoverCustomerUpdates)
      .innerJoin(handoverCases, eq(handoverCustomerUpdates.handoverCaseId, handoverCases.id))
      .where(and(inArray(handoverCases.caseId, caseIdsWithValues), inArray(handoverCustomerUpdates.qaReviewStatus, [
        "pending_review",
        "follow_up_required",
        "approved"
      ])))
      .orderBy(desc(handoverCustomerUpdates.updatedAt), desc(handoverCustomerUpdates.createdAt));

    const latestReviews = new Map<string, PersistedCurrentHandoverCustomerUpdateQaReview>();

    for (const record of records) {
      const hydratedReview = hydrateCurrentHandoverCustomerUpdateQaReview(record);
      const existingReview = latestReviews.get(record.caseId);

      if (!existingReview) {
        latestReviews.set(record.caseId, hydratedReview);
        continue;
      }

      const nextPriority = getCurrentHandoverCustomerUpdateQaPriority(hydratedReview.reviewStatus);
      const existingPriority = getCurrentHandoverCustomerUpdateQaPriority(existingReview.reviewStatus);

      if (
        nextPriority < existingPriority ||
        (nextPriority === existingPriority && new Date(hydratedReview.updatedAt).getTime() > new Date(existingReview.updatedAt).getTime())
      ) {
        latestReviews.set(record.caseId, hydratedReview);
      }
    }

    return latestReviews;
  };

  const listGovernanceAuditEvents = async (windowStart: string) =>
    db
      .select({
        caseId: auditEvents.caseId,
        createdAt: auditEvents.createdAt,
        customerName: leads.customerName,
        eventType: auditEvents.eventType,
        payload: auditEvents.payload
      })
      .from(auditEvents)
      .innerJoin(cases, eq(auditEvents.caseId, cases.id))
      .innerJoin(leads, eq(cases.leadId, leads.id))
      .where(
        and(
          gte(auditEvents.createdAt, windowStart),
          inArray(auditEvents.eventType, [
            "qa_review_requested",
            "qa_review_policy_opened",
            "qa_review_resolved",
            "handover_customer_update_qa_review_requested",
            "handover_customer_update_qa_review_resolved"
          ])
        )
      )
      .orderBy(desc(auditEvents.createdAt));

  const listGovernanceEvents = async (input: ListGovernanceEventsQuery): Promise<PersistedGovernanceEventList> => {
    const now = new Date();
    const windowStartDate = new Date(now);
    windowStartDate.setUTCHours(0, 0, 0, 0);
    windowStartDate.setUTCDate(windowStartDate.getUTCDate() - (input.windowDays - 1));

    const windowStart = windowStartDate.toISOString();
    const windowEnd = now.toISOString();
    const governanceEventRecords = await listGovernanceAuditEvents(windowStart);
    const normalizedEvents = governanceEventRecords
      .map((record) => hydrateGovernanceEventRecord(record))
      .filter((record): record is PersistedGovernanceEventRecord => record !== null)
      .filter((record) => {
        if (input.action && record.action !== input.action) {
          return false;
        }

        if (input.kind && record.kind !== input.kind) {
          return false;
        }

        if (input.status && record.status !== input.status) {
          return false;
        }

        if (input.subjectType && record.subjectType !== input.subjectType) {
          return false;
        }

        if (input.triggerSource && record.triggerSource !== input.triggerSource) {
          return false;
        }

        return true;
      });

    return {
      generatedAt: windowEnd,
      items: normalizedEvents.slice(0, input.limit),
      totalCount: normalizedEvents.length,
      windowEnd,
      windowStart
    };
  };

  const getGovernanceSummary = async (): Promise<PersistedGovernanceSummary> => {
    const now = new Date();
    const windowStartDate = new Date(now);
    windowStartDate.setUTCHours(0, 0, 0, 0);
    windowStartDate.setUTCDate(windowStartDate.getUTCDate() - 6);

    const windowStart = windowStartDate.toISOString();
    const windowEnd = now.toISOString();

    const caseIdRecords = await db.select({ caseId: cases.id }).from(cases);
    const caseIds = caseIdRecords.map((record) => record.caseId);
    const [currentQaReviews, currentHandoverCustomerUpdateQaReviews, governanceEventRecords] = await Promise.all([
      listCurrentQaReviews(caseIds),
      listCurrentHandoverCustomerUpdateQaReviews(caseIds),
      listGovernanceAuditEvents(windowStart)
    ]);

    const currentOpenItems = {
      caseMessageCount: 0,
      followUpRequiredCount: 0,
      handoverCustomerUpdateCount: 0,
      pendingCount: 0,
      stalePendingCount: 0,
      totalCount: 0
    };
    const openedItems = {
      caseMessageCount: 0,
      handoverCustomerUpdateCount: 0,
      manualCaseMessageCount: 0,
      policyTriggeredCaseMessageCount: 0,
      totalCount: 0
    };
    const resolvedItems = {
      approvedCount: 0,
      caseMessageCount: 0,
      followUpRequiredCount: 0,
      handoverCustomerUpdateCount: 0,
      totalCount: 0
    };
    const dailyActivityMap = new Map<
      string,
      {
        date: string;
        openedCaseMessageCount: number;
        openedCount: number;
        openedHandoverCustomerUpdateCount: number;
        resolvedApprovedCount: number;
        resolvedCaseMessageCount: number;
        resolvedCount: number;
        resolvedFollowUpRequiredCount: number;
        resolvedHandoverCustomerUpdateCount: number;
      }
    >();
    const recentEvents: PersistedGovernanceSummary["recentEvents"] = [];
    const signalCounts = new Map<string, PersistedGovernanceSummary["topPolicySignals"][number]>();

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(now);
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - offset);

      const dateKey = date.toISOString().slice(0, 10);

      dailyActivityMap.set(dateKey, {
        date: dateKey,
        openedCaseMessageCount: 0,
        openedCount: 0,
        openedHandoverCustomerUpdateCount: 0,
        resolvedApprovedCount: 0,
        resolvedCaseMessageCount: 0,
        resolvedCount: 0,
        resolvedFollowUpRequiredCount: 0,
        resolvedHandoverCustomerUpdateCount: 0
      });
    }

    for (const qaReview of currentQaReviews.values()) {
      if (qaReview.status !== "pending_review" && qaReview.status !== "follow_up_required") {
        continue;
      }

      currentOpenItems.caseMessageCount += 1;
      currentOpenItems.totalCount += 1;

      if (qaReview.status === "pending_review") {
        currentOpenItems.pendingCount += 1;

        if (now.getTime() - new Date(qaReview.updatedAt).getTime() >= 24 * 60 * 60 * 1000) {
          currentOpenItems.stalePendingCount += 1;
        }
      } else {
        currentOpenItems.followUpRequiredCount += 1;
      }
    }

    for (const qaReview of currentHandoverCustomerUpdateQaReviews.values()) {
      if (qaReview.reviewStatus !== "pending_review" && qaReview.reviewStatus !== "follow_up_required") {
        continue;
      }

      currentOpenItems.handoverCustomerUpdateCount += 1;
      currentOpenItems.totalCount += 1;

      if (qaReview.reviewStatus === "pending_review") {
        currentOpenItems.pendingCount += 1;

        if (now.getTime() - new Date(qaReview.updatedAt).getTime() >= 24 * 60 * 60 * 1000) {
          currentOpenItems.stalePendingCount += 1;
        }
      } else {
        currentOpenItems.followUpRequiredCount += 1;
      }
    }

    for (const record of governanceEventRecords) {
      const normalizedEvent = hydrateGovernanceEventRecord(record);

      if (!normalizedEvent) {
        continue;
      }

      if (recentEvents.length < 8) {
        recentEvents.push(toGovernanceRecentEvent(normalizedEvent));
      }

      const dailyActivity = dailyActivityMap.get(normalizedEvent.createdAt.slice(0, 10));

      if (normalizedEvent.action === "opened") {
        openedItems.totalCount += 1;

        if (normalizedEvent.kind === "case_message") {
          openedItems.caseMessageCount += 1;

          if (normalizedEvent.triggerSource === "policy_rule") {
            openedItems.policyTriggeredCaseMessageCount += 1;
          } else {
            openedItems.manualCaseMessageCount += 1;
          }
        } else {
          openedItems.handoverCustomerUpdateCount += 1;
        }

        if (dailyActivity) {
          dailyActivity.openedCount += 1;

          if (normalizedEvent.kind === "case_message") {
            dailyActivity.openedCaseMessageCount += 1;
          } else {
            dailyActivity.openedHandoverCustomerUpdateCount += 1;
          }
        }

        for (const signal of normalizedEvent.policySignals) {
          const key = `${normalizedEvent.kind}:${signal}`;
          const currentSignalCount = signalCounts.get(key);

          signalCounts.set(key, {
            count: (currentSignalCount?.count ?? 0) + 1,
            kind: normalizedEvent.kind,
            signal
          });
        }

        continue;
      }

      resolvedItems.totalCount += 1;

      if (normalizedEvent.kind === "case_message") {
        resolvedItems.caseMessageCount += 1;
        if (dailyActivity) {
          dailyActivity.resolvedCaseMessageCount += 1;
        }
      } else {
        resolvedItems.handoverCustomerUpdateCount += 1;
        if (dailyActivity) {
          dailyActivity.resolvedHandoverCustomerUpdateCount += 1;
        }
      }

      if (normalizedEvent.status === "approved") {
        resolvedItems.approvedCount += 1;
      }

      if (normalizedEvent.status === "follow_up_required") {
        resolvedItems.followUpRequiredCount += 1;
      }

      if (dailyActivity) {
        dailyActivity.resolvedCount += 1;

        if (normalizedEvent.status === "approved") {
          dailyActivity.resolvedApprovedCount += 1;
        }

        if (normalizedEvent.status === "follow_up_required") {
          dailyActivity.resolvedFollowUpRequiredCount += 1;
        }
      }
    }

    return {
      currentOpenItems,
      dailyActivity: [...dailyActivityMap.values()],
      generatedAt: windowEnd,
      openedItems,
      recentEvents,
      resolvedItems,
      topPolicySignals: [...signalCounts.values()]
        .sort((left, right) => {
          if (left.count !== right.count) {
            return right.count - left.count;
          }

          if (left.kind !== right.kind) {
            return left.kind.localeCompare(right.kind);
          }

          return left.signal.localeCompare(right.signal);
        })
        .slice(0, 5),
      windowEnd,
      windowStart
    };
  };

  const getPersistedCaseDetail = async (caseId: string): Promise<PersistedCaseDetail | null> => {
    const persistedCase = await db
      .select({
        automationStatus: cases.automationStatus,
        budget: leads.budget,
        caseId: cases.id,
        createdAt: cases.createdAt,
        customerName: leads.customerName,
        email: leads.email,
        message: leads.message,
        nextAction: cases.currentNextAction,
        nextActionDueAt: cases.nextActionDueAt,
        ownerName: cases.ownerName,
        phone: leads.phone,
        preferredLocale: leads.preferredLocale,
        projectInterest: leads.projectInterest,
        source: leads.source,
        stage: cases.stage,
        updatedAt: cases.updatedAt
      })
      .from(cases)
      .innerJoin(leads, eq(cases.leadId, leads.id))
      .where(eq(cases.id, caseId))
      .limit(1);

    const caseRecord = persistedCase[0];

    if (!caseRecord) {
      return null;
    }

    const [
      caseAuditEvents,
      qualificationRecord,
      currentVisit,
      persistedDocumentRequests,
      persistedInterventions,
      persistedQaReviews,
      persistedCaseAgentMemory,
      persistedCaseAgentRuns,
      channelSummaryMap,
      caseAgentWakeUpMap,
      currentHandoverCustomerUpdateQaReviewMap,
      linkedHandoverCase,
      handoverClosureMap,
      visitBookingMap
    ] = await Promise.all([
        db
          .select({
            createdAt: auditEvents.createdAt,
            eventType: auditEvents.eventType,
            payload: auditEvents.payload
          })
          .from(auditEvents)
          .where(eq(auditEvents.caseId, caseId))
          .orderBy(asc(auditEvents.createdAt)),
        db
          .select({
            budgetBand: qualificationSnapshots.budgetBand,
            intentSummary: qualificationSnapshots.intentSummary,
            moveInTimeline: qualificationSnapshots.moveInTimeline,
            readiness: qualificationSnapshots.readiness,
            updatedAt: qualificationSnapshots.updatedAt
          })
          .from(qualificationSnapshots)
          .where(eq(qualificationSnapshots.caseId, caseId))
          .limit(1),
        db
          .select({
            createdAt: visits.createdAt,
            location: visits.location,
            scheduledAt: visits.scheduledAt,
            visitId: visits.id
          })
          .from(visits)
          .where(eq(visits.caseId, caseId))
          .orderBy(desc(visits.scheduledAt))
          .limit(1),
        db
          .select({
            createdAt: documentRequests.createdAt,
            documentRequestId: documentRequests.id,
            status: documentRequests.status,
            type: documentRequests.type,
            updatedAt: documentRequests.updatedAt
          })
          .from(documentRequests)
          .where(eq(documentRequests.caseId, caseId))
          .orderBy(asc(documentRequests.createdAt)),
        db
          .select({
            createdAt: managerInterventions.createdAt,
            interventionId: managerInterventions.id,
            resolutionNote: managerInterventions.resolutionNote,
            resolvedAt: managerInterventions.resolvedAt,
            severity: managerInterventions.severity,
            status: managerInterventions.status,
            summary: managerInterventions.summary,
            type: managerInterventions.type
          })
          .from(managerInterventions)
          .where(eq(managerInterventions.caseId, caseId))
          .orderBy(desc(managerInterventions.createdAt)),
        db
          .select({
            createdAt: caseQaReviews.createdAt,
            draftMessage: caseQaReviews.draftMessage,
            policySignals: caseQaReviews.policySignals,
            qaReviewId: caseQaReviews.id,
            requestedByName: caseQaReviews.requestedByName,
            reviewSummary: caseQaReviews.reviewSummary,
            reviewedAt: caseQaReviews.reviewedAt,
            reviewerName: caseQaReviews.reviewerName,
            sampleSummary: caseQaReviews.sampleSummary,
            status: caseQaReviews.status,
            subjectType: caseQaReviews.subjectType,
            triggerEvidence: caseQaReviews.triggerEvidence,
            triggerSource: caseQaReviews.triggerSource,
            updatedAt: caseQaReviews.updatedAt
          })
          .from(caseQaReviews)
          .where(eq(caseQaReviews.caseId, caseId))
          .orderBy(desc(caseQaReviews.createdAt), desc(caseQaReviews.updatedAt)),
        db
          .select({
            activeRiskFlags: caseAgentMemories.activeRiskFlags,
            caseId: caseAgentMemories.caseId,
            documentGapSummary: caseAgentMemories.documentGapSummary,
            lastDecisionSummary: caseAgentMemories.lastDecisionSummary,
            lastInboundAt: caseAgentMemories.lastInboundAt,
            lastObjectionSummary: caseAgentMemories.lastObjectionSummary,
            lastSuccessfulOutboundAt: caseAgentMemories.lastSuccessfulOutboundAt,
            latestIntentSummary: caseAgentMemories.latestIntentSummary,
            qualificationSummary: caseAgentMemories.qualificationSummary,
            updatedAt: caseAgentMemories.updatedAt
          })
          .from(caseAgentMemories)
          .where(eq(caseAgentMemories.caseId, caseId))
          .limit(1),
        db
          .select({
            actionType: caseAgentRuns.actionType,
            blockedReason: caseAgentRuns.blockedReason,
            confidencePercent: caseAgentRuns.confidencePercent,
            createdAt: caseAgentRuns.createdAt,
            escalationReason: caseAgentRuns.escalationReason,
            finishedAt: caseAgentRuns.finishedAt,
            modelMode: caseAgentRuns.modelMode,
            proposedMessage: caseAgentRuns.proposedMessage,
            proposedNextAction: caseAgentRuns.proposedNextAction,
            proposedNextActionDueAt: caseAgentRuns.proposedNextActionDueAt,
            rationaleSummary: caseAgentRuns.rationaleSummary,
            riskLevel: caseAgentRuns.riskLevel,
            runId: caseAgentRuns.id,
            startedAt: caseAgentRuns.startedAt,
            status: caseAgentRuns.status,
            toolExecutionStatus: caseAgentRuns.toolExecutionStatus,
            triggerType: caseAgentRuns.triggerType,
            updatedAt: caseAgentRuns.updatedAt
          })
          .from(caseAgentRuns)
          .where(eq(caseAgentRuns.caseId, caseId))
          .orderBy(desc(caseAgentRuns.createdAt), desc(caseAgentRuns.updatedAt))
          .limit(12),
        listCaseChannelSummaries([caseId]),
        listCaseAgentWakeUps([caseId]),
        listCurrentHandoverCustomerUpdateQaReviews([caseId]),
        db
          .select({
            createdAt: handoverCases.createdAt,
            handoverCaseId: handoverCases.id,
            ownerName: handoverCases.ownerName,
            status: handoverCases.status,
            updatedAt: handoverCases.updatedAt
          })
          .from(handoverCases)
          .where(eq(handoverCases.caseId, caseId))
          .limit(1),
        listHandoverClosureSummaries([caseId]),
        listVisitBookingsByCaseId([caseId])
      ]);

    const hydratedInterventions = persistedInterventions.map((intervention) => hydrateManagerIntervention(intervention));
    const hydratedQaReviews = persistedQaReviews.map((qaReview) => hydrateCaseQaReview(qaReview));
    const hydratedAgentRuns = persistedCaseAgentRuns.map((agentRun) => hydrateCaseAgentRun(agentRun));
    const currentQaReview = hydratedQaReviews[0] ?? null;
    const latestHumanReply = caseAuditEvents
      .filter((event) => event.eventType === "case_reply_sent")
      .map((event) => hydrateLatestCaseReply({ caseId, createdAt: event.createdAt, payload: event.payload }))
      .find((reply): reply is PersistedLatestCaseReply => reply !== null) ?? null;
    const latestManagerFollowUp = caseAuditEvents
      .filter((event) => event.eventType === "manager_follow_up_updated")
      .map((event) => hydrateLatestManagerFollowUp({ caseId, createdAt: event.createdAt, payload: event.payload }))
      .find((followUp): followUp is PersistedLatestManagerFollowUp => followUp !== null) ?? null;

    return {
      agentMemory: persistedCaseAgentMemory[0] ? hydrateCaseAgentMemory(persistedCaseAgentMemory[0]) : null,
      agentRuns: hydratedAgentRuns,
      agentState: buildPersistedCaseAgentState(hydratedAgentRuns[0] ?? null, caseAgentWakeUpMap.get(caseId) ?? null),
      auditEvents: caseAuditEvents.map((event) => ({
        createdAt: toIsoDateTimeString(event.createdAt),
        eventType: event.eventType,
        payload: event.payload
      })),
      automationHoldReason: getCaseAutomationHoldReason(currentQaReview),
      automationStatus: toAutomationStatus(caseRecord.automationStatus),
      budget: caseRecord.budget,
      caseId: caseRecord.caseId,
      channelSummary: channelSummaryMap.get(caseId) ?? null,
      createdAt: toIsoDateTimeString(caseRecord.createdAt),
      currentHandoverCustomerUpdateQaReview: currentHandoverCustomerUpdateQaReviewMap.get(caseId) ?? null,
      currentQaReview,
      currentVisit: currentVisit[0]
        ? {
            booking: visitBookingMap.get(caseId) ?? null,
            createdAt: currentVisit[0].createdAt,
            location: currentVisit[0].location,
            scheduledAt: currentVisit[0].scheduledAt,
            visitId: currentVisit[0].visitId
          }
        : null,
      customerName: caseRecord.customerName,
      documentRequests: persistedDocumentRequests.map((documentRequest) => ({
        createdAt: documentRequest.createdAt,
        documentRequestId: documentRequest.documentRequestId,
        status: toDocumentRequestStatus(documentRequest.status),
        type: toDocumentRequestType(documentRequest.type),
        updatedAt: documentRequest.updatedAt
      })),
      email: caseRecord.email,
      followUpStatus: toFollowUpStatus(caseRecord.nextActionDueAt),
      handoverClosure: handoverClosureMap.get(caseId) ?? null,
      handoverCase: linkedHandoverCase[0] ? hydrateLinkedHandoverCase(linkedHandoverCase[0]) : null,
      latestHumanReply,
      latestManagerFollowUp,
      managerInterventions: hydratedInterventions,
      message: caseRecord.message,
      nextAction: caseRecord.nextAction,
      nextActionDueAt: toIsoDateTimeString(caseRecord.nextActionDueAt),
      openInterventionsCount: hydratedInterventions.filter((intervention) => intervention.status === "open").length,
      ownerName: caseRecord.ownerName,
      phone: caseRecord.phone,
      preferredLocale: toSupportedLocale(caseRecord.preferredLocale),
      projectInterest: caseRecord.projectInterest,
      qaReviews: hydratedQaReviews,
      qualificationSnapshot: qualificationRecord[0]
        ? {
            budgetBand: qualificationRecord[0].budgetBand,
            intentSummary: qualificationRecord[0].intentSummary,
            moveInTimeline: qualificationRecord[0].moveInTimeline,
            readiness: toQualificationReadiness(qualificationRecord[0].readiness),
            updatedAt: qualificationRecord[0].updatedAt
          }
        : null,
      source: toLeadSource(caseRecord.source),
      stage: toCaseStage(caseRecord.stage),
      updatedAt: toIsoDateTimeString(caseRecord.updatedAt)
    };
  };

  const listOpenInterventionCounts = async (caseIds: string[]) => {
    if (caseIds.length === 0) {
      return new Map<string, number>();
    }

    const records = await db
      .select({
        caseId: managerInterventions.caseId
      })
      .from(managerInterventions)
      .where(and(inArray(managerInterventions.caseId, caseIds), eq(managerInterventions.status, "open")));

    return records.reduce((counts, record) => {
      counts.set(record.caseId, (counts.get(record.caseId) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());
  };

  const resolveOpenInterventions = async (
    transaction: AlphaTransaction,
    input: {
      caseId: string;
      resolutionNote: string;
      resolvedAt: string;
    }
  ) => {
    await transaction
      .update(managerInterventions)
      .set({
        resolutionNote: input.resolutionNote,
        resolvedAt: input.resolvedAt,
        status: "resolved",
        updatedAt: input.resolvedAt
      })
      .where(
        and(
          eq(managerInterventions.caseId, input.caseId),
          eq(managerInterventions.status, "open"),
          eq(managerInterventions.type, "follow_up_overdue")
        )
      );
  };

  const syncFollowUpJob = async (
    transaction: AlphaTransaction,
    input: {
      automationHoldReason: CaseAutomationHoldReason | null;
      automationStatus: AutomationStatus;
      caseId: string;
      runAfter: string;
      updatedAt: string;
    }
  ) => {
    await transaction
      .update(automationJobs)
      .set({
        status: "cancelled",
        updatedAt: input.updatedAt
      })
      .where(
        and(eq(automationJobs.caseId, input.caseId), eq(automationJobs.jobType, followUpWatchJobType), eq(automationJobs.status, "queued"))
      );

    if (input.automationStatus === "paused" || input.automationHoldReason !== null) {
      return;
    }

    await transaction.insert(automationJobs).values({
      attempts: 0,
      caseId: input.caseId,
      createdAt: input.updatedAt,
      id: randomUUID(),
      jobType: followUpWatchJobType,
      payload: {},
      runAfter: input.runAfter,
      status: "queued",
      updatedAt: input.updatedAt
    });
  };

  const mergeCaseAgentMemory = async (
    transaction: AlphaTransaction,
    caseId: string,
    input: Partial<Omit<PersistedCaseAgentMemory, "updatedAt">> & {
      updatedAt: string;
    }
  ) => {
    const existingRecord = await transaction
      .select({
        activeRiskFlags: caseAgentMemories.activeRiskFlags,
        documentGapSummary: caseAgentMemories.documentGapSummary,
        lastDecisionSummary: caseAgentMemories.lastDecisionSummary,
        lastInboundAt: caseAgentMemories.lastInboundAt,
        lastObjectionSummary: caseAgentMemories.lastObjectionSummary,
        lastSuccessfulOutboundAt: caseAgentMemories.lastSuccessfulOutboundAt,
        latestIntentSummary: caseAgentMemories.latestIntentSummary,
        qualificationSummary: caseAgentMemories.qualificationSummary
      })
      .from(caseAgentMemories)
      .where(eq(caseAgentMemories.caseId, caseId))
      .limit(1);

    await transaction
      .insert(caseAgentMemories)
      .values({
        activeRiskFlags: input.activeRiskFlags ?? existingRecord[0]?.activeRiskFlags ?? [],
        caseId,
        documentGapSummary:
          input.documentGapSummary === undefined ? existingRecord[0]?.documentGapSummary ?? null : input.documentGapSummary,
        lastDecisionSummary:
          input.lastDecisionSummary === undefined ? existingRecord[0]?.lastDecisionSummary ?? null : input.lastDecisionSummary,
        lastInboundAt: input.lastInboundAt === undefined ? existingRecord[0]?.lastInboundAt ?? null : input.lastInboundAt,
        lastObjectionSummary:
          input.lastObjectionSummary === undefined ? existingRecord[0]?.lastObjectionSummary ?? null : input.lastObjectionSummary,
        lastSuccessfulOutboundAt:
          input.lastSuccessfulOutboundAt === undefined
            ? existingRecord[0]?.lastSuccessfulOutboundAt ?? null
            : input.lastSuccessfulOutboundAt,
        latestIntentSummary:
          input.latestIntentSummary === undefined ? existingRecord[0]?.latestIntentSummary ?? null : input.latestIntentSummary,
        qualificationSummary:
          input.qualificationSummary === undefined ? existingRecord[0]?.qualificationSummary ?? null : input.qualificationSummary,
        updatedAt: input.updatedAt
      })
      .onConflictDoUpdate({
        set: {
          activeRiskFlags: input.activeRiskFlags ?? existingRecord[0]?.activeRiskFlags ?? [],
          documentGapSummary:
            input.documentGapSummary === undefined ? existingRecord[0]?.documentGapSummary ?? null : input.documentGapSummary,
          lastDecisionSummary:
            input.lastDecisionSummary === undefined ? existingRecord[0]?.lastDecisionSummary ?? null : input.lastDecisionSummary,
          lastInboundAt: input.lastInboundAt === undefined ? existingRecord[0]?.lastInboundAt ?? null : input.lastInboundAt,
          lastObjectionSummary:
            input.lastObjectionSummary === undefined ? existingRecord[0]?.lastObjectionSummary ?? null : input.lastObjectionSummary,
          lastSuccessfulOutboundAt:
            input.lastSuccessfulOutboundAt === undefined
              ? existingRecord[0]?.lastSuccessfulOutboundAt ?? null
              : input.lastSuccessfulOutboundAt,
          latestIntentSummary:
            input.latestIntentSummary === undefined ? existingRecord[0]?.latestIntentSummary ?? null : input.latestIntentSummary,
          qualificationSummary:
            input.qualificationSummary === undefined ? existingRecord[0]?.qualificationSummary ?? null : input.qualificationSummary,
          updatedAt: input.updatedAt
        },
        target: caseAgentMemories.caseId
      });
  };

  const syncCaseAgentTriggerJob = async (
    transaction: AlphaTransaction,
    input: {
      caseId: string;
      payload?: Record<string, unknown>;
      runAfter: string;
      triggerType: CaseAgentTriggerType;
      updatedAt: string;
    }
  ) => {
    await transaction
      .update(automationJobs)
      .set({
        status: "cancelled",
        updatedAt: input.updatedAt
      })
      .where(and(eq(automationJobs.caseId, input.caseId), eq(automationJobs.jobType, caseAgentJobType), eq(automationJobs.status, "queued")));

    await transaction.insert(automationJobs).values({
      attempts: 0,
      caseId: input.caseId,
      createdAt: input.updatedAt,
      id: randomUUID(),
      jobType: caseAgentJobType,
      payload: {
        ...(input.payload ?? {}),
        triggerType: input.triggerType
      },
      runAfter: input.runAfter,
      status: "queued",
      updatedAt: input.updatedAt
    });
  };

  const syncNewLeadCaseAgentTrigger = async (
    transaction: AlphaTransaction,
    input: {
      automationHoldReason: CaseAutomationHoldReason | null;
      automationStatus: AutomationStatus;
      caseId: string;
      source: "website" | "whatsapp";
      stage: CaseStage;
      updatedAt: string;
    }
  ) => {
    await transaction
      .update(automationJobs)
      .set({
        status: "cancelled",
        updatedAt: input.updatedAt
      })
      .where(and(eq(automationJobs.caseId, input.caseId), eq(automationJobs.jobType, caseAgentJobType), eq(automationJobs.status, "queued")));

    if (input.source !== "website" || input.stage !== "new") {
      return;
    }

    const channelStateRecord = await transaction
      .select({
        latestOutboundStatus: caseChannelStates.latestOutboundStatus
      })
      .from(caseChannelStates)
      .where(eq(caseChannelStates.caseId, input.caseId))
      .limit(1);

    const latestOutboundStatus = channelStateRecord[0]?.latestOutboundStatus
      ? toMessageDeliveryStatus(channelStateRecord[0].latestOutboundStatus)
      : "not_started";

    if (latestOutboundStatus === "sent" || latestOutboundStatus === "delivered") {
      return;
    }

    if (input.automationStatus === "paused" || input.automationHoldReason !== null) {
      return;
    }

    await syncCaseAgentTriggerJob(transaction, {
      caseId: input.caseId,
      runAfter: input.updatedAt,
      triggerType: "new_lead",
      updatedAt: input.updatedAt
    });
  };

  const upsertCaseChannelState = async (
    transaction: AlphaTransaction,
    input: {
      caseId: string;
      channel: CaseContactChannel;
      contactValue: string | null;
      lastInboundAt?: string | null;
      latestOutboundBlockReason: MessageDeliveryBlockReason | null;
      latestOutboundFailureCode: string | null;
      latestOutboundFailureDetail: string | null;
      latestOutboundMessage: string | null;
      latestOutboundProviderMessageId: string | null;
      latestOutboundStatus: MessageDeliveryStatus;
      latestOutboundUpdatedAt: string | null;
      provider: MessageProvider | null;
      updatedAt: string;
    }
  ) => {
    await transaction
      .insert(caseChannelStates)
      .values({
        caseId: input.caseId,
        channel: input.channel,
        contactValue: input.contactValue,
        createdAt: input.updatedAt,
        id: randomUUID(),
        lastInboundAt: input.lastInboundAt ?? null,
        latestOutboundBlockReason: input.latestOutboundBlockReason,
        latestOutboundFailureCode: input.latestOutboundFailureCode,
        latestOutboundFailureDetail: input.latestOutboundFailureDetail,
        latestOutboundMessage: input.latestOutboundMessage,
        latestOutboundProviderMessageId: input.latestOutboundProviderMessageId,
        latestOutboundStatus: input.latestOutboundStatus,
        latestOutboundUpdatedAt: input.latestOutboundUpdatedAt,
        provider: input.provider,
        updatedAt: input.updatedAt
      })
      .onConflictDoUpdate({
        set: {
          channel: input.channel,
          contactValue: input.contactValue,
          lastInboundAt: input.lastInboundAt ?? null,
          latestOutboundBlockReason: input.latestOutboundBlockReason,
          latestOutboundFailureCode: input.latestOutboundFailureCode,
          latestOutboundFailureDetail: input.latestOutboundFailureDetail,
          latestOutboundMessage: input.latestOutboundMessage,
          latestOutboundProviderMessageId: input.latestOutboundProviderMessageId,
          latestOutboundStatus: input.latestOutboundStatus,
          latestOutboundUpdatedAt: input.latestOutboundUpdatedAt,
          provider: input.provider,
          updatedAt: input.updatedAt
        },
        target: caseChannelStates.caseId
      });
  };

  const queueWhatsAppOutboundJob = async (
    transaction: AlphaTransaction,
    input: {
      caseId: string;
      jobType: string;
      messageBody: string;
      normalizedPhone: string;
      origin: "manager" | "system";
      sentByName: string | null;
      updatedAt: string;
    }
  ) => {
    await transaction.insert(automationJobs).values({
      attempts: 0,
      caseId: input.caseId,
      createdAt: input.updatedAt,
      id: randomUUID(),
      jobType: input.jobType,
      payload: {
        messageBody: input.messageBody,
        normalizedPhone: input.normalizedPhone,
        origin: input.origin,
        sentByName: input.sentByName
      },
      runAfter: input.updatedAt,
      status: "queued",
      updatedAt: input.updatedAt
    });
  };

  const createQaReviewRecord = async (
    transaction: AlphaTransaction,
    input: {
      caseId: string;
      createdAt: string;
      draftMessage: string | null;
      policySignals: QaPolicySignal[];
      qaReviewId: string;
      requestedByName: string;
      sampleSummary: string;
      subjectType: CaseQaReviewSubjectType;
      triggerEvidence: string[];
      triggerSource: CaseQaReviewTriggerSource;
    }
  ) => {
    await transaction.insert(caseQaReviews).values({
      caseId: input.caseId,
      createdAt: input.createdAt,
      draftMessage: input.draftMessage,
      id: input.qaReviewId,
      policySignals: input.policySignals,
      requestedByName: input.requestedByName,
      reviewSummary: null,
      reviewedAt: null,
      reviewerName: null,
      sampleSummary: input.sampleSummary,
      status: "pending_review",
      subjectType: input.subjectType,
      triggerEvidence: input.triggerEvidence,
      triggerSource: input.triggerSource,
      updatedAt: input.createdAt
    });
  };

  const getCaseAutomationHoldReason = (
    qaReview: Pick<PersistedCaseQaReview, "status"> | null | undefined
  ): CaseAutomationHoldReason | null => {
    if (qaReview?.status === "pending_review") {
      return "qa_pending_review";
    }

    if (qaReview?.status === "follow_up_required") {
      return "qa_follow_up_required";
    }

    return null;
  };

  const getCaseAutomationHoldReasonFromStatus = (status: CaseQaReviewStatus | null | undefined): CaseAutomationHoldReason | null => {
    if (status === "pending_review") {
      return "qa_pending_review";
    }

    if (status === "follow_up_required") {
      return "qa_follow_up_required";
    }

    return null;
  };

  return {
    async applyQualification(caseId, input) {
      const caseRecord = await getPersistedCaseDetail(caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();

      await db.transaction(async (transaction) => {
        await transaction
          .insert(qualificationSnapshots)
          .values({
            budgetBand: input.budgetBand,
            caseId,
            createdAt: updatedAt,
            id: randomUUID(),
            intentSummary: input.intentSummary,
            moveInTimeline: input.moveInTimeline,
            readiness: input.readiness,
            updatedAt
          })
          .onConflictDoUpdate({
            set: {
              budgetBand: input.budgetBand,
              intentSummary: input.intentSummary,
              moveInTimeline: input.moveInTimeline,
              readiness: input.readiness,
              updatedAt
            },
            target: qualificationSnapshots.caseId
          });

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "qualified",
            updatedAt
          })
          .where(eq(cases.id, caseId));

        await transaction.insert(auditEvents).values({
          caseId,
          createdAt: updatedAt,
          eventType: "case_qualified",
          id: randomUUID(),
          payload: {
            budgetBand: input.budgetBand,
            intentSummary: input.intentSummary,
            moveInTimeline: input.moveInTimeline,
            readiness: input.readiness
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getPersistedCaseDetail(caseId);
    },
    async close() {
      await client.close();
    },
    async createWebsiteLeadCase(input) {
      const createdLeadId = randomUUID();
      const createdCaseId = randomUUID();
      const createdAt = new Date().toISOString();
      const automaticQaMatches = detectQaPolicyMatches(input.message);
      const automaticQaReviewId = automaticQaMatches.length > 0 ? randomUUID() : null;
      const normalizedPhone = normalizePhoneNumber(input.phone);
      const source = input.source ?? "website";

      await db.transaction(async (transaction) => {
        await transaction.insert(leads).values({
          budget: input.budget,
          createdAt,
          customerName: input.customerName,
          email: input.email,
          id: createdLeadId,
          message: input.message,
          normalizedPhone,
          phone: input.phone,
          preferredLocale: input.preferredLocale,
          projectInterest: input.projectInterest,
          source
        });

        await transaction.insert(cases).values({
          automationStatus: "active",
          createdAt,
          currentNextAction: input.nextAction,
          id: createdCaseId,
          leadId: createdLeadId,
          nextActionDueAt: input.nextActionDueAt,
          ownerName: defaultOwnerName,
          stage: "new",
          updatedAt: createdAt
        });

        await transaction.insert(auditEvents).values({
          caseId: createdCaseId,
          createdAt,
          eventType: "website_lead_received",
          id: randomUUID(),
          payload: {
            customerName: input.customerName,
            preferredLocale: input.preferredLocale,
            projectInterest: input.projectInterest,
            source
          }
        });

        await transaction.insert(documentRequests).values(
          defaultDocumentTypes.map((type) => ({
            caseId: createdCaseId,
            createdAt,
            id: randomUUID(),
            status: "requested",
            type,
            updatedAt: createdAt
          }))
        );

        if (automaticQaReviewId) {
          await createQaReviewRecord(transaction, {
            caseId: createdCaseId,
            createdAt,
            draftMessage: null,
            policySignals: automaticQaMatches.map((match) => match.signal),
            qaReviewId: automaticQaReviewId,
            requestedByName: "QA Policy Engine",
            sampleSummary: buildAutomaticQaSampleSummary(input.preferredLocale, automaticQaMatches.map((match) => match.signal)),
            subjectType: "case_message",
            triggerEvidence: automaticQaMatches.map((match) => match.evidence),
            triggerSource: "policy_rule"
          });

          await transaction.insert(auditEvents).values({
            caseId: createdCaseId,
            createdAt,
            eventType: "qa_review_policy_opened",
            id: randomUUID(),
            payload: {
              policySignals: automaticQaMatches.map((match) => match.signal),
              qaReviewId: automaticQaReviewId,
              subjectType: "case_message",
              triggerEvidence: automaticQaMatches.map((match) => match.evidence),
              triggerSource: "policy_rule"
            }
          });
        }

        if (source === "whatsapp") {
          await upsertCaseChannelState(transaction, {
            caseId: createdCaseId,
            channel: "whatsapp",
            contactValue: normalizedPhone,
            lastInboundAt: createdAt,
            latestOutboundBlockReason: null,
            latestOutboundFailureCode: null,
            latestOutboundFailureDetail: null,
            latestOutboundMessage: null,
            latestOutboundProviderMessageId: null,
            latestOutboundStatus: "not_started",
            latestOutboundUpdatedAt: null,
            provider: "meta_whatsapp_cloud",
            updatedAt: createdAt
          });
        } else {
          await upsertCaseChannelState(transaction, {
            caseId: createdCaseId,
            channel: normalizedPhone ? "whatsapp" : "website",
            contactValue: normalizedPhone,
            latestOutboundBlockReason: normalizedPhone
              ? automaticQaReviewId
                ? "qa_hold"
                : null
              : "missing_phone",
            latestOutboundFailureCode: normalizedPhone ? null : "missing_phone",
            latestOutboundFailureDetail: normalizedPhone ? null : "No WhatsApp-ready phone number was provided for this lead.",
            latestOutboundMessage: null,
            latestOutboundProviderMessageId: null,
            latestOutboundStatus: normalizedPhone ? (automaticQaReviewId ? "blocked" : "queued") : "blocked",
            latestOutboundUpdatedAt: createdAt,
            provider: normalizedPhone ? "meta_whatsapp_cloud" : null,
            updatedAt: createdAt
          });

          await syncNewLeadCaseAgentTrigger(transaction, {
            automationHoldReason: automaticQaReviewId ? "qa_pending_review" : null,
            automationStatus: "active",
            caseId: createdCaseId,
            source,
            stage: "new",
            updatedAt: createdAt
          });
        }

        await syncFollowUpJob(transaction, {
          automationStatus: "active",
          automationHoldReason: automaticQaReviewId ? "qa_pending_review" : null,
          caseId: createdCaseId,
          runAfter: input.nextActionDueAt,
          updatedAt: createdAt
        });
      });

      const persistedCase = await db
        .select({
          automationStatus: cases.automationStatus,
          caseId: cases.id,
          createdAt: cases.createdAt,
          customerName: leads.customerName,
          leadId: leads.id,
          nextAction: cases.currentNextAction,
          nextActionDueAt: cases.nextActionDueAt,
          ownerName: cases.ownerName,
          preferredLocale: leads.preferredLocale,
          projectInterest: leads.projectInterest,
          source: leads.source,
          stage: cases.stage,
          updatedAt: cases.updatedAt
        })
        .from(cases)
        .innerJoin(leads, eq(cases.leadId, leads.id))
        .where(eq(cases.id, createdCaseId))
        .limit(1);

      const createdCase = persistedCase[0];

      if (!createdCase) {
        throw new Error("failed_to_persist_website_lead_case");
      }

      const currentQaReview = automaticQaReviewId
        ? (
            await listCurrentQaReviews([createdCaseId])
          ).get(createdCaseId) ?? null
        : null;

      return {
        agentState: null,
        automationHoldReason: getCaseAutomationHoldReason(currentQaReview),
        automationStatus: toAutomationStatus(createdCase.automationStatus),
        caseId: createdCase.caseId,
        channelSummary: (await listCaseChannelSummaries([createdCase.caseId])).get(createdCase.caseId) ?? null,
        createdAt: toIsoDateTimeString(createdCase.createdAt),
        currentHandoverCustomerUpdateQaReview: null,
        currentQaReview,
        customerName: createdCase.customerName,
        followUpStatus: toFollowUpStatus(createdCase.nextActionDueAt),
        handoverCase: null,
        handoverClosure: null,
        latestHumanReply: null,
        latestManagerFollowUp: null,
        leadId: createdCase.leadId,
        nextAction: createdCase.nextAction,
        nextActionDueAt: toIsoDateTimeString(createdCase.nextActionDueAt),
        openInterventionsCount: 0,
        ownerName: createdCase.ownerName,
        preferredLocale: toSupportedLocale(createdCase.preferredLocale),
        projectInterest: createdCase.projectInterest,
        source: toLeadSource(createdCase.source),
        stage: toCaseStage(createdCase.stage),
        updatedAt: toIsoDateTimeString(createdCase.updatedAt)
      };
    },
    async requestCaseQaReview(caseId, input) {
      const caseRecord = await getPersistedCaseDetail(caseId);

      if (!caseRecord) {
        return null;
      }

      const currentQaReview = caseRecord.qaReviews[0];

      if (currentQaReview?.status === "pending_review") {
        return null;
      }

      const createdAt = new Date().toISOString();
      const qaReviewId = randomUUID();

      await db.transaction(async (transaction) => {
        await createQaReviewRecord(transaction, {
          caseId,
          createdAt,
          draftMessage: null,
          policySignals: [],
          qaReviewId,
          requestedByName: input.requestedByName ?? caseRecord.ownerName,
          sampleSummary: input.sampleSummary,
          subjectType: "case_message",
          triggerEvidence: [],
          triggerSource: "manual_request"
        });

        await transaction.insert(auditEvents).values({
          caseId,
          createdAt,
          eventType: "qa_review_requested",
          id: randomUUID(),
          payload: {
            draftMessage: null,
            qaReviewId,
            policySignals: [],
            requestedByName: input.requestedByName ?? caseRecord.ownerName,
            sampleSummary: input.sampleSummary,
            subjectType: "case_message",
            triggerEvidence: [],
            triggerSource: "manual_request"
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: "qa_pending_review",
          caseId,
          runAfter: caseRecord.nextActionDueAt,
          updatedAt: createdAt
        });

        await syncNewLeadCaseAgentTrigger(transaction, {
          automationHoldReason: "qa_pending_review",
          automationStatus: caseRecord.automationStatus,
          caseId,
          source: caseRecord.source,
          stage: caseRecord.stage,
          updatedAt: createdAt
        });
      });

      return getPersistedCaseDetail(caseId);
    },
    async prepareCaseReplyDraftQaReview(caseId, input) {
      const caseRecord = await getPersistedCaseDetail(caseId);

      if (!caseRecord) {
        return null;
      }

      const currentQaReview = caseRecord.qaReviews[0];

      if (currentQaReview?.status === "pending_review") {
        return null;
      }

      const createdAt = new Date().toISOString();
      const qaReviewId = randomUUID();
      const draftPolicyMatches = detectCaseReplyDraftQaPolicyMatches(input.draftMessage);
      const triggerSource: CaseQaReviewTriggerSource = draftPolicyMatches.length > 0 ? "policy_rule" : "manual_request";
      const sampleSummary = buildCaseReplyDraftQaSampleSummary(
        caseRecord.preferredLocale,
        draftPolicyMatches.map((match) => match.signal)
      );

      await db.transaction(async (transaction) => {
        await createQaReviewRecord(transaction, {
          caseId,
          createdAt,
          draftMessage: input.draftMessage,
          policySignals: draftPolicyMatches.map((match) => match.signal),
          qaReviewId,
          requestedByName: input.requestedByName ?? caseRecord.ownerName,
          sampleSummary,
          subjectType: "prepared_reply_draft",
          triggerEvidence: draftPolicyMatches.map((match) => match.evidence),
          triggerSource
        });

        await transaction.insert(auditEvents).values({
          caseId,
          createdAt,
          eventType: triggerSource === "policy_rule" ? "qa_review_policy_opened" : "qa_review_requested",
          id: randomUUID(),
          payload: {
            draftMessage: input.draftMessage,
            policySignals: draftPolicyMatches.map((match) => match.signal),
            qaReviewId,
            requestedByName: input.requestedByName ?? caseRecord.ownerName,
            sampleSummary,
            subjectType: "prepared_reply_draft",
            triggerEvidence: draftPolicyMatches.map((match) => match.evidence),
            triggerSource
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: "qa_pending_review",
          caseId,
          runAfter: caseRecord.nextActionDueAt,
          updatedAt: createdAt
        });

        await syncNewLeadCaseAgentTrigger(transaction, {
          automationHoldReason: "qa_pending_review",
          automationStatus: caseRecord.automationStatus,
          caseId,
          source: caseRecord.source,
          stage: caseRecord.stage,
          updatedAt: createdAt
        });
      });

      return getPersistedCaseDetail(caseId);
    },
    async resolveCaseQaReview(caseId, qaReviewId, input) {
      const caseRecord = await getPersistedCaseDetail(caseId);

      if (!caseRecord) {
        return null;
      }

      const currentQaReview = await db
        .select({
          createdAt: caseQaReviews.createdAt,
          draftMessage: caseQaReviews.draftMessage,
          policySignals: caseQaReviews.policySignals,
          qaReviewId: caseQaReviews.id,
          requestedByName: caseQaReviews.requestedByName,
          reviewSummary: caseQaReviews.reviewSummary,
          reviewedAt: caseQaReviews.reviewedAt,
          reviewerName: caseQaReviews.reviewerName,
          sampleSummary: caseQaReviews.sampleSummary,
          status: caseQaReviews.status,
          subjectType: caseQaReviews.subjectType,
          triggerEvidence: caseQaReviews.triggerEvidence,
          triggerSource: caseQaReviews.triggerSource,
          updatedAt: caseQaReviews.updatedAt
        })
        .from(caseQaReviews)
        .where(and(eq(caseQaReviews.caseId, caseId), eq(caseQaReviews.id, qaReviewId)))
        .limit(1);

      const qaReviewRecord = currentQaReview[0];

      if (!qaReviewRecord) {
        return null;
      }

      if (toCaseQaReviewStatus(qaReviewRecord.status) !== "pending_review") {
        return null;
      }

      const updatedAt = new Date().toISOString();

      await db.transaction(async (transaction) => {
        await transaction
          .update(caseQaReviews)
          .set({
            reviewSummary: input.reviewSummary,
            reviewedAt: updatedAt,
            reviewerName: input.reviewerName ?? "QA Reviewer",
            status: input.status,
            updatedAt
          })
          .where(and(eq(caseQaReviews.caseId, caseId), eq(caseQaReviews.id, qaReviewId)));

        await transaction.insert(auditEvents).values({
          caseId,
          createdAt: updatedAt,
          eventType: "qa_review_resolved",
          id: randomUUID(),
          payload: {
            draftMessage: qaReviewRecord.draftMessage,
            qaReviewId,
            reviewSummary: input.reviewSummary,
            reviewerName: input.reviewerName ?? "QA Reviewer",
            status: input.status,
            subjectType: qaReviewRecord.subjectType
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReasonFromStatus(input.status),
          caseId,
          runAfter: caseRecord.nextActionDueAt,
          updatedAt
        });

        await syncNewLeadCaseAgentTrigger(transaction, {
          automationHoldReason: getCaseAutomationHoldReasonFromStatus(input.status),
          automationStatus: caseRecord.automationStatus,
          caseId,
          source: caseRecord.source,
          stage: caseRecord.stage,
          updatedAt
        });
      });

      return getPersistedCaseDetail(caseId);
    },
    async sendCaseReply(caseId, input) {
      const caseRecord = await getPersistedCaseDetail(caseId);

      if (!caseRecord) {
        return null;
      }

      const createdAt = new Date().toISOString();
      const normalizedPhone = caseRecord.channelSummary?.contactValue ?? normalizePhoneNumber(caseRecord.phone);
      const sentByName = input.sentByName ?? caseRecord.ownerName;

      await db.transaction(async (transaction) => {
        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            updatedAt: createdAt
          })
          .where(eq(cases.id, caseId));

        await resolveOpenInterventions(transaction, {
          caseId,
          resolutionNote: "human_reply_sent",
          resolvedAt: createdAt
        });

        await transaction.insert(auditEvents).values({
          caseId,
          createdAt,
          eventType: "case_reply_sent",
          id: randomUUID(),
          payload: {
            approvedDraftQaReviewId: input.approvedDraftQaReviewId,
            message: input.message,
            nextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            sentByName
          }
        });

        if (normalizedPhone) {
          await upsertCaseChannelState(transaction, {
            caseId,
            channel: "whatsapp",
            contactValue: normalizedPhone,
            lastInboundAt: caseRecord.channelSummary?.lastInboundAt ?? null,
            latestOutboundBlockReason: null,
            latestOutboundFailureCode: null,
            latestOutboundFailureDetail: null,
            latestOutboundMessage: input.message,
            latestOutboundProviderMessageId: null,
            latestOutboundStatus: "queued",
            latestOutboundUpdatedAt: createdAt,
            provider: "meta_whatsapp_cloud",
            updatedAt: createdAt
          });

          await queueWhatsAppOutboundJob(transaction, {
            caseId,
            jobType: whatsappCaseReplyJobType,
            messageBody: input.message,
            normalizedPhone,
            origin: "manager",
            sentByName,
            updatedAt: createdAt
          });
        } else {
          await upsertCaseChannelState(transaction, {
            caseId,
            channel: caseRecord.channelSummary?.channel ?? "website",
            contactValue: null,
            lastInboundAt: caseRecord.channelSummary?.lastInboundAt ?? null,
            latestOutboundBlockReason: "missing_phone",
            latestOutboundFailureCode: null,
            latestOutboundFailureDetail: null,
            latestOutboundMessage: input.message,
            latestOutboundProviderMessageId: null,
            latestOutboundStatus: "blocked",
            latestOutboundUpdatedAt: createdAt,
            provider: caseRecord.channelSummary?.provider ?? null,
            updatedAt: createdAt
          });
        }

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId,
          runAfter: input.nextActionDueAt,
          updatedAt: createdAt
        });
      });

      return getPersistedCaseDetail(caseId);
    },
    async getCaseDetail(caseId) {
      return getPersistedCaseDetail(caseId);
    },
    async listGovernanceEvents(input) {
      return listGovernanceEvents(input);
    },
    async getGovernanceSummary() {
      return getGovernanceSummary();
    },
    async getHandoverCaseDetail(handoverCaseId) {
      return getHandoverCaseDetail(handoverCaseId);
    },
    async listCases() {
      const persistedCases = await db
        .select({
          automationStatus: cases.automationStatus,
          caseId: cases.id,
          createdAt: cases.createdAt,
          customerName: leads.customerName,
          nextAction: cases.currentNextAction,
          nextActionDueAt: cases.nextActionDueAt,
          ownerName: cases.ownerName,
          preferredLocale: leads.preferredLocale,
          projectInterest: leads.projectInterest,
          source: leads.source,
          stage: cases.stage,
          updatedAt: cases.updatedAt
        })
        .from(cases)
        .innerJoin(leads, eq(cases.leadId, leads.id))
        .orderBy(desc(cases.createdAt));

      const caseIds = persistedCases.map((caseRecord) => caseRecord.caseId);
      const [
        openInterventionCounts,
        caseAgentWakeUps,
        channelSummaries,
        latestCaseAgentRuns,
        currentQaReviews,
        currentHandoverCustomerUpdateQaReviews,
        latestCaseReplies,
        latestManagerFollowUps,
        linkedHandoverCases,
        handoverClosureSummaries
      ] =
        await Promise.all([
        listOpenInterventionCounts(caseIds),
        listCaseAgentWakeUps(caseIds),
        listCaseChannelSummaries(caseIds),
        listLatestCaseAgentRuns(caseIds),
        listCurrentQaReviews(caseIds),
        listCurrentHandoverCustomerUpdateQaReviews(caseIds),
        listLatestCaseReplies(caseIds),
        listLatestManagerFollowUps(caseIds),
        listLinkedHandoverCases(caseIds),
        listHandoverClosureSummaries(caseIds)
      ]);

      return persistedCases.map((caseRecord) => ({
        agentState: buildPersistedCaseAgentState(
          latestCaseAgentRuns.get(caseRecord.caseId) ?? null,
          caseAgentWakeUps.get(caseRecord.caseId) ?? null
        ),
        automationHoldReason: getCaseAutomationHoldReason(currentQaReviews.get(caseRecord.caseId)),
        automationStatus: toAutomationStatus(caseRecord.automationStatus),
        caseId: caseRecord.caseId,
        channelSummary: channelSummaries.get(caseRecord.caseId) ?? null,
        createdAt: toIsoDateTimeString(caseRecord.createdAt),
        currentHandoverCustomerUpdateQaReview: currentHandoverCustomerUpdateQaReviews.get(caseRecord.caseId) ?? null,
        currentQaReview: currentQaReviews.get(caseRecord.caseId) ?? null,
        customerName: caseRecord.customerName,
        followUpStatus: toFollowUpStatus(caseRecord.nextActionDueAt),
        handoverCase: linkedHandoverCases.get(caseRecord.caseId) ?? null,
        handoverClosure: handoverClosureSummaries.get(caseRecord.caseId) ?? null,
        latestHumanReply: latestCaseReplies.get(caseRecord.caseId) ?? null,
        latestManagerFollowUp: latestManagerFollowUps.get(caseRecord.caseId) ?? null,
        nextAction: caseRecord.nextAction,
        nextActionDueAt: toIsoDateTimeString(caseRecord.nextActionDueAt),
        openInterventionsCount: openInterventionCounts.get(caseRecord.caseId) ?? 0,
        ownerName: caseRecord.ownerName,
        preferredLocale: toSupportedLocale(caseRecord.preferredLocale),
        projectInterest: caseRecord.projectInterest,
        source: toLeadSource(caseRecord.source),
        stage: toCaseStage(caseRecord.stage),
        updatedAt: toIsoDateTimeString(caseRecord.updatedAt)
      }));
    },
    async findCaseIdByNormalizedPhone(normalizedPhone) {
      const matchedLead = await db
        .select({
          caseId: cases.id
        })
        .from(leads)
        .innerJoin(cases, eq(cases.leadId, leads.id))
        .where(eq(leads.normalizedPhone, normalizedPhone))
        .orderBy(desc(cases.createdAt))
        .limit(1);

      return matchedLead[0]?.caseId ?? null;
    },
    async getDueAutomationJobs(input) {
      const dueJobs = await db
        .select({
          attempts: automationJobs.attempts,
          caseId: automationJobs.caseId,
          jobId: automationJobs.id,
          payload: automationJobs.payload,
          runAfter: automationJobs.runAfter
        })
        .from(automationJobs)
        .where(and(eq(automationJobs.jobType, input.jobType), eq(automationJobs.status, "queued")))
        .orderBy(asc(automationJobs.runAfter))
        .limit(input.limit);

      const dueTimestamp = new Date(input.runAt).getTime();

      return dueJobs.filter((job) => new Date(job.runAfter).getTime() <= dueTimestamp);
    },
    async markAutomationJobCompleted(jobId, updatedAt) {
      await db
        .update(automationJobs)
        .set({
          status: "completed",
          updatedAt
        })
        .where(eq(automationJobs.id, jobId));
    },
    async rescheduleAutomationJob(jobId, input) {
      await db
        .update(automationJobs)
        .set({
          attempts: input.attempts,
          runAfter: input.runAfter,
          updatedAt: input.updatedAt
        })
        .where(eq(automationJobs.id, jobId));
    },
    async queueCaseAgentTrigger(caseId, input) {
      await db.transaction(async (transaction) => {
        const jobInput: {
          caseId: string;
          payload?: Record<string, unknown>;
          runAfter: string;
          triggerType: CaseAgentTriggerType;
          updatedAt: string;
        } = {
          caseId,
          runAfter: input.runAfter,
          triggerType: input.triggerType,
          updatedAt: input.updatedAt
        };

        if (input.payload) {
          jobInput.payload = input.payload;
        }

        await syncCaseAgentTriggerJob(transaction, jobInput);
      });
    },
    async createCaseAgentRun(caseId, input) {
      await db.transaction(async (transaction) => {
        await transaction.insert(caseAgentRuns).values({
          actionType: input.actionType,
          blockedReason: input.blockedReason,
          caseId,
          confidencePercent: Math.max(0, Math.min(100, Math.round(input.confidence * 100))),
          createdAt: input.updatedAt,
          escalationReason: input.escalationReason,
          finishedAt: input.finishedAt,
          id: input.agentRunId,
          modelMode: input.modelMode,
          proposedMessage: input.proposedMessage,
          proposedNextAction: input.proposedNextAction,
          proposedNextActionDueAt: input.proposedNextActionDueAt,
          rationaleSummary: input.rationaleSummary,
          riskLevel: input.riskLevel,
          startedAt: input.startedAt,
          status: input.status,
          toolExecutionStatus: input.toolExecutionStatus,
          triggerType: input.triggerType,
          updatedAt: input.updatedAt
        });

        await mergeCaseAgentMemory(transaction, caseId, {
          lastDecisionSummary: input.rationaleSummary,
          updatedAt: input.updatedAt
        });
      });
    },
    async upsertCaseAgentMemory(caseId, input) {
      await db.transaction(async (transaction) => {
        await mergeCaseAgentMemory(transaction, caseId, input);
      });
    },
    async queueCaseAgentReply(caseId, input) {
      const caseRecord = await getPersistedCaseDetail(caseId);

      if (!caseRecord) {
        return null;
      }

      const normalizedPhone = caseRecord.channelSummary?.contactValue ?? normalizePhoneNumber(caseRecord.phone);

      await db.transaction(async (transaction) => {
        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            updatedAt: input.updatedAt
          })
          .where(eq(cases.id, caseId));

        await resolveOpenInterventions(transaction, {
          caseId,
          resolutionNote: "case_agent_reply_queued",
          resolvedAt: input.updatedAt
        });

        await transaction.insert(auditEvents).values({
          caseId,
          createdAt: input.updatedAt,
          eventType: "case_agent_message_queued",
          id: randomUUID(),
          payload: {
            agentRunId: input.agentRunId,
            messageBody: input.messageBody,
            nextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            triggerType: input.triggerType
          }
        });

        if (normalizedPhone) {
          await upsertCaseChannelState(transaction, {
            caseId,
            channel: "whatsapp",
            contactValue: normalizedPhone,
            lastInboundAt: caseRecord.channelSummary?.lastInboundAt ?? null,
            latestOutboundBlockReason: null,
            latestOutboundFailureCode: null,
            latestOutboundFailureDetail: null,
            latestOutboundMessage: input.messageBody,
            latestOutboundProviderMessageId: null,
            latestOutboundStatus: "queued",
            latestOutboundUpdatedAt: input.updatedAt,
            provider: "meta_whatsapp_cloud",
            updatedAt: input.updatedAt
          });

          await queueWhatsAppOutboundJob(transaction, {
            caseId,
            jobType: whatsappAgentReplyJobType,
            messageBody: input.messageBody,
            normalizedPhone,
            origin: "system",
            sentByName: null,
            updatedAt: input.updatedAt
          });
        }

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId,
          runAfter: input.nextActionDueAt,
          updatedAt: input.updatedAt
        });
      });

      return getPersistedCaseDetail(caseId);
    },
    async saveCaseAgentFollowUp(caseId, input) {
      const caseRecord = await getPersistedCaseDetail(caseId);

      if (!caseRecord) {
        return null;
      }

      await db.transaction(async (transaction) => {
        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            updatedAt: input.updatedAt
          })
          .where(eq(cases.id, caseId));

        await transaction.insert(auditEvents).values({
          caseId,
          createdAt: input.updatedAt,
          eventType: "case_agent_follow_up_saved",
          id: randomUUID(),
          payload: {
            agentRunId: input.agentRunId,
            nextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            summary: input.summary,
            triggerType: input.triggerType
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId,
          runAfter: input.nextActionDueAt,
          updatedAt: input.updatedAt
        });
      });

      return getPersistedCaseDetail(caseId);
    },
    async createCaseAgentReplyDraft(caseId, input) {
      const caseRecord = await getPersistedCaseDetail(caseId);

      if (!caseRecord) {
        return null;
      }

      await db.transaction(async (transaction) => {
        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            updatedAt: input.updatedAt
          })
          .where(eq(cases.id, caseId));

        await transaction.insert(auditEvents).values({
          caseId,
          createdAt: input.updatedAt,
          eventType: "case_agent_reply_draft_created",
          id: randomUUID(),
          payload: {
            agentRunId: input.agentRunId,
            messageBody: input.messageBody,
            nextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            summary: input.summary,
            triggerType: input.triggerType
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId,
          runAfter: input.nextActionDueAt,
          updatedAt: input.updatedAt
        });
      });

      return getPersistedCaseDetail(caseId);
    },
    async openCaseManagerIntervention(caseId, input) {
      const caseRecord = await getPersistedCaseDetail(caseId);

      if (!caseRecord) {
        return null;
      }

      await db.transaction(async (transaction) => {
        const existingOpenIntervention = await transaction
          .select({
            interventionId: managerInterventions.id
          })
          .from(managerInterventions)
          .where(
            and(
              eq(managerInterventions.caseId, caseId),
              eq(managerInterventions.status, "open"),
              eq(managerInterventions.type, "agent_decision_required")
            )
          )
          .limit(1);

        if (!existingOpenIntervention[0]) {
          await transaction.insert(managerInterventions).values({
            caseId,
            createdAt: input.updatedAt,
            id: randomUUID(),
            resolutionNote: null,
            resolvedAt: null,
            severity: input.severity,
            status: "open",
            summary: input.summary,
            type: "agent_decision_required",
            updatedAt: input.updatedAt
          });
        }

        await transaction.insert(auditEvents).values({
          caseId,
          createdAt: input.updatedAt,
          eventType: "case_agent_intervention_opened",
          id: randomUUID(),
          payload: {
            agentRunId: input.agentRunId,
            severity: input.severity,
            summary: input.summary,
            triggerType: input.triggerType
          }
        });
      });

      return getPersistedCaseDetail(caseId);
    },
    async recordVisitBooking(caseId, visitId, input) {
      await db.transaction(async (transaction) => {
        await transaction
          .insert(visitBookings)
          .values({
            confirmedAt: input.confirmedAt,
            createdAt: input.updatedAt,
            failureCode: input.failureCode,
            failureDetail: input.failureDetail,
            id: randomUUID(),
            provider: input.provider,
            providerEventId: input.providerEventId,
            status: input.status,
            updatedAt: input.updatedAt,
            visitId
          })
          .onConflictDoUpdate({
            set: {
              confirmedAt: input.confirmedAt,
              failureCode: input.failureCode,
              failureDetail: input.failureDetail,
              provider: input.provider,
              providerEventId: input.providerEventId,
              status: input.status,
              updatedAt: input.updatedAt
            },
            target: visitBookings.visitId
          });

        await transaction.insert(auditEvents).values({
          caseId,
          createdAt: input.updatedAt,
          eventType: input.status === "confirmed" ? "calendar_booking_confirmed" : "calendar_booking_failed",
          id: randomUUID(),
          payload: {
            failureCode: input.failureCode,
            failureDetail: input.failureDetail,
            provider: input.provider,
            providerEventId: input.providerEventId,
            status: input.status,
            visitId
          }
        });
      });

      return getPersistedCaseDetail(caseId);
    },
    async recordWhatsAppDeliveryStatus(input) {
      const store = this as LeadCaptureStore;
      const caseIdByPhone = input.normalizedPhone ? await store.findCaseIdByNormalizedPhone(input.normalizedPhone) : null;
      const matchedChannelState =
        caseIdByPhone === null
          ? await db
              .select({
                caseId: caseChannelStates.caseId
              })
              .from(caseChannelStates)
              .where(eq(caseChannelStates.latestOutboundProviderMessageId, input.providerMessageId))
              .limit(1)
          : [];
      const caseId = caseIdByPhone ?? matchedChannelState[0]?.caseId ?? null;

      if (!caseId) {
        return null;
      }

      await db.transaction(async (transaction) => {
        const existingChannelState = await transaction
          .select({
            channel: caseChannelStates.channel,
            contactValue: caseChannelStates.contactValue,
            latestOutboundMessage: caseChannelStates.latestOutboundMessage
          })
          .from(caseChannelStates)
          .where(eq(caseChannelStates.caseId, caseId))
          .limit(1);

        await upsertCaseChannelState(transaction, {
          caseId,
          channel: existingChannelState[0]?.channel ? toCaseContactChannel(existingChannelState[0].channel) : "whatsapp",
          contactValue: input.normalizedPhone ?? existingChannelState[0]?.contactValue ?? null,
          latestOutboundBlockReason: null,
          latestOutboundFailureCode: input.failureCode,
          latestOutboundFailureDetail: input.failureDetail,
          latestOutboundMessage: existingChannelState[0]?.latestOutboundMessage ?? null,
          latestOutboundProviderMessageId: input.providerMessageId,
          latestOutboundStatus: input.status,
          latestOutboundUpdatedAt: input.updatedAt,
          provider: "meta_whatsapp_cloud",
          updatedAt: input.updatedAt
        });

        if (input.status === "sent" || input.status === "delivered") {
          await mergeCaseAgentMemory(transaction, caseId, {
            lastSuccessfulOutboundAt: input.updatedAt,
            updatedAt: input.updatedAt
          });
        }

        await transaction.insert(auditEvents).values({
          caseId,
          createdAt: input.updatedAt,
          eventType:
            input.status === "delivered"
              ? "whatsapp_message_delivered"
              : input.status === "sent"
                ? "whatsapp_message_sent"
                : "whatsapp_message_failed",
          id: randomUUID(),
          payload: {
            failureCode: input.failureCode,
            failureDetail: input.failureDetail,
            messageBody: existingChannelState[0]?.latestOutboundMessage ?? null,
            normalizedPhone: input.normalizedPhone,
            providerMessageId: input.providerMessageId,
            status: input.status
          }
        });
      });

      return getPersistedCaseDetail(caseId);
    },
    async recordWhatsAppInboundMessage(input) {
      const store = this as LeadCaptureStore;
      const existingCaseId = await store.findCaseIdByNormalizedPhone(input.normalizedPhone);
      const matchedCaseId =
        existingCaseId ??
        (
          await store.createWebsiteLeadCase({
            customerName: input.profileName ?? "WhatsApp Lead",
            email: `${input.normalizedPhone.replace(/[^\d]/g, "")}@whatsapp.local`,
            message: input.textBody,
            nextAction: "Review inbound WhatsApp inquiry and continue qualification",
            nextActionDueAt: input.receivedAt,
            phone: input.normalizedPhone,
            preferredLocale: "en",
            projectInterest: "WhatsApp inquiry",
            source: "whatsapp"
          })
        ).caseId;

      await db.transaction(async (transaction) => {
        const existingChannelState = await transaction
          .select({
            latestOutboundBlockReason: caseChannelStates.latestOutboundBlockReason,
            latestOutboundFailureCode: caseChannelStates.latestOutboundFailureCode,
            latestOutboundFailureDetail: caseChannelStates.latestOutboundFailureDetail,
            latestOutboundMessage: caseChannelStates.latestOutboundMessage,
            latestOutboundProviderMessageId: caseChannelStates.latestOutboundProviderMessageId,
            latestOutboundStatus: caseChannelStates.latestOutboundStatus,
            latestOutboundUpdatedAt: caseChannelStates.latestOutboundUpdatedAt,
            provider: caseChannelStates.provider
          })
          .from(caseChannelStates)
          .where(eq(caseChannelStates.caseId, matchedCaseId))
          .limit(1);

        await upsertCaseChannelState(transaction, {
          caseId: matchedCaseId,
          channel: "whatsapp",
          contactValue: input.normalizedPhone,
          lastInboundAt: input.receivedAt,
          latestOutboundBlockReason: existingChannelState[0]?.latestOutboundBlockReason
            ? toMessageDeliveryBlockReason(existingChannelState[0].latestOutboundBlockReason)
            : null,
          latestOutboundFailureCode: existingChannelState[0]?.latestOutboundFailureCode ?? null,
          latestOutboundFailureDetail: existingChannelState[0]?.latestOutboundFailureDetail ?? null,
          latestOutboundMessage: existingChannelState[0]?.latestOutboundMessage ?? null,
          latestOutboundProviderMessageId: existingChannelState[0]?.latestOutboundProviderMessageId ?? null,
          latestOutboundStatus: existingChannelState[0]?.latestOutboundStatus
            ? toMessageDeliveryStatus(existingChannelState[0].latestOutboundStatus)
            : "not_started",
          latestOutboundUpdatedAt: existingChannelState[0]?.latestOutboundUpdatedAt ?? null,
          provider: existingChannelState[0]?.provider ? toMessageProvider(existingChannelState[0].provider) : "meta_whatsapp_cloud",
          updatedAt: input.receivedAt
        });

        await mergeCaseAgentMemory(transaction, matchedCaseId, {
          lastInboundAt: input.receivedAt,
          latestIntentSummary: input.textBody.slice(0, 280),
          updatedAt: input.receivedAt
        });

        await transaction.insert(auditEvents).values({
          caseId: matchedCaseId,
          createdAt: input.receivedAt,
          eventType: "whatsapp_inbound_received",
          id: randomUUID(),
          payload: {
            messageId: input.messageId,
            normalizedPhone: input.normalizedPhone,
            profileName: input.profileName,
            textBody: input.textBody
          }
        });
      });

      return getPersistedCaseDetail(matchedCaseId);
    },
    async recordWhatsAppOutboundAttempt(caseId, input) {
      const caseRecord = await getPersistedCaseDetail(caseId);

      if (!caseRecord) {
        return null;
      }

      await db.transaction(async (transaction) => {
        await upsertCaseChannelState(transaction, {
          caseId,
          channel: caseRecord.channelSummary?.channel ?? "whatsapp",
          contactValue: caseRecord.channelSummary?.contactValue ?? normalizePhoneNumber(caseRecord.phone),
          lastInboundAt: caseRecord.channelSummary?.lastInboundAt ?? null,
          latestOutboundBlockReason: input.blockReason,
          latestOutboundFailureCode: input.failureCode,
          latestOutboundFailureDetail: input.failureDetail,
          latestOutboundMessage: input.messageBody,
          latestOutboundProviderMessageId: input.providerMessageId,
          latestOutboundStatus: input.status,
          latestOutboundUpdatedAt: input.updatedAt,
          provider: input.provider,
          updatedAt: input.updatedAt
        });

        if (input.status === "sent" || input.status === "delivered") {
          await mergeCaseAgentMemory(transaction, caseId, {
            lastSuccessfulOutboundAt: input.updatedAt,
            updatedAt: input.updatedAt
          });
        }

        await transaction.insert(auditEvents).values({
          caseId,
          createdAt: input.updatedAt,
          eventType:
            input.status === "sent" || input.status === "sending"
              ? "whatsapp_message_sent"
              : input.status === "queued"
                ? "whatsapp_message_send_requested"
                : "whatsapp_message_failed",
          id: randomUUID(),
          payload: {
            blockReason: input.blockReason,
            failureCode: input.failureCode,
            failureDetail: input.failureDetail,
            jobId: input.jobId,
            messageBody: input.messageBody,
            origin: input.origin,
            provider: input.provider,
            providerMessageId: input.providerMessageId,
            retryAfter: input.retryAfter,
            sentByName: input.sentByName,
            status: input.status
          }
        });
      });

      return getPersistedCaseDetail(caseId);
    },
    async manageCaseFollowUp(caseId, input) {
      const caseRecord = await getPersistedCaseDetail(caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();
      const nextOwnerName = input.ownerName ?? caseRecord.ownerName;

      await db.transaction(async (transaction) => {
        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            ownerName: nextOwnerName,
            updatedAt
          })
          .where(eq(cases.id, caseId));

        await resolveOpenInterventions(transaction, {
          caseId,
          resolutionNote: "manager_follow_up_reset",
          resolvedAt: updatedAt
        });

        await transaction.insert(auditEvents).values({
          caseId,
          createdAt: updatedAt,
          eventType: "manager_follow_up_updated",
          id: randomUUID(),
          payload: {
            nextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            ownerName: nextOwnerName
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getPersistedCaseDetail(caseId);
    },
    async manageCaseFollowUpBulk(caseIds, input) {
      const uniqueCaseIds = Array.from(new Set(caseIds.filter(Boolean)));

      if (uniqueCaseIds.length === 0) {
        return [];
      }

      const currentCaseRecords = await db
        .select({
          automationStatus: cases.automationStatus,
          caseId: cases.id,
          ownerName: cases.ownerName
        })
        .from(cases)
        .where(inArray(cases.id, uniqueCaseIds));

      if (currentCaseRecords.length !== uniqueCaseIds.length) {
        return [];
      }

      const currentQaReviews = await listCurrentQaReviews(uniqueCaseIds);
      const updatedAt = new Date().toISOString();
      const bulkActionBatchId = randomUUID();

      await db.transaction(async (transaction) => {
        for (const caseRecord of currentCaseRecords) {
          const nextOwnerName = input.ownerName ?? caseRecord.ownerName;

          await transaction
            .update(cases)
            .set({
              currentNextAction: input.nextAction,
              nextActionDueAt: input.nextActionDueAt,
              ownerName: nextOwnerName,
              updatedAt
            })
            .where(eq(cases.id, caseRecord.caseId));

          await resolveOpenInterventions(transaction, {
            caseId: caseRecord.caseId,
            resolutionNote: "manager_follow_up_reset",
            resolvedAt: updatedAt
          });

          await transaction.insert(auditEvents).values({
            caseId: caseRecord.caseId,
            createdAt: updatedAt,
            eventType: "manager_follow_up_updated",
            id: randomUUID(),
            payload: {
              bulkActionBatchId,
              bulkActionCaseCount: uniqueCaseIds.length,
              bulkActionScopedOwnerName: caseRecord.ownerName,
              nextAction: input.nextAction,
              nextActionDueAt: input.nextActionDueAt,
              ownerName: nextOwnerName
            }
          });

          await syncFollowUpJob(transaction, {
            automationHoldReason: getCaseAutomationHoldReason(currentQaReviews.get(caseRecord.caseId) ?? null),
            automationStatus: toAutomationStatus(caseRecord.automationStatus),
            caseId: caseRecord.caseId,
            runAfter: input.nextActionDueAt,
            updatedAt
          });
        }
      });

      const updatedCases = await Promise.all(uniqueCaseIds.map((caseId) => getPersistedCaseDetail(caseId)));

      return updatedCases.filter((caseRecord): caseRecord is PersistedCaseDetail => caseRecord !== null);
    },
    async runDueFollowUpCycle(input) {
      const dueJobs = await db
        .select({
          caseId: automationJobs.caseId,
          jobId: automationJobs.id,
          runAfter: automationJobs.runAfter
        })
        .from(automationJobs)
        .where(and(eq(automationJobs.jobType, followUpWatchJobType), eq(automationJobs.status, "queued")))
        .orderBy(asc(automationJobs.runAfter))
        .limit(input.limit);

      const dueTimestamp = new Date(input.runAt).getTime();
      let processedJobs = 0;
      const touchedCaseIds = new Set<string>();

      for (const job of dueJobs) {
        if (new Date(job.runAfter).getTime() > dueTimestamp) {
          continue;
        }

        processedJobs += 1;

        const cycleOutcome = await db.transaction(async (transaction) => {
          const [caseRecord] = await transaction
            .select({
              automationStatus: cases.automationStatus,
              caseId: cases.id,
              nextActionDueAt: cases.nextActionDueAt,
              stage: cases.stage
            })
            .from(cases)
            .where(eq(cases.id, job.caseId))
            .limit(1);

          const [currentQaReview] = await transaction
            .select({
              status: caseQaReviews.status
            })
            .from(caseQaReviews)
            .where(eq(caseQaReviews.caseId, job.caseId))
            .orderBy(desc(caseQaReviews.createdAt), desc(caseQaReviews.updatedAt))
            .limit(1);

          const outstandingDocumentRecords = caseRecord
            ? await transaction
                .select({
                  status: documentRequests.status
                })
                .from(documentRequests)
                .where(eq(documentRequests.caseId, caseRecord.caseId))
            : [];

          await transaction
            .update(automationJobs)
            .set({
              status: "completed",
              updatedAt: input.runAt
            })
            .where(eq(automationJobs.id, job.jobId));

          if (!caseRecord) {
            return {
              caseId: job.caseId,
              queuedTrigger: false
            };
          }

          if (
            toAutomationStatus(caseRecord.automationStatus) === "paused" ||
            getCaseAutomationHoldReasonFromStatus(currentQaReview ? toCaseQaReviewStatus(currentQaReview.status) : null) !== null
          ) {
            return {
              caseId: caseRecord.caseId,
              queuedTrigger: false
            };
          }

          if (new Date(caseRecord.nextActionDueAt).getTime() > dueTimestamp) {
            return {
              caseId: caseRecord.caseId,
              queuedTrigger: false
            };
          }

          const hasOutstandingDocuments =
            caseRecord.stage === "documents_in_progress" &&
            outstandingDocumentRecords.some((documentRecord) => toDocumentRequestStatus(documentRecord.status) !== "accepted");

          await syncCaseAgentTriggerJob(transaction, {
            caseId: caseRecord.caseId,
            runAfter: input.runAt,
            triggerType: hasOutstandingDocuments ? "document_missing" : "no_response_follow_up",
            updatedAt: input.runAt
          });

          return {
            caseId: caseRecord.caseId,
            queuedTrigger: true
          };
        });

        touchedCaseIds.add(cycleOutcome.caseId);
      }

      return {
        openedInterventions: 0,
        processedJobs,
        touchedCaseIds: Array.from(touchedCaseIds)
      };
    },
    async scheduleVisit(caseId, input) {
      const caseRecord = await getPersistedCaseDetail(caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();

      await db.transaction(async (transaction) => {
        await transaction.insert(visits).values({
          caseId,
          createdAt: updatedAt,
          id: randomUUID(),
          location: input.location,
          scheduledAt: input.scheduledAt
        });

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "visit_scheduled",
            updatedAt
          })
          .where(eq(cases.id, caseId));

        await transaction.insert(auditEvents).values({
          caseId,
          createdAt: updatedAt,
          eventType: "visit_scheduled",
          id: randomUUID(),
          payload: {
            location: input.location,
            scheduledAt: input.scheduledAt
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getPersistedCaseDetail(caseId);
    },
    async setAutomationStatus(caseId, input) {
      const caseRecord = await getPersistedCaseDetail(caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();

      await db.transaction(async (transaction) => {
        await transaction
          .update(cases)
          .set({
            automationStatus: input.status,
            updatedAt
          })
          .where(eq(cases.id, caseId));

        await transaction.insert(auditEvents).values({
          caseId,
          createdAt: updatedAt,
          eventType: input.status === "paused" ? "automation_paused" : "automation_resumed",
          id: randomUUID(),
          payload: {
            status: input.status
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: input.status,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId,
          runAfter: caseRecord.nextActionDueAt,
          updatedAt
        });

        await syncNewLeadCaseAgentTrigger(transaction, {
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          automationStatus: input.status,
          caseId,
          source: caseRecord.source,
          stage: caseRecord.stage,
          updatedAt
        });
      });

      return getPersistedCaseDetail(caseId);
    },
    async startHandoverIntake(caseId, input) {
      const caseRecord = await getPersistedCaseDetail(caseId);

      if (!caseRecord) {
        return null;
      }

      const nextOwnerName = input.ownerName ?? caseRecord.ownerName;
      const updatedAt = new Date().toISOString();
      const createdHandoverCaseId = randomUUID();

      await db.transaction(async (transaction) => {
        await transaction.insert(handoverCases).values({
          caseId,
          createdAt: updatedAt,
          id: createdHandoverCaseId,
          ownerName: nextOwnerName,
          readinessSummary: input.readinessSummary,
          status: "pending_readiness",
          updatedAt
        });

        await transaction.insert(handoverTasks).values(
          defaultHandoverTaskTypes.map((taskType, index) => ({
            createdAt: updatedAt,
            dueAt: createFutureTimestamp(updatedAt, (index + 1) * 24),
            handoverCaseId: createdHandoverCaseId,
            id: randomUUID(),
            ownerName: nextOwnerName,
            status: "open",
            type: taskType,
            updatedAt
          }))
        );

        await transaction.insert(handoverMilestones).values(
          defaultHandoverMilestoneTypes.map((milestoneType, index) => ({
            createdAt: updatedAt,
            handoverCaseId: createdHandoverCaseId,
            id: randomUUID(),
            ownerName: nextOwnerName,
            status: "planned",
            targetAt: createFutureTimestamp(updatedAt, (index + 1) * 24),
            type: milestoneType,
            updatedAt
          }))
        );

        await transaction.insert(handoverCustomerUpdates).values(
          defaultHandoverCustomerUpdateTypes.map((customerUpdateType) => ({
            createdAt: updatedAt,
            deliveryPreparedAt: null,
            deliverySummary: null,
            dispatchReadyAt: null,
            handoverCaseId: createdHandoverCaseId,
            id: randomUUID(),
            qaPolicySignals: [],
            qaReviewSampleSummary: null,
            qaReviewStatus: "not_required",
            qaReviewSummary: null,
            qaReviewedAt: null,
            qaReviewerName: null,
            qaTriggerEvidence: [],
            status: "blocked",
            type: customerUpdateType,
            updatedAt
          }))
        );

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            ownerName: nextOwnerName,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, caseId));

        await resolveOpenInterventions(transaction, {
          caseId,
          resolutionNote: "handover_intake_started",
          resolvedAt: updatedAt
        });

        await transaction.insert(auditEvents).values({
          caseId,
          createdAt: updatedAt,
          eventType: "handover_intake_created",
          id: randomUUID(),
          payload: {
            handoverCaseId: createdHandoverCaseId,
            ownerName: nextOwnerName,
            readinessSummary: input.readinessSummary
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getPersistedCaseDetail(caseId);
    },
    async updateDocumentRequestStatus(caseId, documentRequestId, input) {
      const documentRequest = await db
        .select({
          documentRequestId: documentRequests.id
        })
        .from(documentRequests)
        .where(and(eq(documentRequests.caseId, caseId), eq(documentRequests.id, documentRequestId)))
        .limit(1);

      if (!documentRequest[0]) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();

      await db.transaction(async (transaction) => {
        await transaction
          .update(documentRequests)
          .set({
            status: input.status,
            updatedAt
          })
          .where(and(eq(documentRequests.caseId, caseId), eq(documentRequests.id, documentRequestId)));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "documents_in_progress",
            updatedAt
          })
          .where(eq(cases.id, caseId));

        await transaction.insert(auditEvents).values({
          caseId,
          createdAt: updatedAt,
          eventType: "document_request_updated",
          id: randomUUID(),
          payload: {
            documentRequestId,
            status: input.status
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getPersistedCaseDetail(caseId);
    },
    async createHandoverBlocker(handoverCaseId, input) {
      const handoverRecord = await getHandoverCaseDetail(handoverCaseId);

      if (!handoverRecord) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(handoverRecord.caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();
      const blockerId = randomUUID();
      const nextOwnerName = input.ownerName ?? handoverRecord.ownerName;

      await db.transaction(async (transaction) => {
        await transaction.insert(handoverBlockers).values({
          createdAt: updatedAt,
          dueAt: input.dueAt,
          handoverCaseId,
          id: blockerId,
          ownerName: nextOwnerName,
          severity: input.severity,
          status: input.status,
          summary: input.summary,
          type: input.type,
          updatedAt
        });

        await transaction
          .update(handoverCases)
          .set({
            status: input.nextHandoverStatus,
            updatedAt
          })
          .where(eq(handoverCases.id, handoverCaseId));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, handoverRecord.caseId));

        await transaction.insert(auditEvents).values({
          caseId: handoverRecord.caseId,
          createdAt: updatedAt,
          eventType: "handover_blocker_logged",
          id: randomUUID(),
          payload: {
            blockerId,
            dueAt: input.dueAt,
            handoverCaseId,
            ownerName: nextOwnerName,
            severity: input.severity,
            status: input.status,
            summary: input.summary,
            type: input.type
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    },
    async planHandoverAppointment(handoverCaseId, input) {
      const handoverRecord = await getHandoverCaseDetail(handoverCaseId);

      if (!handoverRecord) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(handoverRecord.caseId);

      if (!caseRecord) {
        return null;
      }

      const existingAppointment = handoverRecord.appointment;
      const updatedAt = new Date().toISOString();
      const appointmentId = existingAppointment?.appointmentId ?? randomUUID();
      const coordinatorName = input.coordinatorName ?? handoverRecord.ownerName;
      const appointmentConfirmationUpdate = handoverRecord.customerUpdates.find(
        (customerUpdate) => customerUpdate.type === "appointment_confirmation"
      );

      await db.transaction(async (transaction) => {
        if (existingAppointment) {
          await transaction
            .update(handoverAppointments)
            .set({
              coordinatorName,
              location: input.location,
              scheduledAt: input.scheduledAt,
              status: "planned",
              updatedAt
            })
            .where(eq(handoverAppointments.handoverCaseId, handoverCaseId));
        } else {
          await transaction.insert(handoverAppointments).values({
            coordinatorName,
            createdAt: updatedAt,
            handoverCaseId,
            id: appointmentId,
            location: input.location,
            scheduledAt: input.scheduledAt,
            status: "planned",
            updatedAt
          });
        }

        if (
          appointmentConfirmationUpdate &&
          (appointmentConfirmationUpdate.status === "prepared_for_delivery" || appointmentConfirmationUpdate.status === "ready_to_dispatch")
        ) {
          await transaction
            .update(handoverCustomerUpdates)
            .set({
              deliveryPreparedAt: null,
              deliverySummary: null,
              dispatchReadyAt: null,
              status: "approved",
              updatedAt
            })
            .where(
              and(
                eq(handoverCustomerUpdates.handoverCaseId, handoverCaseId),
                eq(handoverCustomerUpdates.id, appointmentConfirmationUpdate.customerUpdateId)
              )
            );
        }

        await transaction
          .update(handoverCases)
          .set({
            status: input.nextHandoverStatus,
            updatedAt
          })
          .where(eq(handoverCases.id, handoverCaseId));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, handoverRecord.caseId));

        await transaction.insert(auditEvents).values({
          caseId: handoverRecord.caseId,
          createdAt: updatedAt,
          eventType: "handover_appointment_planned",
          id: randomUUID(),
          payload: {
            appointmentId,
            coordinatorName,
            handoverCaseId,
            location: input.location,
            scheduledAt: input.scheduledAt,
            status: "planned"
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    },
    async confirmHandoverAppointment(handoverCaseId, appointmentId, input) {
      const handoverRecord = await getHandoverCaseDetail(handoverCaseId);

      if (!handoverRecord || !handoverRecord.appointment || handoverRecord.appointment.appointmentId !== appointmentId) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(handoverRecord.caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();

      await db.transaction(async (transaction) => {
        await transaction
          .update(handoverAppointments)
          .set({
            status: input.status,
            updatedAt
          })
          .where(eq(handoverAppointments.handoverCaseId, handoverCaseId));

        await transaction
          .update(handoverCases)
          .set({
            status: input.nextHandoverStatus,
            updatedAt
          })
          .where(eq(handoverCases.id, handoverCaseId));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, handoverRecord.caseId));

        await transaction.insert(auditEvents).values({
          caseId: handoverRecord.caseId,
          createdAt: updatedAt,
          eventType: "handover_appointment_confirmed",
          id: randomUUID(),
          payload: {
            appointmentId,
            handoverCaseId,
            status: input.status
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    },
    async updateHandoverBlocker(handoverCaseId, blockerId, input) {
      const handoverRecord = await getHandoverCaseDetail(handoverCaseId);

      if (!handoverRecord) {
        return null;
      }

      const blockerRecord = handoverRecord.blockers.find((blocker) => blocker.blockerId === blockerId);

      if (!blockerRecord) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(handoverRecord.caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();
      const nextOwnerName = input.ownerName ?? blockerRecord.ownerName;

      await db.transaction(async (transaction) => {
        await transaction
          .update(handoverBlockers)
          .set({
            dueAt: input.dueAt,
            ownerName: nextOwnerName,
            severity: input.severity,
            status: input.status,
            summary: input.summary,
            updatedAt
          })
          .where(and(eq(handoverBlockers.handoverCaseId, handoverCaseId), eq(handoverBlockers.id, blockerId)));

        await transaction
          .update(handoverCases)
          .set({
            status: input.nextHandoverStatus,
            updatedAt
          })
          .where(eq(handoverCases.id, handoverCaseId));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, handoverRecord.caseId));

        await transaction.insert(auditEvents).values({
          caseId: handoverRecord.caseId,
          createdAt: updatedAt,
          eventType: "handover_blocker_updated",
          id: randomUUID(),
          payload: {
            blockerId,
            dueAt: input.dueAt,
            handoverCaseId,
            ownerName: nextOwnerName,
            severity: input.severity,
            status: input.status,
            summary: input.summary
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    },
    async startHandoverExecution(handoverCaseId, input) {
      const handoverRecord = await getHandoverCaseDetail(handoverCaseId);

      if (!handoverRecord) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(handoverRecord.caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();

      await db.transaction(async (transaction) => {
        await transaction
          .update(handoverCases)
          .set({
            completedAt: null,
            completionSummary: null,
            executionStartedAt: updatedAt,
            status: input.nextHandoverStatus,
            updatedAt
          })
          .where(eq(handoverCases.id, handoverCaseId));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, handoverRecord.caseId));

        await transaction.insert(auditEvents).values({
          caseId: handoverRecord.caseId,
          createdAt: updatedAt,
          eventType: "handover_execution_started",
          id: randomUUID(),
          payload: {
            executionStartedAt: updatedAt,
            handoverCaseId,
            status: input.status
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    },
    async completeHandover(handoverCaseId, input) {
      const handoverRecord = await getHandoverCaseDetail(handoverCaseId);

      if (!handoverRecord) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(handoverRecord.caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();

      await db.transaction(async (transaction) => {
        await transaction
          .update(handoverCases)
          .set({
            completedAt: updatedAt,
            completionSummary: input.completionSummary,
            status: input.nextHandoverStatus,
            updatedAt
          })
          .where(eq(handoverCases.id, handoverCaseId));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, handoverRecord.caseId));

        await transaction.insert(auditEvents).values({
          caseId: handoverRecord.caseId,
          createdAt: updatedAt,
          eventType: "handover_completed",
          id: randomUUID(),
          payload: {
            completedAt: updatedAt,
            completionSummary: input.completionSummary,
            handoverCaseId,
            status: input.status
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    },
    async saveHandoverReview(handoverCaseId, input) {
      const handoverRecord = await getHandoverCaseDetail(handoverCaseId);

      if (!handoverRecord) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(handoverRecord.caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();
      const existingReview = handoverRecord.review;
      const reviewId = existingReview?.reviewId ?? randomUUID();

      await db.transaction(async (transaction) => {
        await transaction
          .insert(handoverReviews)
          .values({
            createdAt: existingReview?.createdAt ?? updatedAt,
            handoverCaseId,
            id: reviewId,
            outcome: input.outcome,
            summary: input.summary,
            updatedAt
          })
          .onConflictDoUpdate({
            set: {
              outcome: input.outcome,
              summary: input.summary,
              updatedAt
            },
            target: handoverReviews.handoverCaseId
          });

        await transaction
          .update(handoverCases)
          .set({
            status: input.nextHandoverStatus,
            updatedAt
          })
          .where(eq(handoverCases.id, handoverCaseId));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, handoverRecord.caseId));

        await transaction.insert(auditEvents).values({
          caseId: handoverRecord.caseId,
          createdAt: updatedAt,
          eventType: "handover_review_saved",
          id: randomUUID(),
          payload: {
            handoverCaseId,
            outcome: input.outcome,
            reviewId,
            summary: input.summary
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    },
    async saveHandoverArchiveReview(handoverCaseId, input) {
      const handoverRecord = await getHandoverCaseDetail(handoverCaseId);

      if (!handoverRecord) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(handoverRecord.caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();
      const existingReview = handoverRecord.archiveReview;
      const archiveReviewId = existingReview?.reviewId ?? randomUUID();

      await db.transaction(async (transaction) => {
        await transaction
          .insert(handoverArchiveReviews)
          .values({
            createdAt: existingReview?.createdAt ?? updatedAt,
            handoverCaseId,
            id: archiveReviewId,
            outcome: input.outcome,
            summary: input.summary,
            updatedAt
          })
          .onConflictDoUpdate({
            set: {
              outcome: input.outcome,
              summary: input.summary,
              updatedAt
            },
            target: handoverArchiveReviews.handoverCaseId
          });

        await transaction
          .update(handoverCases)
          .set({
            status: input.nextHandoverStatus,
            updatedAt
          })
          .where(eq(handoverCases.id, handoverCaseId));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, handoverRecord.caseId));

        await transaction.insert(auditEvents).values({
          caseId: handoverRecord.caseId,
          createdAt: updatedAt,
          eventType: "handover_archive_review_saved",
          id: randomUUID(),
          payload: {
            archiveReviewId,
            handoverCaseId,
            outcome: input.outcome,
            summary: input.summary
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    },
    async createHandoverPostCompletionFollowUp(handoverCaseId, input) {
      const handoverRecord = await getHandoverCaseDetail(handoverCaseId);

      if (!handoverRecord) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(handoverRecord.caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();
      const existingFollowUp = handoverRecord.postCompletionFollowUp;
      const followUpId = existingFollowUp?.followUpId ?? randomUUID();
      const ownerName = input.ownerName ?? handoverRecord.ownerName;

      await db.transaction(async (transaction) => {
        await transaction
          .insert(handoverPostCompletionFollowUps)
          .values({
            createdAt: existingFollowUp?.createdAt ?? updatedAt,
            dueAt: input.dueAt,
            handoverCaseId,
            id: followUpId,
            ownerName,
            resolutionSummary: null,
            resolvedAt: null,
            status: input.status,
            summary: input.summary,
            updatedAt
          })
          .onConflictDoUpdate({
            set: {
              dueAt: input.dueAt,
              ownerName,
              resolutionSummary: null,
              resolvedAt: null,
              status: input.status,
              summary: input.summary,
              updatedAt
            },
            target: handoverPostCompletionFollowUps.handoverCaseId
          });

        await transaction
          .update(handoverCases)
          .set({
            status: input.nextHandoverStatus,
            updatedAt
          })
          .where(eq(handoverCases.id, handoverCaseId));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, handoverRecord.caseId));

        await transaction.insert(auditEvents).values({
          caseId: handoverRecord.caseId,
          createdAt: updatedAt,
          eventType: "handover_post_completion_follow_up_opened",
          id: randomUUID(),
          payload: {
            dueAt: input.dueAt,
            followUpId,
            handoverCaseId,
            ownerName,
            status: input.status,
            summary: input.summary
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    },
    async updateHandoverArchiveStatus(handoverCaseId, input) {
      const handoverRecord = await getHandoverCaseDetail(handoverCaseId);

      if (!handoverRecord) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(handoverRecord.caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();
      const existingStatus = handoverRecord.archiveStatus;
      const archiveStatusId = existingStatus?.statusId ?? randomUUID();

      await db.transaction(async (transaction) => {
        await transaction
          .insert(handoverArchiveStatuses)
          .values({
            createdAt: existingStatus?.createdAt ?? updatedAt,
            handoverCaseId,
            id: archiveStatusId,
            status: input.status,
            summary: input.summary,
            updatedAt
          })
          .onConflictDoUpdate({
            set: {
              status: input.status,
              summary: input.summary,
              updatedAt
            },
            target: handoverArchiveStatuses.handoverCaseId
          });

        await transaction
          .update(handoverCases)
          .set({
            status: input.nextHandoverStatus,
            updatedAt
          })
          .where(eq(handoverCases.id, handoverCaseId));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, handoverRecord.caseId));

        await transaction.insert(auditEvents).values({
          caseId: handoverRecord.caseId,
          createdAt: updatedAt,
          eventType: "handover_archive_status_updated",
          id: randomUUID(),
          payload: {
            archiveStatusId,
            handoverCaseId,
            status: input.status,
            summary: input.summary
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    },
    async resolveHandoverPostCompletionFollowUp(handoverCaseId, followUpId, input) {
      const handoverRecord = await getHandoverCaseDetail(handoverCaseId);

      if (!handoverRecord || !handoverRecord.postCompletionFollowUp || handoverRecord.postCompletionFollowUp.followUpId !== followUpId) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(handoverRecord.caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();

      await db.transaction(async (transaction) => {
        await transaction
          .update(handoverPostCompletionFollowUps)
          .set({
            resolutionSummary: input.resolutionSummary,
            resolvedAt: updatedAt,
            status: input.status,
            updatedAt
          })
          .where(and(eq(handoverPostCompletionFollowUps.handoverCaseId, handoverCaseId), eq(handoverPostCompletionFollowUps.id, followUpId)));

        await transaction
          .update(handoverCases)
          .set({
            status: input.nextHandoverStatus,
            updatedAt
          })
          .where(eq(handoverCases.id, handoverCaseId));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, handoverRecord.caseId));

        await transaction.insert(auditEvents).values({
          caseId: handoverRecord.caseId,
          createdAt: updatedAt,
          eventType: "handover_post_completion_follow_up_resolved",
          id: randomUUID(),
          payload: {
            followUpId,
            handoverCaseId,
            resolutionSummary: input.resolutionSummary,
            status: input.status
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    },
    async prepareHandoverCustomerUpdateDelivery(handoverCaseId, customerUpdateId, input) {
      const handoverRecord = await getHandoverCaseDetail(handoverCaseId);

      if (!handoverRecord) {
        return null;
      }

      const customerUpdate = handoverRecord.customerUpdates.find((item) => item.customerUpdateId === customerUpdateId);

      if (!customerUpdate) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(handoverRecord.caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();
      const qaReviewSampleSummary = input.qaReview?.sampleSummary ?? null;
      const qaPolicySignals = input.qaReview?.policyMatches.map((match) => match.signal) ?? [];
      const qaTriggerEvidence = input.qaReview?.policyMatches.map((match) => match.evidence) ?? [];
      const qaReviewStatus: HandoverCustomerUpdateQaReviewStatus = input.qaReview ? "pending_review" : "not_required";

      await db.transaction(async (transaction) => {
        await transaction
          .update(handoverCustomerUpdates)
          .set({
            deliveryPreparedAt: updatedAt,
            deliverySummary: input.deliverySummary,
            dispatchReadyAt: null,
            qaPolicySignals,
            qaReviewSampleSummary,
            qaReviewStatus,
            qaReviewSummary: null,
            qaReviewedAt: null,
            qaReviewerName: null,
            qaTriggerEvidence,
            status: input.status,
            updatedAt
          })
          .where(and(eq(handoverCustomerUpdates.handoverCaseId, handoverCaseId), eq(handoverCustomerUpdates.id, customerUpdateId)));

        await transaction
          .update(handoverCases)
          .set({
            status: input.nextHandoverStatus,
            updatedAt
          })
          .where(eq(handoverCases.id, handoverCaseId));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, handoverRecord.caseId));

        await transaction.insert(auditEvents).values({
          caseId: handoverRecord.caseId,
          createdAt: updatedAt,
          eventType: "handover_customer_delivery_prepared",
          id: randomUUID(),
          payload: {
            customerUpdateId,
            deliverySummary: input.deliverySummary,
            handoverCaseId,
            qaPolicySignals,
            qaReviewSampleSummary,
            qaReviewStatus,
            status: input.status,
            type: customerUpdate.type
          }
        });

        if (input.qaReview) {
          await transaction.insert(auditEvents).values({
            caseId: handoverRecord.caseId,
            createdAt: updatedAt,
            eventType: "handover_customer_update_qa_review_requested",
            id: randomUUID(),
            payload: {
              customerUpdateId,
              handoverCaseId,
              policySignals: qaPolicySignals,
              reviewSampleSummary: qaReviewSampleSummary,
              triggerEvidence: qaTriggerEvidence,
              type: customerUpdate.type
            }
          });
        }

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    },
    async resolveHandoverCustomerUpdateQaReview(handoverCaseId, customerUpdateId, input) {
      const handoverRecord = await getHandoverCaseDetail(handoverCaseId);

      if (!handoverRecord) {
        return null;
      }

      const customerUpdate = handoverRecord.customerUpdates.find((item) => item.customerUpdateId === customerUpdateId);

      if (!customerUpdate) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(handoverRecord.caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();

      await db.transaction(async (transaction) => {
        await transaction
          .update(handoverCustomerUpdates)
          .set({
            qaReviewStatus: input.status,
            qaReviewSummary: input.reviewSummary,
            qaReviewedAt: updatedAt,
            qaReviewerName: input.reviewerName ?? customerUpdate.qaReviewerName ?? "QA Team",
            updatedAt
          })
          .where(and(eq(handoverCustomerUpdates.handoverCaseId, handoverCaseId), eq(handoverCustomerUpdates.id, customerUpdateId)));

        await transaction
          .update(handoverCases)
          .set({
            status: input.nextHandoverStatus,
            updatedAt
          })
          .where(eq(handoverCases.id, handoverCaseId));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, handoverRecord.caseId));

        await transaction.insert(auditEvents).values({
          caseId: handoverRecord.caseId,
          createdAt: updatedAt,
          eventType: "handover_customer_update_qa_review_resolved",
          id: randomUUID(),
          payload: {
            customerUpdateId,
            handoverCaseId,
            reviewSummary: input.reviewSummary,
            reviewedAt: updatedAt,
            reviewerName: input.reviewerName ?? customerUpdate.qaReviewerName ?? "QA Team",
            status: input.status,
            type: customerUpdate.type
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    },
    async markHandoverCustomerUpdateDispatchReady(handoverCaseId, customerUpdateId, input) {
      const handoverRecord = await getHandoverCaseDetail(handoverCaseId);

      if (!handoverRecord) {
        return null;
      }

      const customerUpdate = handoverRecord.customerUpdates.find((item) => item.customerUpdateId === customerUpdateId);

      if (!customerUpdate) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(handoverRecord.caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();

      await db.transaction(async (transaction) => {
        await transaction
          .update(handoverCustomerUpdates)
          .set({
            dispatchReadyAt: updatedAt,
            status: input.status,
            updatedAt
          })
          .where(and(eq(handoverCustomerUpdates.handoverCaseId, handoverCaseId), eq(handoverCustomerUpdates.id, customerUpdateId)));

        await transaction
          .update(handoverCases)
          .set({
            status: input.nextHandoverStatus,
            updatedAt
          })
          .where(eq(handoverCases.id, handoverCaseId));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, handoverRecord.caseId));

        await transaction.insert(auditEvents).values({
          caseId: handoverRecord.caseId,
          createdAt: updatedAt,
          eventType: "handover_customer_dispatch_ready",
          id: randomUUID(),
          payload: {
            customerUpdateId,
            handoverCaseId,
            status: input.status,
            type: customerUpdate.type
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    },
    async updateHandoverCustomerUpdateStatus(handoverCaseId, customerUpdateId, input) {
      const handoverRecord = await getHandoverCaseDetail(handoverCaseId);

      if (!handoverRecord) {
        return null;
      }

      const customerUpdate = handoverRecord.customerUpdates.find((item) => item.customerUpdateId === customerUpdateId);

      if (!customerUpdate) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(handoverRecord.caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();

      await db.transaction(async (transaction) => {
        await transaction
          .update(handoverCustomerUpdates)
          .set({
            deliveryPreparedAt: null,
            deliverySummary: null,
            dispatchReadyAt: null,
            qaPolicySignals: [],
            qaReviewSampleSummary: null,
            qaReviewStatus: "not_required",
            qaReviewSummary: null,
            qaReviewedAt: null,
            qaReviewerName: null,
            qaTriggerEvidence: [],
            status: input.status,
            updatedAt
          })
          .where(and(eq(handoverCustomerUpdates.handoverCaseId, handoverCaseId), eq(handoverCustomerUpdates.id, customerUpdateId)));

        await transaction
          .update(handoverCases)
          .set({
            status: input.nextHandoverStatus,
            updatedAt
          })
          .where(eq(handoverCases.id, handoverCaseId));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, handoverRecord.caseId));

        await transaction.insert(auditEvents).values({
          caseId: handoverRecord.caseId,
          createdAt: updatedAt,
          eventType: "handover_customer_update_approved",
          id: randomUUID(),
          payload: {
            customerUpdateId,
            handoverCaseId,
            status: input.status,
            type: customerUpdate.type
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    },
    async updateHandoverMilestone(handoverCaseId, milestoneId, input) {
      const handoverRecord = await getHandoverCaseDetail(handoverCaseId);

      if (!handoverRecord) {
        return null;
      }

      const milestoneRecord = handoverRecord.milestones.find((milestone) => milestone.milestoneId === milestoneId);

      if (!milestoneRecord) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(handoverRecord.caseId);

      if (!caseRecord) {
        return null;
      }

      const linkedCustomerUpdateType = mapMilestoneTypeToCustomerUpdateType(milestoneRecord.type);
      const linkedCustomerUpdate = handoverRecord.customerUpdates.find((customerUpdate) => customerUpdate.type === linkedCustomerUpdateType);

      if (!linkedCustomerUpdate) {
        return null;
      }

      const updatedAt = new Date().toISOString();
      const nextOwnerName = input.ownerName ?? milestoneRecord.ownerName;

      await db.transaction(async (transaction) => {
        await transaction
          .update(handoverMilestones)
          .set({
            ownerName: nextOwnerName,
            status: input.status,
            targetAt: input.targetAt,
            updatedAt
          })
          .where(and(eq(handoverMilestones.handoverCaseId, handoverCaseId), eq(handoverMilestones.id, milestoneId)));

        await transaction
          .update(handoverCustomerUpdates)
          .set({
            deliveryPreparedAt: null,
            deliverySummary: null,
            dispatchReadyAt: null,
            qaPolicySignals: [],
            qaReviewSampleSummary: null,
            qaReviewStatus: "not_required",
            qaReviewSummary: null,
            qaReviewedAt: null,
            qaReviewerName: null,
            qaTriggerEvidence: [],
            status: input.nextCustomerUpdateStatus,
            updatedAt
          })
          .where(and(eq(handoverCustomerUpdates.handoverCaseId, handoverCaseId), eq(handoverCustomerUpdates.id, linkedCustomerUpdate.customerUpdateId)));

        await transaction
          .update(handoverCases)
          .set({
            status: input.nextHandoverStatus,
            updatedAt
          })
          .where(eq(handoverCases.id, handoverCaseId));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, handoverRecord.caseId));

        await transaction.insert(auditEvents).values({
          caseId: handoverRecord.caseId,
          createdAt: updatedAt,
          eventType: "handover_milestone_updated",
          id: randomUUID(),
          payload: {
            customerUpdateId: linkedCustomerUpdate.customerUpdateId,
            customerUpdateStatus: input.nextCustomerUpdateStatus,
            handoverCaseId,
            milestoneId,
            ownerName: nextOwnerName,
            status: input.status,
            targetAt: input.targetAt,
            type: milestoneRecord.type
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    },
    async updateHandoverTaskStatus(handoverCaseId, handoverTaskId, input) {
      const handoverRecord = await getHandoverCaseDetail(handoverCaseId);

      if (!handoverRecord) {
        return null;
      }

      const taskRecord = handoverRecord.tasks.find((task) => task.taskId === handoverTaskId);

      if (!taskRecord) {
        return null;
      }

      const caseRecord = await getPersistedCaseDetail(handoverRecord.caseId);

      if (!caseRecord) {
        return null;
      }

      const updatedAt = new Date().toISOString();

      await db.transaction(async (transaction) => {
        await transaction
          .update(handoverTasks)
          .set({
            status: input.status,
            updatedAt
          })
          .where(and(eq(handoverTasks.handoverCaseId, handoverCaseId), eq(handoverTasks.id, handoverTaskId)));

        await transaction
          .update(handoverCases)
          .set({
            status: input.nextHandoverStatus,
            updatedAt
          })
          .where(eq(handoverCases.id, handoverCaseId));

        await transaction
          .update(cases)
          .set({
            currentNextAction: input.nextAction,
            nextActionDueAt: input.nextActionDueAt,
            stage: "handover_initiated",
            updatedAt
          })
          .where(eq(cases.id, handoverRecord.caseId));

        await transaction.insert(auditEvents).values({
          caseId: handoverRecord.caseId,
          createdAt: updatedAt,
          eventType: "handover_task_updated",
          id: randomUUID(),
          payload: {
            handoverCaseId,
            handoverTaskId,
            status: input.status,
            handoverStatus: input.nextHandoverStatus
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
          automationHoldReason: getCaseAutomationHoldReason(caseRecord.currentQaReview),
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    }
  };
}

function createFutureTimestamp(anchor: string, hoursFromNow: number) {
  return new Date(new Date(anchor).getTime() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

function deriveDocumentWorkflowNextAction(documentRequests: PersistedDocumentRequest[], locale: SupportedLocale) {
  if (documentRequests.some((documentRequest) => documentRequest.status === "rejected")) {
    return locale === "ar" ? "معالجة المستندات المرفوضة وطلب نسخة بديلة" : "Resolve rejected documents and request replacements";
  }

  if (documentRequests.every((documentRequest) => documentRequest.status === "accepted")) {
    return locale === "ar" ? "رفع الحالة إلى اعتماد التسليم بعد اكتمال المستندات" : "Escalate the case for handover approval after documents are complete";
  }

  return locale === "ar" ? "متابعة المستندات المطلوبة مع العميل" : "Track the outstanding document requests with the prospect";
}

function deriveHandoverCaseStatus(
  tasks: PersistedHandoverTask[],
  milestones: PersistedHandoverMilestone[],
  customerUpdates: PersistedHandoverCustomerUpdate[] = [],
  appointment: PersistedHandoverAppointment | null = null
): HandoverCaseStatus {
  const schedulingMilestone = milestones.find((milestone) => milestone.type === "customer_scheduling_window");
  const appointmentConfirmationStatus = customerUpdates.find((customerUpdate) => customerUpdate.type === "appointment_confirmation")?.status;

  if (appointment?.status === "internally_confirmed" && appointmentConfirmationStatus === "ready_to_dispatch") {
    return "scheduled";
  }

  if (tasks.every((task) => task.status === "complete") && schedulingMilestone?.status === "ready") {
    return "customer_scheduling_ready";
  }

  if (tasks.some((task) => task.status !== "open") || milestones.some((milestone) => milestone.status !== "planned")) {
    return "internal_tasks_open";
  }

  return "pending_readiness";
}

function getHandoverCaseNextAction(
  locale: SupportedLocale,
  status: HandoverCaseStatus,
  tasks: PersistedHandoverTask[],
  milestones: PersistedHandoverMilestone[],
  customerUpdates: PersistedHandoverCustomerUpdate[],
  appointment: PersistedHandoverAppointment | null,
  blockers: PersistedHandoverBlocker[] = [],
  review: PersistedHandoverReview | null = null,
  postCompletionFollowUp: PersistedHandoverPostCompletionFollowUp | null = null,
  archiveReview: PersistedHandoverArchiveReview | null = null,
  archiveStatus: PersistedHandoverArchiveStatus | null = null
) {
  const schedulingInviteStatus = customerUpdates.find((customerUpdate) => customerUpdate.type === "scheduling_invite")?.status;
  const appointmentConfirmationStatus = customerUpdates.find((customerUpdate) => customerUpdate.type === "appointment_confirmation")?.status;
  const pendingCustomerUpdateQaReview = customerUpdates.find((customerUpdate) => customerUpdate.qaReviewStatus === "pending_review");
  const followUpRequiredCustomerUpdateQaReview = customerUpdates.find(
    (customerUpdate) => customerUpdate.qaReviewStatus === "follow_up_required"
  );
  const openBlockers = blockers.filter((blocker) => blocker.status !== "resolved");

  if (status === "completed" && !review) {
    return locale === "ar"
      ? "تسجيل مراجعة المدير بعد التسليم وتحديد ما إذا كانت متابعة ما بعد التسليم مطلوبة"
      : "Record the post-handover manager review and decide whether aftercare follow-up is required";
  }

  if (status === "completed" && review?.outcome === "follow_up_required" && postCompletionFollowUp?.status === "open") {
    return locale === "ar"
      ? "معالجة متابعة ما بعد التسليم المفتوحة حتى يتم إغلاقها بملخص حل واضح"
      : "Resolve the open post-handover follow-up and close it with a clear resolution summary";
  }

  if (status === "completed" && review?.outcome === "follow_up_required" && !postCompletionFollowUp) {
    return locale === "ar"
      ? "فتح حد متابعة ما بعد التسليم وتعيين المالك والموعد النهائي"
      : "Open the post-handover follow-up boundary with an owner and due time";
  }

  if (status === "completed" && !archiveReview) {
    return locale === "ar"
      ? "حفظ مراجعة الإغلاق الإداري وتحديد ما إذا كان السجل جاهزاً للأرشفة أو يحتاج إلى تعليق يدوي"
      : "Save the archive review and decide whether the completed record is ready to archive or should be held for manual review";
  }

  if (status === "completed" && archiveReview?.outcome === "hold_for_review" && archiveStatus?.status !== "held") {
    return locale === "ar"
      ? "تعليق أرشفة السجل المكتمل حتى تتم مراجعة الإغلاق الإداري يدوياً"
      : "Place the completed handover on archive hold until the administrative closure review is cleared manually";
  }

  if (status === "completed" && archiveReview?.outcome === "ready_to_archive" && !archiveStatus) {
    return locale === "ar"
      ? "ترقية السجل المكتمل إلى حالة جاهزة للأرشفة بعد اكتمال المراجعة الإدارية"
      : "Promote the completed handover into a ready-to-archive state after the administrative review is complete";
  }

  if (status === "completed" && archiveReview?.outcome === "ready_to_archive" && archiveStatus?.status === "held") {
    return locale === "ar"
      ? "إزالة تعليق الأرشفة وترقية السجل إلى حالة جاهزة للأرشفة"
      : "Clear the archive hold and promote the record into a ready-to-archive state";
  }

  if (status === "completed" && archiveStatus?.status === "ready") {
    return locale === "ar"
      ? "أرشفة سجل التسليم المكتمل بعد اكتمال حدود الإغلاق الإداري"
      : "Archive the completed handover record after the closure boundary is fully ready";
  }

  if (status === "completed" && archiveStatus?.status === "archived") {
    return locale === "ar"
      ? "مراجعة السجل المؤرشف يدوياً فقط إذا ظهرت حاجة تشغيلية لاحقة"
      : "Review the archived handover record manually only if a later operational issue appears";
  }

  if (status === "completed") {
    return locale === "ar"
      ? "مراجعة سجل التسليم المكتمل وأي ملاحظات متابعة لاحقة يدوياً"
      : "Review the completed handover record and any post-handover follow-up manually";
  }

  if (status === "in_progress" && openBlockers.length > 0) {
    return locale === "ar"
      ? "معالجة عوائق التنفيذ المفتوحة قبل إغلاق يوم التسليم"
      : "Resolve the open execution blockers before closing the handover day";
  }

  if (status === "in_progress") {
    return locale === "ar"
      ? "إغلاق يوم التسليم بملخص إتمام مضبوط بعد انتهاء التنفيذ الميداني"
      : "Close the handover day with a controlled completion summary after field execution";
  }

  if (status === "scheduled" && openBlockers.length > 0) {
    return locale === "ar"
      ? "معالجة عوائق التنفيذ المفتوحة قبل المتابعة في يوم التسليم"
      : "Resolve the open execution blockers before advancing the handover day plan";
  }

  if (status === "scheduled") {
    return locale === "ar"
      ? "بدء حالة التنفيذ في يوم التسليم بعد التأكد من خلو السجل من العوائق المفتوحة"
      : "Start the handover-day execution state once the scheduled record has no open blockers";
  }

  if (pendingCustomerUpdateQaReview) {
    return locale === "ar"
      ? "احصل على اعتماد الجودة للتحديث المجهز قبل تحويله إلى حالة جاهزة للإرسال"
      : "Get explicit QA approval on the prepared customer update before promoting it to dispatch-ready";
  }

  if (followUpRequiredCustomerUpdateQaReview) {
    return locale === "ar"
      ? "راجع صياغة التحديث المجهز وأعد إرساله بعد معالجة ملاحظات الجودة"
      : "Revise the prepared customer update and resubmit it after addressing the QA feedback";
  }

  if (appointmentConfirmationStatus === "ready_to_dispatch") {
    return locale === "ar"
      ? "الاحتفاظ بالتسليم المجدول حتى يتوفر مسار إرسال أو تنفيذ فعلي"
      : "Hold the scheduled handover until real delivery or execution is enabled";
  }

  if (appointment?.status === "internally_confirmed" && appointmentConfirmationStatus === "prepared_for_delivery") {
    return locale === "ar"
      ? "تحويل التحديث المجهز إلى حالة جاهزة للإرسال من دون تشغيل أي مزود خارجي"
      : "Mark the prepared customer update as ready to dispatch without triggering any external provider";
  }

  if (appointment?.status === "internally_confirmed") {
    return locale === "ar"
      ? "تجهيز تأكيد الموعد المعتمد كرسالة جاهزة للإرسال لاحقاً"
      : "Prepare the approved appointment confirmation as the next outbound-ready customer update";
  }

  if (appointment && appointmentConfirmationStatus === "approved") {
    return locale === "ar" ? "اعتماد الموعد المخطط داخلياً دون إرسال خارجي" : "Confirm the planned handover appointment internally without outbound delivery";
  }

  if (appointment) {
    return locale === "ar" ? "اعتماد حد تأكيد موعد التسليم قبل تثبيت الموعد داخلياً" : "Approve the appointment-confirmation boundary before internally confirming the handover";
  }

  if (customerUpdates.some((customerUpdate) => customerUpdate.status === "ready_for_approval")) {
    return locale === "ar" ? "اعتماد التحديث التالي المخصص للعميل قبل الإرسال" : "Approve the next customer-facing update before it can be sent";
  }

  if (status === "customer_scheduling_ready" && schedulingInviteStatus === "approved") {
    return locale === "ar" ? "تخطيط موعد التسليم داخلياً فوق حد الجدولة المعتمد" : "Plan the internal handover appointment on top of the approved scheduling boundary";
  }

  if (status === "customer_scheduling_ready") {
    return locale === "ar"
      ? "تجهيز حدود التواصل الخاصة بموعد التسليم مع العميل"
      : "Prepare the customer scheduling communication boundary for handover";
  }

  if (tasks.some((task) => task.status === "blocked") || milestones.some((milestone) => milestone.status === "blocked")) {
    return locale === "ar" ? "معالجة عناصر الجاهزية المعطلة قبل تحديد الموعد" : "Resolve blocked readiness items before scheduling";
  }

  if (tasks.every((task) => task.status === "complete") && milestones.some((milestone) => milestone.status === "planned")) {
    return locale === "ar" ? "تخطيط محطات التسليم التالية وحدود تواصل العميل" : "Plan the remaining handover milestones and customer-update boundaries";
  }

  if (status === "internal_tasks_open") {
    return locale === "ar" ? "إكمال عناصر جاهزية التسليم المتبقية" : "Complete the remaining handover readiness items";
  }

  return locale === "ar" ? "بدء قائمة جاهزية التسليم مع الفريق الداخلي" : "Start the handover readiness checklist with the internal team";
}

function getHandoverCaseNextActionDueAt(
  status: HandoverCaseStatus,
  tasks: PersistedHandoverTask[],
  milestones: PersistedHandoverMilestone[],
  customerUpdates: PersistedHandoverCustomerUpdate[],
  appointment: PersistedHandoverAppointment | null,
  blockers: PersistedHandoverBlocker[] = [],
  review: PersistedHandoverReview | null = null,
  postCompletionFollowUp: PersistedHandoverPostCompletionFollowUp | null = null,
  archiveReview: PersistedHandoverArchiveReview | null = null,
  archiveStatus: PersistedHandoverArchiveStatus | null = null
) {
  const blockedTask = tasks.find((task) => task.status === "blocked");
  const blockedMilestone = milestones.find((milestone) => milestone.status === "blocked");
  const schedulingInviteStatus = customerUpdates.find((customerUpdate) => customerUpdate.type === "scheduling_invite")?.status;
  const appointmentConfirmationStatus = customerUpdates.find((customerUpdate) => customerUpdate.type === "appointment_confirmation")?.status;
  const pendingCustomerUpdateQaReview = customerUpdates.find((customerUpdate) => customerUpdate.qaReviewStatus === "pending_review");
  const followUpRequiredCustomerUpdateQaReview = customerUpdates.find(
    (customerUpdate) => customerUpdate.qaReviewStatus === "follow_up_required"
  );
  const openBlocker = blockers
    .filter((blocker) => blocker.status !== "resolved")
    .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime())[0];

  if (status === "completed" && !review) {
    return createFutureTimestamp(new Date().toISOString(), 4);
  }

  if (status === "completed" && review?.outcome === "follow_up_required" && postCompletionFollowUp?.status === "open") {
    return postCompletionFollowUp.dueAt;
  }

  if (status === "completed" && review?.outcome === "follow_up_required" && !postCompletionFollowUp) {
    return createFutureTimestamp(new Date().toISOString(), 8);
  }

  if (status === "completed" && !archiveReview) {
    return createFutureTimestamp(new Date().toISOString(), 8);
  }

  if (status === "completed" && archiveReview?.outcome === "hold_for_review" && archiveStatus?.status !== "held") {
    return createFutureTimestamp(new Date().toISOString(), 8);
  }

  if (status === "completed" && archiveReview?.outcome === "ready_to_archive" && !archiveStatus) {
    return createFutureTimestamp(new Date().toISOString(), 8);
  }

  if (status === "completed" && archiveReview?.outcome === "ready_to_archive" && archiveStatus?.status === "held") {
    return createFutureTimestamp(new Date().toISOString(), 8);
  }

  if (status === "completed" && archiveStatus?.status === "ready") {
    return createFutureTimestamp(new Date().toISOString(), 24);
  }

  if (status === "completed" && archiveStatus?.status === "archived") {
    return createFutureTimestamp(new Date().toISOString(), 168);
  }

  if (status === "completed") {
    return createFutureTimestamp(new Date().toISOString(), 24);
  }

  if (status === "in_progress" && openBlocker) {
    return openBlocker.dueAt;
  }

  if (status === "in_progress") {
    return createFutureTimestamp(new Date().toISOString(), 2);
  }

  if (status === "scheduled" && openBlocker) {
    return openBlocker.dueAt;
  }

  if (status === "scheduled") {
    return appointment?.scheduledAt ?? createFutureTimestamp(new Date().toISOString(), 4);
  }

  if (pendingCustomerUpdateQaReview || followUpRequiredCustomerUpdateQaReview) {
    return createFutureTimestamp(new Date().toISOString(), 4);
  }

  if (appointmentConfirmationStatus === "ready_to_dispatch") {
    return appointment?.scheduledAt ?? createFutureTimestamp(new Date().toISOString(), 12);
  }

  if (appointment?.status === "internally_confirmed" && appointmentConfirmationStatus === "prepared_for_delivery") {
    return createFutureTimestamp(new Date().toISOString(), 4);
  }

  if (appointment?.status === "internally_confirmed") {
    return createFutureTimestamp(new Date().toISOString(), 2);
  }

  if (appointment && appointmentConfirmationStatus === "approved") {
    return appointment.scheduledAt;
  }

  if (appointment) {
    return createFutureTimestamp(new Date().toISOString(), 6);
  }

  if (customerUpdates.some((customerUpdate) => customerUpdate.status === "ready_for_approval")) {
    return createFutureTimestamp(new Date().toISOString(), 6);
  }

  if (status === "customer_scheduling_ready" && schedulingInviteStatus === "approved") {
    return createFutureTimestamp(new Date().toISOString(), 12);
  }

  if (status === "customer_scheduling_ready") {
    return createFutureTimestamp(new Date().toISOString(), 24);
  }

  if (blockedTask || blockedMilestone) {
    return createFutureTimestamp(new Date().toISOString(), 8);
  }

  return createFutureTimestamp(new Date().toISOString(), 24);
}

function deriveCustomerUpdateStatusFromMilestone(status: HandoverMilestoneStatus): HandoverCustomerUpdateStatus {
  if (status === "ready") {
    return "ready_for_approval";
  }

  return "blocked";
}

function deriveHandoverClosureSummary(
  handoverCase: {
    handoverCaseId: string;
    status: HandoverCaseStatus;
    updatedAt: string;
  },
  review:
    | {
        outcome: string;
        updatedAt: string;
      }
    | undefined,
  postCompletionFollowUp:
    | {
        status: string;
        updatedAt: string;
      }
    | undefined,
  archiveReview:
    | {
        outcome: string;
        updatedAt: string;
      }
    | undefined,
  archiveStatus:
    | {
        status: string;
        updatedAt: string;
      }
    | undefined
): PersistedHandoverClosureSummary | null {
  if (handoverCase.status !== "completed") {
    return null;
  }

  const reviewOutcome = review ? toHandoverReviewOutcome(review.outcome) : null;
  const followUpStatus = postCompletionFollowUp ? toHandoverPostCompletionFollowUpStatus(postCompletionFollowUp.status) : null;
  const archiveReviewOutcome = archiveReview ? toHandoverArchiveOutcome(archiveReview.outcome) : null;
  const archiveBoundaryStatus = archiveStatus ? toHandoverArchiveStatus(archiveStatus.status) : null;
  const reviewUpdatedAt = review?.updatedAt ?? handoverCase.updatedAt;
  const archiveReviewUpdatedAt = archiveReview?.updatedAt ?? reviewUpdatedAt;
  const archiveStatusUpdatedAt = archiveStatus?.updatedAt ?? archiveReviewUpdatedAt;

  let status: HandoverClosureState = "closure_review_required";
  let updatedAt = handoverCase.updatedAt;

  if (!reviewOutcome) {
    status = "closure_review_required";
  } else if (reviewOutcome === "follow_up_required" && followUpStatus !== "resolved") {
    status = "aftercare_open";
    updatedAt = postCompletionFollowUp?.updatedAt ?? reviewUpdatedAt;
  } else if (archiveBoundaryStatus === "archived") {
    status = "archived";
    updatedAt = archiveStatusUpdatedAt;
  } else if (archiveBoundaryStatus === "ready") {
    status = "ready_to_archive";
    updatedAt = archiveStatusUpdatedAt;
  } else if (archiveBoundaryStatus === "held") {
    status = "held";
    updatedAt = archiveStatusUpdatedAt;
  } else if (archiveReviewOutcome === "ready_to_archive") {
    status = "ready_to_archive";
    updatedAt = archiveReviewUpdatedAt;
  } else if (archiveReviewOutcome === "hold_for_review") {
    status = "held";
    updatedAt = archiveReviewUpdatedAt;
  } else {
    status = "closure_review_required";
    updatedAt = reviewUpdatedAt;
  }

  return {
    handoverCaseId: handoverCase.handoverCaseId,
    status,
    updatedAt
  };
}

function hydrateHandoverTask(value: {
  createdAt: string;
  dueAt: string;
  ownerName: string;
  status: string;
  taskId: string;
  type: string;
  updatedAt: string;
}): PersistedHandoverTask {
  return {
    createdAt: value.createdAt,
    dueAt: value.dueAt,
    ownerName: value.ownerName,
    status: toHandoverTaskStatus(value.status),
    taskId: value.taskId,
    type: toHandoverTaskType(value.type),
    updatedAt: value.updatedAt
  };
}

function hydrateHandoverMilestone(value: {
  createdAt: string;
  milestoneId: string;
  ownerName: string;
  status: string;
  targetAt: string;
  type: string;
  updatedAt: string;
}): PersistedHandoverMilestone {
  return {
    createdAt: value.createdAt,
    milestoneId: value.milestoneId,
    ownerName: value.ownerName,
    status: toHandoverMilestoneStatus(value.status),
    targetAt: value.targetAt,
    type: toHandoverMilestoneType(value.type),
    updatedAt: value.updatedAt
  };
}

function hydrateHandoverAppointment(value: {
  appointmentId: string;
  coordinatorName: string;
  createdAt: string;
  location: string;
  scheduledAt: string;
  status: string;
  updatedAt: string;
}): PersistedHandoverAppointment {
  return {
    appointmentId: value.appointmentId,
    coordinatorName: value.coordinatorName,
    createdAt: value.createdAt,
    location: value.location,
    scheduledAt: value.scheduledAt,
    status: toHandoverAppointmentStatus(value.status),
    updatedAt: value.updatedAt
  };
}

function hydrateHandoverBlocker(value: {
  blockerId: string;
  createdAt: string;
  dueAt: string;
  ownerName: string;
  severity: string;
  status: string;
  summary: string;
  type: string;
  updatedAt: string;
}): PersistedHandoverBlocker {
  return {
    blockerId: value.blockerId,
    createdAt: value.createdAt,
    dueAt: value.dueAt,
    ownerName: value.ownerName,
    severity: toHandoverBlockerSeverity(value.severity),
    status: toHandoverBlockerStatus(value.status),
    summary: value.summary,
    type: toHandoverBlockerType(value.type),
    updatedAt: value.updatedAt
  };
}

function hydrateHandoverCustomerUpdate(value: {
  createdAt: string;
  customerUpdateId: string;
  deliveryPreparedAt: string | null;
  deliverySummary: string | null;
  dispatchReadyAt: string | null;
  qaPolicySignals: HandoverCustomerUpdateQaPolicySignal[] | null;
  qaReviewSampleSummary: string | null;
  qaReviewStatus: string;
  qaReviewSummary: string | null;
  qaReviewedAt: string | null;
  qaReviewerName: string | null;
  qaTriggerEvidence: string[] | null;
  status: string;
  type: string;
  updatedAt: string;
}): PersistedHandoverCustomerUpdate {
  return {
    createdAt: value.createdAt,
    customerUpdateId: value.customerUpdateId,
    deliveryPreparedAt: value.deliveryPreparedAt,
    deliverySummary: value.deliverySummary,
    dispatchReadyAt: value.dispatchReadyAt,
    qaPolicySignals: (value.qaPolicySignals ?? []).map((signal) => toHandoverCustomerUpdateQaPolicySignal(signal)),
    qaReviewSampleSummary: value.qaReviewSampleSummary,
    qaReviewStatus: toHandoverCustomerUpdateQaReviewStatus(value.qaReviewStatus),
    qaReviewSummary: value.qaReviewSummary,
    qaReviewedAt: value.qaReviewedAt,
    qaReviewerName: value.qaReviewerName,
    qaTriggerEvidence: value.qaTriggerEvidence ?? [],
    status: toHandoverCustomerUpdateStatus(value.status),
    type: toHandoverCustomerUpdateType(value.type),
    updatedAt: value.updatedAt
  };
}

function hydrateCurrentHandoverCustomerUpdateQaReview(value: {
  customerUpdateId: string;
  deliverySummary: string | null;
  handoverCaseId: string;
  policySignals: HandoverCustomerUpdateQaPolicySignal[] | null;
  reviewSampleSummary: string | null;
  reviewStatus: string;
  reviewSummary: string | null;
  reviewedAt: string | null;
  reviewerName: string | null;
  triggerEvidence: string[] | null;
  type: string;
  updatedAt: string;
}): PersistedCurrentHandoverCustomerUpdateQaReview {
  return {
    customerUpdateId: value.customerUpdateId,
    deliverySummary: value.deliverySummary,
    handoverCaseId: value.handoverCaseId,
    policySignals: (value.policySignals ?? []).map((signal) => toHandoverCustomerUpdateQaPolicySignal(signal)),
    reviewSampleSummary: value.reviewSampleSummary ?? "QA review required before dispatch.",
    reviewStatus: toHandoverCustomerUpdateQaReviewStatus(value.reviewStatus),
    reviewSummary: value.reviewSummary,
    reviewedAt: value.reviewedAt,
    reviewerName: value.reviewerName,
    triggerEvidence: value.triggerEvidence ?? [],
    type: toHandoverCustomerUpdateType(value.type),
    updatedAt: value.updatedAt
  };
}

function getCurrentHandoverCustomerUpdateQaPriority(status: HandoverCustomerUpdateQaReviewStatus) {
  if (status === "pending_review") {
    return 0;
  }

  if (status === "follow_up_required") {
    return 1;
  }

  if (status === "approved") {
    return 2;
  }

  return 3;
}

function hydrateHandoverReview(value: {
  createdAt: string;
  outcome: string;
  reviewId: string;
  summary: string;
  updatedAt: string;
}): PersistedHandoverReview {
  return {
    createdAt: value.createdAt,
    outcome: toHandoverReviewOutcome(value.outcome),
    reviewId: value.reviewId,
    summary: value.summary,
    updatedAt: value.updatedAt
  };
}

function hydrateHandoverPostCompletionFollowUp(value: {
  createdAt: string;
  dueAt: string;
  followUpId: string;
  ownerName: string;
  resolutionSummary: string | null;
  resolvedAt: string | null;
  status: string;
  summary: string;
  updatedAt: string;
}): PersistedHandoverPostCompletionFollowUp {
  return {
    createdAt: value.createdAt,
    dueAt: value.dueAt,
    followUpId: value.followUpId,
    ownerName: value.ownerName,
    resolutionSummary: value.resolutionSummary,
    resolvedAt: value.resolvedAt,
    status: toHandoverPostCompletionFollowUpStatus(value.status),
    summary: value.summary,
    updatedAt: value.updatedAt
  };
}

function hydrateHandoverArchiveReview(value: {
  createdAt: string;
  outcome: string;
  reviewId: string;
  summary: string;
  updatedAt: string;
}): PersistedHandoverArchiveReview {
  return {
    createdAt: value.createdAt,
    outcome: toHandoverArchiveOutcome(value.outcome),
    reviewId: value.reviewId,
    summary: value.summary,
    updatedAt: value.updatedAt
  };
}

function hydrateHandoverArchiveStatus(value: {
  createdAt: string;
  status: string;
  statusId: string;
  summary: string;
  updatedAt: string;
}): PersistedHandoverArchiveStatus {
  return {
    createdAt: value.createdAt,
    status: toHandoverArchiveStatus(value.status),
    statusId: value.statusId,
    summary: value.summary,
    updatedAt: value.updatedAt
  };
}

function hydrateLinkedHandoverCase(value: {
  createdAt: string;
  handoverCaseId: string;
  ownerName: string;
  status: string;
  updatedAt: string;
}): PersistedLinkedHandoverCase {
  return {
    createdAt: value.createdAt,
    handoverCaseId: value.handoverCaseId,
    ownerName: value.ownerName,
    status: toHandoverCaseStatus(value.status),
    updatedAt: value.updatedAt
  };
}

function hydrateCaseAgentMemory(value: {
  activeRiskFlags: string[] | null;
  documentGapSummary: string | null;
  lastDecisionSummary: string | null;
  lastInboundAt: string | null;
  lastObjectionSummary: string | null;
  lastSuccessfulOutboundAt: string | null;
  latestIntentSummary: string | null;
  qualificationSummary: string | null;
  updatedAt: string;
}): PersistedCaseAgentMemory {
  return {
    activeRiskFlags: value.activeRiskFlags ?? [],
    documentGapSummary: value.documentGapSummary,
    lastDecisionSummary: value.lastDecisionSummary,
    lastInboundAt: value.lastInboundAt,
    lastObjectionSummary: value.lastObjectionSummary,
    lastSuccessfulOutboundAt: value.lastSuccessfulOutboundAt,
    latestIntentSummary: value.latestIntentSummary,
    qualificationSummary: value.qualificationSummary,
    updatedAt: value.updatedAt
  };
}

function hydrateCaseAgentRun(value: {
  actionType: string | null;
  blockedReason: string | null;
  confidencePercent: number;
  createdAt: string;
  escalationReason: string | null;
  finishedAt: string;
  modelMode: string;
  proposedMessage: string | null;
  proposedNextAction: string | null;
  proposedNextActionDueAt: string | null;
  rationaleSummary: string;
  riskLevel: string;
  runId: string;
  startedAt: string;
  status: string;
  toolExecutionStatus: string | null;
  triggerType: string;
  updatedAt: string;
}): PersistedCaseAgentRun {
  return {
    actionType: value.actionType ? toCaseAgentActionType(value.actionType) : null,
    agentRunId: value.runId,
    blockedReason: value.blockedReason ? toCaseAgentBlockedReason(value.blockedReason) : null,
    confidence: Math.max(0, Math.min(1, value.confidencePercent / 100)),
    createdAt: value.createdAt,
    escalationReason: value.escalationReason,
    finishedAt: value.finishedAt,
    modelMode: value.modelMode,
    proposedMessage: value.proposedMessage,
    proposedNextAction: value.proposedNextAction,
    proposedNextActionDueAt: value.proposedNextActionDueAt,
    rationaleSummary: value.rationaleSummary,
    riskLevel: toCaseAgentRiskLevel(value.riskLevel),
    startedAt: value.startedAt,
    status: toCaseAgentRunStatus(value.status),
    toolExecutionStatus: value.toolExecutionStatus ? toCaseAgentToolExecutionStatus(value.toolExecutionStatus) : null,
    triggerType: toCaseAgentTriggerType(value.triggerType),
    updatedAt: value.updatedAt
  };
}

function buildPersistedCaseAgentState(
  latestRun: PersistedCaseAgentRun | null,
  nextWakeUpAt: string | null
): PersistedCaseAgentState | null {
  if (!latestRun) {
    return null;
  }

  return {
    latestBlockedReason: latestRun.blockedReason,
    latestDecisionSummary: latestRun.rationaleSummary,
    latestEscalationReason: latestRun.escalationReason,
    latestRecommendedAction: latestRun.actionType,
    latestRiskLevel: latestRun.riskLevel,
    latestRunAt: latestRun.finishedAt,
    latestRunStatus: latestRun.status,
    latestTriggerType: latestRun.triggerType,
    nextWakeUpAt
  };
}

function hydrateCaseChannelSummary(value: {
  channel: string;
  contactValue: string | null;
  lastInboundAt: string | null;
  latestOutboundBlockReason: string | null;
  latestOutboundFailureCode: string | null;
  latestOutboundFailureDetail: string | null;
  latestOutboundMessage: string | null;
  latestOutboundProviderMessageId: string | null;
  latestOutboundStatus: string;
  latestOutboundUpdatedAt: string | null;
  provider: string | null;
}): PersistedCaseChannelSummary {
  return {
    channel: toCaseContactChannel(value.channel),
    contactValue: value.contactValue,
    lastInboundAt: value.lastInboundAt,
    latestOutboundBlockReason: value.latestOutboundBlockReason ? toMessageDeliveryBlockReason(value.latestOutboundBlockReason) : null,
    latestOutboundFailureCode: value.latestOutboundFailureCode,
    latestOutboundFailureDetail: value.latestOutboundFailureDetail,
    latestOutboundMessage: value.latestOutboundMessage,
    latestOutboundProviderMessageId: value.latestOutboundProviderMessageId,
    latestOutboundStatus: toMessageDeliveryStatus(value.latestOutboundStatus),
    latestOutboundUpdatedAt: value.latestOutboundUpdatedAt,
    provider: value.provider ? toMessageProvider(value.provider) : null
  };
}

function hydrateVisitBooking(value: {
  confirmedAt: string | null;
  failureCode: string | null;
  failureDetail: string | null;
  provider: string | null;
  providerEventId: string | null;
  status: string;
  updatedAt: string | null;
}): PersistedVisitBooking {
  return {
    confirmedAt: value.confirmedAt,
    failureCode: value.failureCode,
    failureDetail: value.failureDetail,
    provider: value.provider ? toCalendarProvider(value.provider) : null,
    providerEventId: value.providerEventId,
    status: toVisitBookingStatus(value.status),
    updatedAt: value.updatedAt
  };
}

function hydrateManagerIntervention(value: {
  createdAt: string;
  interventionId: string;
  resolutionNote: string | null;
  resolvedAt: string | null;
  severity: string;
  status: string;
  summary: string;
  type: string;
}): PersistedManagerIntervention {
  return {
    createdAt: value.createdAt,
    interventionId: value.interventionId,
    resolutionNote: value.resolutionNote,
    resolvedAt: value.resolvedAt,
    severity: toManagerInterventionSeverity(value.severity),
    status: toManagerInterventionStatus(value.status),
    summary: value.summary,
    type: toManagerInterventionType(value.type)
  };
}

function hydrateCaseQaReview(value: {
  createdAt: string;
  draftMessage: string | null;
  policySignals: QaPolicySignal[] | null;
  qaReviewId: string;
  requestedByName: string;
  reviewSummary: string | null;
  reviewedAt: string | null;
  reviewerName: string | null;
  sampleSummary: string;
  status: string;
  subjectType: string;
  triggerEvidence: string[] | null;
  triggerSource: string;
  updatedAt: string;
}): PersistedCaseQaReview {
  return {
    createdAt: value.createdAt,
    draftMessage: value.draftMessage,
    policySignals: (value.policySignals ?? []).map((signal) => toCaseQaPolicySignal(signal)),
    qaReviewId: value.qaReviewId,
    requestedByName: value.requestedByName,
    reviewSummary: value.reviewSummary,
    reviewedAt: value.reviewedAt,
    reviewerName: value.reviewerName,
    sampleSummary: value.sampleSummary,
    status: toCaseQaReviewStatus(value.status),
    subjectType: toCaseQaReviewSubjectType(value.subjectType),
    triggerEvidence: value.triggerEvidence ?? [],
    triggerSource: toCaseQaReviewTriggerSource(value.triggerSource),
    updatedAt: value.updatedAt
  };
}

function hydrateLatestCaseReply(value: {
  caseId: string;
  createdAt: string;
  payload: Record<string, unknown>;
}): PersistedLatestCaseReply | null {
  const message = readPayloadString(value.payload, "message");
  const nextAction = readPayloadString(value.payload, "nextAction");
  const nextActionDueAt = readPayloadString(value.payload, "nextActionDueAt");
  const sentByName = readPayloadString(value.payload, "sentByName");

  if (!message || !nextAction || !nextActionDueAt || !sentByName) {
    return null;
  }

  return {
    approvedFromQa: typeof readPayloadString(value.payload, "approvedDraftQaReviewId") === "string",
    message,
    nextAction,
    nextActionDueAt: toIsoDateTimeString(nextActionDueAt),
    sentAt: toIsoDateTimeString(value.createdAt),
    sentByName
  };
}

function hydrateLatestManagerFollowUp(value: {
  caseId: string;
  createdAt: string;
  payload: Record<string, unknown>;
}): PersistedLatestManagerFollowUp | null {
  const bulkActionBatchId = readPayloadString(value.payload, "bulkActionBatchId");
  const bulkActionCaseCount = readPayloadInteger(value.payload, "bulkActionCaseCount");
  const bulkActionScopedOwnerName = readPayloadString(value.payload, "bulkActionScopedOwnerName");
  const nextAction = readPayloadString(value.payload, "nextAction");
  const nextActionDueAt = readPayloadString(value.payload, "nextActionDueAt");
  const ownerName = readPayloadString(value.payload, "ownerName");

  if (!nextAction || !nextActionDueAt || !ownerName) {
    return null;
  }

  return {
    bulkAction:
      bulkActionBatchId && bulkActionCaseCount !== null && bulkActionCaseCount >= 2 && bulkActionScopedOwnerName
        ? {
            batchId: bulkActionBatchId,
            caseCount: bulkActionCaseCount,
            scopedOwnerName: bulkActionScopedOwnerName
          }
        : undefined,
    nextAction,
    nextActionDueAt: toIsoDateTimeString(nextActionDueAt),
    ownerName,
    savedAt: toIsoDateTimeString(value.createdAt)
  };
}

function hydrateGovernanceEventRecord(value: {
  caseId: string;
  createdAt: string;
  customerName: string;
  eventType: string;
  payload: Record<string, unknown>;
}): PersistedGovernanceEventRecord | null {
  const payload = value.payload ?? {};

  if (value.eventType === "qa_review_requested" || value.eventType === "qa_review_policy_opened") {
    return {
      action: "opened",
      actorName: readPayloadString(payload, "requestedByName"),
      caseId: value.caseId,
      createdAt: value.createdAt,
      customerName: value.customerName,
      draftMessage: readPayloadString(payload, "draftMessage"),
      handoverCaseId: null,
      kind: "case_message",
      policySignals: readPayloadStringArray(payload, "policySignals").map((signal) => toGovernancePolicySignal(signal)),
      reviewSummary: null,
      sampleSummary: readPayloadString(payload, "sampleSummary"),
      status: "pending_review",
      subjectType: toGovernanceSubjectType(readPayloadString(payload, "subjectType") ?? "case_message"),
      triggerEvidence: readPayloadStringArray(payload, "triggerEvidence"),
      triggerSource: value.eventType === "qa_review_policy_opened" ? "policy_rule" : toCaseQaReviewTriggerSource(readPayloadString(payload, "triggerSource") ?? "manual_request")
    };
  }

  if (value.eventType === "qa_review_resolved") {
    return {
      action: "resolved",
      actorName: readPayloadString(payload, "reviewerName"),
      caseId: value.caseId,
      createdAt: value.createdAt,
      customerName: value.customerName,
      draftMessage: readPayloadString(payload, "draftMessage"),
      handoverCaseId: null,
      kind: "case_message",
      policySignals: [],
      reviewSummary: readPayloadString(payload, "reviewSummary"),
      sampleSummary: null,
      status: toGovernanceEventStatus(readPayloadString(payload, "status") ?? "follow_up_required"),
      subjectType: toGovernanceSubjectType(readPayloadString(payload, "subjectType") ?? "case_message"),
      triggerEvidence: [],
      triggerSource: null
    };
  }

  if (value.eventType === "handover_customer_update_qa_review_requested") {
    return {
      action: "opened",
      actorName: null,
      caseId: value.caseId,
      createdAt: value.createdAt,
      customerName: value.customerName,
      draftMessage: readPayloadString(payload, "deliverySummary"),
      handoverCaseId: readPayloadString(payload, "handoverCaseId"),
      kind: "handover_customer_update",
      policySignals: readPayloadStringArray(payload, "policySignals").map((signal) => toGovernancePolicySignal(signal)),
      reviewSummary: null,
      sampleSummary: readPayloadString(payload, "reviewSampleSummary"),
      status: "pending_review",
      subjectType: toGovernanceSubjectType(readPayloadString(payload, "type")),
      triggerEvidence: readPayloadStringArray(payload, "triggerEvidence"),
      triggerSource: "policy_rule"
    };
  }

  if (value.eventType === "handover_customer_update_qa_review_resolved") {
    return {
      action: "resolved",
      actorName: readPayloadString(payload, "reviewerName"),
      caseId: value.caseId,
      createdAt: value.createdAt,
      customerName: value.customerName,
      draftMessage: null,
      handoverCaseId: readPayloadString(payload, "handoverCaseId"),
      kind: "handover_customer_update",
      policySignals: [],
      reviewSummary: readPayloadString(payload, "reviewSummary"),
      sampleSummary: null,
      status: toGovernanceEventStatus(readPayloadString(payload, "status") ?? "follow_up_required"),
      subjectType: toGovernanceSubjectType(readPayloadString(payload, "type")),
      triggerEvidence: [],
      triggerSource: null
    };
  }

  return null;
}

function toGovernanceRecentEvent(
  value: PersistedGovernanceEventRecord
): PersistedGovernanceSummary["recentEvents"][number] {
  return {
    action: value.action,
    actorName: value.actorName,
    caseId: value.caseId,
    createdAt: value.createdAt,
    customerName: value.customerName,
    handoverCaseId: value.handoverCaseId,
    kind: value.kind,
    policySignals: value.policySignals,
    status: value.status,
    subjectType: value.subjectType,
    triggerSource: value.triggerSource
  };
}

function readPayloadString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

function readPayloadStringArray(payload: Record<string, unknown>, key: string) {
  const value = payload[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function readPayloadInteger(payload: Record<string, unknown>, key: string) {
  const value = payload[key];

  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function toAutomationStatus(value: string): AutomationStatus {
  if (value === "active" || value === "paused") {
    return value;
  }

  throw new Error(`unsupported_automation_status:${value}`);
}

function toCaseAgentActionType(value: string): CaseAgentActionType {
  if (
    value === "send_whatsapp_message" ||
    value === "save_follow_up_plan" ||
    value === "request_manager_intervention" ||
    value === "pause_automation" ||
    value === "request_document_follow_up" ||
    value === "create_reply_draft"
  ) {
    return value;
  }

  throw new Error(`unsupported_case_agent_action_type:${value}`);
}

function toCaseAgentBlockedReason(value: string): CaseAgentBlockedReason {
  if (
    value === "missing_phone" ||
    value === "automation_paused" ||
    value === "qa_hold" ||
    value === "client_credentials_pending" ||
    value === "model_provider_error" ||
    value === "invalid_model_output"
  ) {
    return value;
  }

  throw new Error(`unsupported_case_agent_blocked_reason:${value}`);
}

function toCaseAgentRiskLevel(value: string): CaseAgentRiskLevel {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  throw new Error(`unsupported_case_agent_risk_level:${value}`);
}

function toCaseAgentRunStatus(value: string): CaseAgentRunStatus {
  if (value === "completed" || value === "waiting" || value === "escalated" || value === "blocked" || value === "failed") {
    return value;
  }

  throw new Error(`unsupported_case_agent_run_status:${value}`);
}

function toCaseAgentToolExecutionStatus(value: string): CaseAgentToolExecutionStatus {
  if (value === "executed" || value === "queued" || value === "blocked" || value === "skipped" || value === "failed") {
    return value;
  }

  throw new Error(`unsupported_case_agent_tool_execution_status:${value}`);
}

function toCaseAgentTriggerType(value: string): CaseAgentTriggerType {
  if (value === "new_lead" || value === "no_response_follow_up" || value === "document_missing") {
    return value;
  }

  throw new Error(`unsupported_case_agent_trigger_type:${value}`);
}

function toCaseStage(value: string): CaseStage {
  if (value === "new" || value === "qualified" || value === "visit_scheduled" || value === "documents_in_progress" || value === "handover_initiated") {
    return value;
  }

  throw new Error(`unsupported_case_stage:${value}`);
}

function toCaseQaReviewStatus(value: string): CaseQaReviewStatus {
  if (value === "pending_review" || value === "approved" || value === "follow_up_required") {
    return value;
  }

  throw new Error(`unsupported_case_qa_review_status:${value}`);
}

function toCaseQaReviewTriggerSource(value: string): CaseQaReviewTriggerSource {
  if (value === "manual_request" || value === "policy_rule") {
    return value;
  }

  throw new Error(`unsupported_case_qa_review_trigger_source:${value}`);
}

function toCaseQaReviewSubjectType(value: string): CaseQaReviewSubjectType {
  if (value === "case_message" || value === "prepared_reply_draft") {
    return value;
  }

  throw new Error(`unsupported_case_qa_review_subject_type:${value}`);
}

function toCaseQaPolicySignal(value: string): CaseQaPolicySignal {
  if (
    value === "exception_request" ||
    value === "pricing_or_exception_promise" ||
    value === "guaranteed_outcome_promise" ||
    value === "frustrated_customer_language" ||
    value === "discrimination_risk" ||
    value === "legal_escalation_risk"
  ) {
    return value;
  }

  throw new Error(`unsupported_case_qa_policy_signal:${value}`);
}

function toGovernancePolicySignal(value: string): GovernancePolicySignal {
  try {
    return toCaseQaPolicySignal(value);
  } catch {
    return toHandoverCustomerUpdateQaPolicySignal(value);
  }
}

function toGovernanceEventStatus(value: string): GovernanceEventStatus {
  if (value === "pending_review" || value === "approved" || value === "follow_up_required") {
    return value;
  }

  throw new Error(`unsupported_governance_event_status:${value}`);
}

function toGovernanceSubjectType(value: string | null): GovernanceSubjectType | null {
  if (!value) {
    return null;
  }

  try {
    return toCaseQaReviewSubjectType(value);
  } catch {
    return toHandoverCustomerUpdateType(value);
  }
}

function toDocumentRequestStatus(value: string): DocumentRequestStatus {
  if (value === "requested" || value === "under_review" || value === "accepted" || value === "rejected") {
    return value;
  }

  throw new Error(`unsupported_document_request_status:${value}`);
}

function toDocumentRequestType(value: string): DocumentRequestType {
  if (value === "government_id" || value === "proof_of_funds" || value === "employment_letter") {
    return value;
  }

  throw new Error(`unsupported_document_request_type:${value}`);
}

function toIsoDateTimeString(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
}

function toFollowUpStatus(nextActionDueAt: string): FollowUpStatus {
  return new Date(nextActionDueAt).getTime() <= Date.now() ? "attention" : "on_track";
}

function toHandoverCaseStatus(value: string): HandoverCaseStatus {
  if (
    value === "pending_readiness" ||
    value === "internal_tasks_open" ||
    value === "customer_scheduling_ready" ||
    value === "scheduled" ||
    value === "in_progress" ||
    value === "completed"
  ) {
    return value;
  }

  throw new Error(`unsupported_handover_case_status:${value}`);
}

function toHandoverAppointmentStatus(value: string): HandoverAppointmentStatus {
  if (value === "planned" || value === "internally_confirmed") {
    return value;
  }

  throw new Error(`unsupported_handover_appointment_status:${value}`);
}

function toHandoverBlockerSeverity(value: string): HandoverBlockerSeverity {
  if (value === "warning" || value === "critical") {
    return value;
  }

  throw new Error(`unsupported_handover_blocker_severity:${value}`);
}

function toHandoverBlockerStatus(value: string): HandoverBlockerStatus {
  if (value === "open" || value === "in_progress" || value === "resolved") {
    return value;
  }

  throw new Error(`unsupported_handover_blocker_status:${value}`);
}

function toHandoverBlockerType(value: string): HandoverBlockerType {
  if (value === "unit_snag" || value === "access_blocker" || value === "document_gap") {
    return value;
  }

  throw new Error(`unsupported_handover_blocker_type:${value}`);
}

function toHandoverCustomerUpdateStatus(value: string): HandoverCustomerUpdateStatus {
  if (
    value === "blocked" ||
    value === "ready_for_approval" ||
    value === "approved" ||
    value === "prepared_for_delivery" ||
    value === "ready_to_dispatch"
  ) {
    return value;
  }

  throw new Error(`unsupported_handover_customer_update_status:${value}`);
}

function toHandoverCustomerUpdateQaPolicySignal(value: string): HandoverCustomerUpdateQaPolicySignal {
  if (
    value === "possession_date_promise" ||
    value === "pricing_or_exception_promise" ||
    value === "legal_claim_risk" ||
    value === "discrimination_risk"
  ) {
    return value;
  }

  throw new Error(`unsupported_handover_customer_update_qa_policy_signal:${value}`);
}

function toHandoverCustomerUpdateQaReviewStatus(value: string): HandoverCustomerUpdateQaReviewStatus {
  if (value === "not_required" || value === "pending_review" || value === "approved" || value === "follow_up_required") {
    return value;
  }

  throw new Error(`unsupported_handover_customer_update_qa_review_status:${value}`);
}

function toHandoverCustomerUpdateType(value: string): HandoverCustomerUpdateType {
  if (value === "readiness_update" || value === "scheduling_invite" || value === "appointment_confirmation") {
    return value;
  }

  throw new Error(`unsupported_handover_customer_update_type:${value}`);
}

function toHandoverMilestoneStatus(value: string): HandoverMilestoneStatus {
  if (value === "planned" || value === "blocked" || value === "ready") {
    return value;
  }

  throw new Error(`unsupported_handover_milestone_status:${value}`);
}

function toHandoverMilestoneType(value: string): HandoverMilestoneType {
  if (value === "readiness_gate" || value === "customer_scheduling_window" || value === "handover_appointment_hold") {
    return value;
  }

  throw new Error(`unsupported_handover_milestone_type:${value}`);
}

function toHandoverTaskStatus(value: string): HandoverTaskStatus {
  if (value === "open" || value === "blocked" || value === "complete") {
    return value;
  }

  throw new Error(`unsupported_handover_task_status:${value}`);
}

function toHandoverTaskType(value: string): HandoverTaskType {
  if (value === "unit_readiness_review" || value === "customer_document_pack" || value === "access_preparation") {
    return value;
  }

  throw new Error(`unsupported_handover_task_type:${value}`);
}

function toHandoverReviewOutcome(value: string) {
  if (value === "accepted" || value === "follow_up_required") {
    return value;
  }

  throw new Error(`unsupported_handover_review_outcome:${value}`);
}

function toHandoverArchiveOutcome(value: string): HandoverArchiveOutcome {
  if (value === "ready_to_archive" || value === "hold_for_review") {
    return value;
  }

  throw new Error(`unsupported_handover_archive_outcome:${value}`);
}

function toHandoverArchiveStatus(value: string): HandoverArchiveStatus {
  if (value === "ready" || value === "held" || value === "archived") {
    return value;
  }

  throw new Error(`unsupported_handover_archive_status:${value}`);
}

function toHandoverPostCompletionFollowUpStatus(value: string) {
  if (value === "open" || value === "resolved") {
    return value;
  }

  throw new Error(`unsupported_handover_post_completion_follow_up_status:${value}`);
}

function toLeadSource(value: string): "website" | "whatsapp" {
  if (value !== "website" && value !== "whatsapp") {
    throw new Error(`unsupported_lead_source:${value}`);
  }

  return value;
}

function toCaseContactChannel(value: string): CaseContactChannel {
  if (value === "website" || value === "whatsapp") {
    return value;
  }

  throw new Error(`unsupported_case_contact_channel:${value}`);
}

function toMessageProvider(value: string): MessageProvider {
  if (value === "meta_whatsapp_cloud") {
    return value;
  }

  throw new Error(`unsupported_message_provider:${value}`);
}

function toMessageDeliveryStatus(value: string): MessageDeliveryStatus {
  if (value === "not_started" || value === "blocked" || value === "queued" || value === "sending" || value === "sent" || value === "delivered" || value === "failed") {
    return value;
  }

  throw new Error(`unsupported_message_delivery_status:${value}`);
}

function toMessageDeliveryBlockReason(value: string): MessageDeliveryBlockReason {
  if (value === "missing_phone" || value === "qa_hold" || value === "automation_paused" || value === "client_credentials_pending") {
    return value;
  }

  throw new Error(`unsupported_message_delivery_block_reason:${value}`);
}

function toCalendarProvider(value: string): CalendarProvider {
  if (value === "google_calendar") {
    return value;
  }

  throw new Error(`unsupported_calendar_provider:${value}`);
}

function toVisitBookingStatus(value: string): VisitBookingStatus {
  if (value === "not_requested" || value === "pending" || value === "confirmed" || value === "blocked" || value === "failed") {
    return value;
  }

  throw new Error(`unsupported_visit_booking_status:${value}`);
}

function toManagerInterventionSeverity(value: string): ManagerInterventionSeverity {
  if (value === "warning" || value === "critical") {
    return value;
  }

  throw new Error(`unsupported_manager_intervention_severity:${value}`);
}

function toManagerInterventionStatus(value: string): ManagerInterventionStatus {
  if (value === "open" || value === "resolved") {
    return value;
  }

  throw new Error(`unsupported_manager_intervention_status:${value}`);
}

function toManagerInterventionType(value: string): ManagerInterventionType {
  if (value === "follow_up_overdue" || value === "agent_decision_required") {
    return value;
  }

  throw new Error(`unsupported_manager_intervention_type:${value}`);
}

function toQualificationReadiness(value: string): QualificationReadiness {
  if (value === "watch" || value === "medium" || value === "high") {
    return value;
  }

  throw new Error(`unsupported_qualification_readiness:${value}`);
}

function toSupportedLocale(value: string): SupportedLocale {
  if (value === "en" || value === "ar") {
    return value;
  }

  throw new Error(`unsupported_locale:${value}`);
}

function mapMilestoneTypeToCustomerUpdateType(type: HandoverMilestoneType): HandoverCustomerUpdateType {
  if (type === "readiness_gate") {
    return "readiness_update";
  }

  if (type === "customer_scheduling_window") {
    return "scheduling_invite";
  }

  return "appointment_confirmation";
}

export {
  buildHandoverCustomerUpdateQaSampleSummary,
  detectHandoverCustomerUpdateQaPolicyMatches,
  deriveCustomerUpdateStatusFromMilestone,
  deriveDocumentWorkflowNextAction,
  deriveHandoverCaseStatus,
  getHandoverCaseNextAction,
  getHandoverCaseNextActionDueAt
};
