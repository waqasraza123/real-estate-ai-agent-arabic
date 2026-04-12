import { randomUUID } from "node:crypto";

import { PGlite } from "@electric-sql/pglite";
import type {
  ApproveHandoverCustomerUpdateInput,
  AutomationStatus,
  CaseStage,
  ConfirmHandoverAppointmentInput,
  CreateHandoverIntakeInput,
  CreateHandoverBlockerInput,
  CreateWebsiteLeadInput,
  CreateWebsiteLeadResult,
  DocumentRequestStatus,
  DocumentRequestType,
  FollowUpStatus,
  HandoverAppointmentStatus,
  HandoverBlockerSeverity,
  HandoverBlockerStatus,
  HandoverBlockerType,
  HandoverCaseStatus,
  HandoverCustomerUpdateStatus,
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
  PersistedCaseDetail,
  PersistedCaseSummary,
  PersistedDocumentRequest,
  PersistedHandoverAppointment,
  PersistedHandoverBlocker,
  PersistedHandoverCaseDetail,
  PersistedHandoverCustomerUpdate,
  PersistedHandoverMilestone,
  PersistedHandoverTask,
  PersistedLinkedHandoverCase,
  PersistedManagerIntervention,
  PlanHandoverAppointmentInput,
  PrepareHandoverCustomerUpdateDeliveryInput,
  QualifyCaseInput,
  QualificationReadiness,
  ScheduleVisitInput,
  SupportedLocale,
  UpdateHandoverMilestoneInput,
  UpdateHandoverBlockerInput,
  UpdateHandoverTaskStatusInput
} from "@real-estate-ai/contracts";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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

const leads = pgTable("leads", {
  budget: text("budget"),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  id: uuid("id").primaryKey(),
  message: text("message").notNull(),
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
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
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

const automationJobs = pgTable("automation_jobs", {
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  id: uuid("id").primaryKey(),
  jobType: text("job_type").notNull(),
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
    }
  ): Promise<CreateWebsiteLeadResult>;
  getCaseDetail(caseId: string): Promise<PersistedCaseDetail | null>;
  getHandoverCaseDetail(handoverCaseId: string): Promise<PersistedHandoverCaseDetail | null>;
  listCases(): Promise<PersistedCaseSummary[]>;
  manageCaseFollowUp(caseId: string, input: ManageCaseFollowUpInput): Promise<PersistedCaseDetail | null>;
  createHandoverBlocker(
    handoverCaseId: string,
    input: CreateHandoverBlockerInput & {
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
      cases,
      documentRequests,
      handoverAppointments,
      handoverBlockers,
      handoverCases,
      handoverCustomerUpdates,
      handoverMilestones,
      handoverTasks,
      leads,
      managerInterventions,
      qualificationSnapshots,
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
      preferred_locale text not null,
      project_interest text not null,
      budget text,
      message text not null,
      created_at timestamptz not null default now()
    );

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
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

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
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table handover_customer_updates add column if not exists delivery_summary text;
    alter table handover_customer_updates add column if not exists delivery_prepared_at timestamptz;
    alter table handover_customer_updates add column if not exists dispatch_ready_at timestamptz;

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

    create table if not exists automation_jobs (
      id uuid primary key,
      case_id uuid not null references cases(id) on delete cascade,
      job_type text not null,
      run_after timestamptz not null,
      status text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists audit_events (
      id uuid primary key,
      case_id uuid not null references cases(id) on delete cascade,
      event_type text not null,
      payload jsonb not null,
      created_at timestamptz not null default now()
    );

    create index if not exists cases_created_at_idx on cases (created_at desc);
    create index if not exists visits_case_id_idx on visits (case_id, scheduled_at desc);
    create index if not exists document_requests_case_id_idx on document_requests (case_id, created_at asc);
    create index if not exists handover_tasks_case_id_idx on handover_tasks (handover_case_id, due_at asc);
    create index if not exists handover_blockers_case_id_idx on handover_blockers (handover_case_id, due_at asc);
    create index if not exists handover_milestones_case_id_idx on handover_milestones (handover_case_id, target_at asc);
    create index if not exists handover_customer_updates_case_id_idx on handover_customer_updates (handover_case_id, created_at asc);
    create index if not exists handover_appointments_case_id_idx on handover_appointments (handover_case_id, scheduled_at asc);
    create index if not exists audit_events_case_id_idx on audit_events (case_id, created_at asc);
    create index if not exists manager_interventions_case_id_idx on manager_interventions (case_id, created_at desc);
    create index if not exists manager_interventions_open_case_idx on manager_interventions (case_id, status);
    create index if not exists automation_jobs_due_idx on automation_jobs (status, run_after asc);
  `);

  type AlphaTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

  const getHandoverCaseDetail = async (handoverCaseId: string): Promise<PersistedHandoverCaseDetail | null> => {
    const handoverRecord = await db
      .select({
        caseId: handoverCases.caseId,
        createdAt: handoverCases.createdAt,
        customerName: leads.customerName,
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

    const [taskRecords, blockerRecords, milestoneRecords, customerUpdateRecords, appointmentRecords, eventRecords] = await Promise.all([
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
          createdAt: auditEvents.createdAt,
          eventType: auditEvents.eventType,
          payload: auditEvents.payload
        })
        .from(auditEvents)
        .where(eq(auditEvents.caseId, baseRecord.caseId))
        .orderBy(asc(auditEvents.createdAt))
    ]);

    return {
      auditEvents: eventRecords.map((event) => ({
        createdAt: event.createdAt,
        eventType: event.eventType,
        payload: event.payload
      })),
      appointment: appointmentRecords[0] ? hydrateHandoverAppointment(appointmentRecords[0]) : null,
      blockers: blockerRecords.map((blocker) => hydrateHandoverBlocker(blocker)),
      caseId: baseRecord.caseId,
      createdAt: baseRecord.createdAt,
      customerUpdates: customerUpdateRecords.map((customerUpdate) => hydrateHandoverCustomerUpdate(customerUpdate)),
      customerName: baseRecord.customerName,
      handoverCaseId: baseRecord.handoverCaseId,
      milestones: milestoneRecords.map((milestone) => hydrateHandoverMilestone(milestone)),
      ownerName: baseRecord.ownerName,
      preferredLocale: toSupportedLocale(baseRecord.preferredLocale),
      projectInterest: baseRecord.projectInterest,
      readinessSummary: baseRecord.readinessSummary,
      status: toHandoverCaseStatus(baseRecord.status),
      tasks: taskRecords.map((task) => hydrateHandoverTask(task)),
      updatedAt: baseRecord.updatedAt
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

    const [caseAuditEvents, qualificationRecord, currentVisit, persistedDocumentRequests, persistedInterventions, linkedHandoverCase] =
      await Promise.all([
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
            createdAt: handoverCases.createdAt,
            handoverCaseId: handoverCases.id,
            ownerName: handoverCases.ownerName,
            status: handoverCases.status,
            updatedAt: handoverCases.updatedAt
          })
          .from(handoverCases)
          .where(eq(handoverCases.caseId, caseId))
          .limit(1)
      ]);

    const hydratedInterventions = persistedInterventions.map((intervention) => hydrateManagerIntervention(intervention));

    return {
      auditEvents: caseAuditEvents.map((event) => ({
        createdAt: event.createdAt,
        eventType: event.eventType,
        payload: event.payload
      })),
      automationStatus: toAutomationStatus(caseRecord.automationStatus),
      budget: caseRecord.budget,
      caseId: caseRecord.caseId,
      createdAt: caseRecord.createdAt,
      currentVisit: currentVisit[0]
        ? {
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
      handoverCase: linkedHandoverCase[0] ? hydrateLinkedHandoverCase(linkedHandoverCase[0]) : null,
      managerInterventions: hydratedInterventions,
      message: caseRecord.message,
      nextAction: caseRecord.nextAction,
      nextActionDueAt: caseRecord.nextActionDueAt,
      openInterventionsCount: hydratedInterventions.filter((intervention) => intervention.status === "open").length,
      ownerName: caseRecord.ownerName,
      phone: caseRecord.phone,
      preferredLocale: toSupportedLocale(caseRecord.preferredLocale),
      projectInterest: caseRecord.projectInterest,
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
      updatedAt: caseRecord.updatedAt
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

    if (input.automationStatus === "paused") {
      return;
    }

    await transaction.insert(automationJobs).values({
      caseId: input.caseId,
      createdAt: input.updatedAt,
      id: randomUUID(),
      jobType: followUpWatchJobType,
      runAfter: input.runAfter,
      status: "queued",
      updatedAt: input.updatedAt
    });
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

      await db.transaction(async (transaction) => {
        await transaction.insert(leads).values({
          budget: input.budget,
          createdAt,
          customerName: input.customerName,
          email: input.email,
          id: createdLeadId,
          message: input.message,
          phone: input.phone,
          preferredLocale: input.preferredLocale,
          projectInterest: input.projectInterest,
          source: "website"
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
            source: "website"
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

        await syncFollowUpJob(transaction, {
          automationStatus: "active",
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

      return {
        automationStatus: toAutomationStatus(createdCase.automationStatus),
        caseId: createdCase.caseId,
        createdAt: createdCase.createdAt,
        customerName: createdCase.customerName,
        followUpStatus: toFollowUpStatus(createdCase.nextActionDueAt),
        leadId: createdCase.leadId,
        nextAction: createdCase.nextAction,
        nextActionDueAt: createdCase.nextActionDueAt,
        openInterventionsCount: 0,
        ownerName: createdCase.ownerName,
        preferredLocale: toSupportedLocale(createdCase.preferredLocale),
        projectInterest: createdCase.projectInterest,
        source: toLeadSource(createdCase.source),
        stage: toCaseStage(createdCase.stage),
        updatedAt: createdCase.updatedAt
      };
    },
    async getCaseDetail(caseId) {
      return getPersistedCaseDetail(caseId);
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

      const openInterventionCounts = await listOpenInterventionCounts(persistedCases.map((caseRecord) => caseRecord.caseId));

      return persistedCases.map((caseRecord) => ({
        automationStatus: toAutomationStatus(caseRecord.automationStatus),
        caseId: caseRecord.caseId,
        createdAt: caseRecord.createdAt,
        customerName: caseRecord.customerName,
        followUpStatus: toFollowUpStatus(caseRecord.nextActionDueAt),
        nextAction: caseRecord.nextAction,
        nextActionDueAt: caseRecord.nextActionDueAt,
        openInterventionsCount: openInterventionCounts.get(caseRecord.caseId) ?? 0,
        ownerName: caseRecord.ownerName,
        preferredLocale: toSupportedLocale(caseRecord.preferredLocale),
        projectInterest: caseRecord.projectInterest,
        source: toLeadSource(caseRecord.source),
        stage: toCaseStage(caseRecord.stage),
        updatedAt: caseRecord.updatedAt
      }));
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
          caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getPersistedCaseDetail(caseId);
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
      let openedInterventions = 0;
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
              ownerName: cases.ownerName,
              preferredLocale: leads.preferredLocale
            })
            .from(cases)
            .innerJoin(leads, eq(cases.leadId, leads.id))
            .where(eq(cases.id, job.caseId))
            .limit(1);

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
              openedIntervention: false
            };
          }

          if (toAutomationStatus(caseRecord.automationStatus) === "paused") {
            return {
              caseId: caseRecord.caseId,
              openedIntervention: false
            };
          }

          if (new Date(caseRecord.nextActionDueAt).getTime() > dueTimestamp) {
            return {
              caseId: caseRecord.caseId,
              openedIntervention: false
            };
          }

          const openIntervention = await transaction
            .select({
              interventionId: managerInterventions.id
            })
            .from(managerInterventions)
            .where(
              and(
                eq(managerInterventions.caseId, caseRecord.caseId),
                eq(managerInterventions.status, "open"),
                eq(managerInterventions.type, "follow_up_overdue")
              )
            )
            .limit(1);

          if (openIntervention[0]) {
            return {
              caseId: caseRecord.caseId,
              openedIntervention: false
            };
          }

          const overdueHours = Math.max(0, (dueTimestamp - new Date(caseRecord.nextActionDueAt).getTime()) / (60 * 60 * 1000));
          const severity = overdueHours >= 12 ? "critical" : "warning";

          await transaction.insert(managerInterventions).values({
            caseId: caseRecord.caseId,
            createdAt: input.runAt,
            id: randomUUID(),
            resolutionNote: null,
            resolvedAt: null,
            severity,
            status: "open",
            summary: buildFollowUpInterventionSummary(),
            type: "follow_up_overdue",
            updatedAt: input.runAt
          });

          await transaction.insert(auditEvents).values({
            caseId: caseRecord.caseId,
            createdAt: input.runAt,
            eventType: "follow_up_intervention_opened",
            id: randomUUID(),
            payload: {
              nextActionDueAt: caseRecord.nextActionDueAt,
              overdueHours: Number(overdueHours.toFixed(2)),
              ownerName: caseRecord.ownerName,
              preferredLocale: caseRecord.preferredLocale,
              severity
            }
          });

          return {
            caseId: caseRecord.caseId,
            openedIntervention: true
          };
        });

        touchedCaseIds.add(cycleOutcome.caseId);

        if (cycleOutcome.openedIntervention) {
          openedInterventions += 1;
        }
      }

      return {
        openedInterventions,
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
          caseId,
          runAfter: caseRecord.nextActionDueAt,
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

      await db.transaction(async (transaction) => {
        await transaction
          .update(handoverCustomerUpdates)
          .set({
            deliveryPreparedAt: updatedAt,
            deliverySummary: input.deliverySummary,
            dispatchReadyAt: null,
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
            status: input.status,
            type: customerUpdate.type
          }
        });

        await syncFollowUpJob(transaction, {
          automationStatus: caseRecord.automationStatus,
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
          caseId: handoverRecord.caseId,
          runAfter: input.nextActionDueAt,
          updatedAt
        });
      });

      return getHandoverCaseDetail(handoverCaseId);
    }
  };
}

function buildFollowUpInterventionSummary() {
  return "Manager follow-up is required because the next action is overdue.";
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
  blockers: PersistedHandoverBlocker[] = []
) {
  const schedulingInviteStatus = customerUpdates.find((customerUpdate) => customerUpdate.type === "scheduling_invite")?.status;
  const appointmentConfirmationStatus = customerUpdates.find((customerUpdate) => customerUpdate.type === "appointment_confirmation")?.status;
  const openBlockers = blockers.filter((blocker) => blocker.status !== "resolved");

  if (status === "scheduled" && openBlockers.length > 0) {
    return locale === "ar"
      ? "معالجة عوائق التنفيذ المفتوحة قبل المتابعة في يوم التسليم"
      : "Resolve the open execution blockers before advancing the handover day plan";
  }

  if (status === "scheduled" || appointmentConfirmationStatus === "ready_to_dispatch") {
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
  blockers: PersistedHandoverBlocker[] = []
) {
  const blockedTask = tasks.find((task) => task.status === "blocked");
  const blockedMilestone = milestones.find((milestone) => milestone.status === "blocked");
  const schedulingInviteStatus = customerUpdates.find((customerUpdate) => customerUpdate.type === "scheduling_invite")?.status;
  const appointmentConfirmationStatus = customerUpdates.find((customerUpdate) => customerUpdate.type === "appointment_confirmation")?.status;
  const openBlocker = blockers
    .filter((blocker) => blocker.status !== "resolved")
    .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime())[0];

  if (status === "scheduled" && openBlocker) {
    return openBlocker.dueAt;
  }

  if (status === "scheduled" || appointmentConfirmationStatus === "ready_to_dispatch") {
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
    status: toHandoverCustomerUpdateStatus(value.status),
    type: toHandoverCustomerUpdateType(value.type),
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

function toAutomationStatus(value: string): AutomationStatus {
  if (value === "active" || value === "paused") {
    return value;
  }

  throw new Error(`unsupported_automation_status:${value}`);
}

function toCaseStage(value: string): CaseStage {
  if (value === "new" || value === "qualified" || value === "visit_scheduled" || value === "documents_in_progress" || value === "handover_initiated") {
    return value;
  }

  throw new Error(`unsupported_case_stage:${value}`);
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

function toFollowUpStatus(nextActionDueAt: string): FollowUpStatus {
  return new Date(nextActionDueAt).getTime() <= Date.now() ? "attention" : "on_track";
}

function toHandoverCaseStatus(value: string): HandoverCaseStatus {
  if (value === "pending_readiness" || value === "internal_tasks_open" || value === "customer_scheduling_ready" || value === "scheduled") {
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

function toLeadSource(value: string): "website" {
  if (value !== "website") {
    throw new Error(`unsupported_lead_source:${value}`);
  }

  return value;
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
  if (value === "follow_up_overdue") {
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
  deriveCustomerUpdateStatusFromMilestone,
  deriveDocumentWorkflowNextAction,
  deriveHandoverCaseStatus,
  getHandoverCaseNextAction,
  getHandoverCaseNextActionDueAt
};
