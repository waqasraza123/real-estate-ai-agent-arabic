import { z } from "zod";

export const supportedLocaleSchema = z.enum(["en", "ar"]);
export const leadSourceSchema = z.enum(["website"]);
export const caseStageSchema = z.enum(["new"]);

export const createWebsiteLeadInputSchema = z.object({
  budget: z.string().trim().min(2).max(120).optional(),
  customerName: z.string().trim().min(2).max(120),
  email: z.email(),
  message: z.string().trim().min(10).max(2000),
  phone: z.string().trim().min(7).max(40).optional(),
  preferredLocale: supportedLocaleSchema,
  projectInterest: z.string().trim().min(2).max(160)
});

export const persistedCaseSummarySchema = z.object({
  caseId: z.uuid(),
  createdAt: z.iso.datetime(),
  customerName: z.string(),
  nextAction: z.string(),
  preferredLocale: supportedLocaleSchema,
  projectInterest: z.string(),
  source: leadSourceSchema,
  stage: caseStageSchema
});

export const persistedAuditEventSchema = z.object({
  createdAt: z.iso.datetime(),
  eventType: z.string(),
  payload: z.record(z.string(), z.unknown())
});

export const persistedCaseDetailSchema = persistedCaseSummarySchema.extend({
  auditEvents: z.array(persistedAuditEventSchema),
  budget: z.string().nullable(),
  email: z.email(),
  message: z.string(),
  phone: z.string().nullable()
});

export const createWebsiteLeadResultSchema = persistedCaseSummarySchema.extend({
  leadId: z.uuid()
});

export type CreateWebsiteLeadInput = z.infer<typeof createWebsiteLeadInputSchema>;
export type CreateWebsiteLeadResult = z.infer<typeof createWebsiteLeadResultSchema>;
export type PersistedCaseDetail = z.infer<typeof persistedCaseDetailSchema>;
export type PersistedCaseSummary = z.infer<typeof persistedCaseSummarySchema>;
