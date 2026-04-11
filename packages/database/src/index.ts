import { randomUUID } from "node:crypto";

import { PGlite } from "@electric-sql/pglite";
import type { CreateWebsiteLeadInput, CreateWebsiteLeadResult, PersistedCaseDetail, PersistedCaseSummary } from "@real-estate-ai/contracts";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

const leads = pgTable("leads", {
  budget: text("budget"),
  createdAt: timestamp("created_at", {
    mode: "string",
    withTimezone: true
  }).defaultNow().notNull(),
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
  createdAt: timestamp("created_at", {
    mode: "string",
    withTimezone: true
  }).defaultNow().notNull(),
  currentNextAction: text("current_next_action").notNull(),
  id: uuid("id").primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, {
      onDelete: "cascade"
    }),
  ownerName: text("owner_name"),
  stage: text("stage").notNull(),
  updatedAt: timestamp("updated_at", {
    mode: "string",
    withTimezone: true
  }).defaultNow().notNull()
});

const auditEvents = pgTable("audit_events", {
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, {
      onDelete: "cascade"
    }),
  createdAt: timestamp("created_at", {
    mode: "string",
    withTimezone: true
  }).defaultNow().notNull(),
  eventType: text("event_type").notNull(),
  id: uuid("id").primaryKey(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull()
});

export interface LeadCaptureStore {
  close(): Promise<void>;
  createWebsiteLeadCase(input: CreateWebsiteLeadInput & {
    nextAction: string;
  }): Promise<CreateWebsiteLeadResult>;
  getCaseDetail(caseId: string): Promise<PersistedCaseDetail | null>;
  listCases(): Promise<PersistedCaseSummary[]>;
}

export async function createAlphaLeadCaptureStore(options?: {
  dataPath?: string;
  inMemory?: boolean;
}): Promise<LeadCaptureStore> {
  const client = options?.inMemory ? new PGlite() : new PGlite(options?.dataPath ?? ".data/phase2-alpha");
  const db = drizzle(client, {
    schema: {
      auditEvents,
      cases,
      leads
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
      owner_name text,
      current_next_action text not null,
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
    create index if not exists audit_events_case_id_idx on audit_events (case_id, created_at asc);
  `);

  return {
    async close() {
      await client.close();
    },
    async createWebsiteLeadCase(input) {
      const createdLeadId = randomUUID();
      const createdCaseId = randomUUID();
      const createdAuditEventId = randomUUID();

      await db.transaction(async (transaction) => {
        await transaction.insert(leads).values({
          budget: input.budget,
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
          currentNextAction: input.nextAction,
          id: createdCaseId,
          leadId: createdLeadId,
          ownerName: null,
          stage: "new"
        });

        await transaction.insert(auditEvents).values({
          caseId: createdCaseId,
          eventType: "website_lead_received",
          id: createdAuditEventId,
          payload: {
            customerName: input.customerName,
            preferredLocale: input.preferredLocale,
            projectInterest: input.projectInterest,
            source: "website"
          }
        });
      });

      const persistedCase = await db
        .select({
          caseId: cases.id,
          createdAt: cases.createdAt,
          customerName: leads.customerName,
          leadId: leads.id,
          nextAction: cases.currentNextAction,
          preferredLocale: leads.preferredLocale,
          projectInterest: leads.projectInterest,
          source: leads.source,
          stage: cases.stage
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
        caseId: createdCase.caseId,
        createdAt: createdCase.createdAt,
        customerName: createdCase.customerName,
        leadId: createdCase.leadId,
        nextAction: createdCase.nextAction,
        preferredLocale: toSupportedLocale(createdCase.preferredLocale),
        projectInterest: createdCase.projectInterest,
        source: toLeadSource(createdCase.source),
        stage: toCaseStage(createdCase.stage)
      };
    },
    async getCaseDetail(caseId) {
      const persistedCase = await db
        .select({
          budget: leads.budget,
          caseId: cases.id,
          createdAt: cases.createdAt,
          customerName: leads.customerName,
          email: leads.email,
          message: leads.message,
          nextAction: cases.currentNextAction,
          phone: leads.phone,
          preferredLocale: leads.preferredLocale,
          projectInterest: leads.projectInterest,
          source: leads.source,
          stage: cases.stage
        })
        .from(cases)
        .innerJoin(leads, eq(cases.leadId, leads.id))
        .where(eq(cases.id, caseId))
        .limit(1);

      const caseRecord = persistedCase[0];

      if (!caseRecord) {
        return null;
      }

      const caseAuditEvents = await db
        .select({
          createdAt: auditEvents.createdAt,
          eventType: auditEvents.eventType,
          payload: auditEvents.payload
        })
        .from(auditEvents)
        .where(eq(auditEvents.caseId, caseId))
        .orderBy(auditEvents.createdAt);

      return {
        auditEvents: caseAuditEvents.map((event) => ({
          createdAt: event.createdAt,
          eventType: event.eventType,
          payload: event.payload
        })),
        budget: caseRecord.budget,
        caseId: caseRecord.caseId,
        createdAt: caseRecord.createdAt,
        customerName: caseRecord.customerName,
        email: caseRecord.email,
        message: caseRecord.message,
        nextAction: caseRecord.nextAction,
        phone: caseRecord.phone,
        preferredLocale: toSupportedLocale(caseRecord.preferredLocale),
        projectInterest: caseRecord.projectInterest,
        source: toLeadSource(caseRecord.source),
        stage: toCaseStage(caseRecord.stage)
      };
    },
    async listCases() {
      const persistedCases = await db
        .select({
          caseId: cases.id,
          createdAt: cases.createdAt,
          customerName: leads.customerName,
          nextAction: cases.currentNextAction,
          preferredLocale: leads.preferredLocale,
          projectInterest: leads.projectInterest,
          source: leads.source,
          stage: cases.stage
        })
        .from(cases)
        .innerJoin(leads, eq(cases.leadId, leads.id))
        .orderBy(desc(cases.createdAt));

      return persistedCases.map((caseRecord) => ({
        caseId: caseRecord.caseId,
        createdAt: caseRecord.createdAt,
        customerName: caseRecord.customerName,
        nextAction: caseRecord.nextAction,
        preferredLocale: toSupportedLocale(caseRecord.preferredLocale),
        projectInterest: caseRecord.projectInterest,
        source: toLeadSource(caseRecord.source),
        stage: toCaseStage(caseRecord.stage)
      }));
    }
  };
}

function toCaseStage(value: string): "new" {
  if (value !== "new") {
    throw new Error(`unsupported_case_stage:${value}`);
  }

  return value;
}

function toLeadSource(value: string): "website" {
  if (value !== "website") {
    throw new Error(`unsupported_lead_source:${value}`);
  }

  return value;
}

function toSupportedLocale(value: string): "en" | "ar" {
  if (value !== "en" && value !== "ar") {
    throw new Error(`unsupported_locale:${value}`);
  }

  return value;
}
