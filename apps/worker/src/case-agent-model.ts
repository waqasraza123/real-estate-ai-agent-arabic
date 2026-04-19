import {
  caseAgentDecisionSchema,
  type CaseAgentActionType,
  type CaseAgentBlockedReason,
  type CaseAgentDecision,
  type CaseAgentRiskLevel,
  type CaseAgentRunStatus,
  type CaseAgentToolExecutionStatus,
  type CaseAgentTriggerType
} from "@real-estate-ai/contracts";
import { createDeterministicCaseAgentModelAdapter, type CaseAgentModelAdapter, type CaseAgentModelInput } from "@real-estate-ai/workflows";

const caseAgentActionTypes = [
  "send_whatsapp_message",
  "save_follow_up_plan",
  "request_manager_intervention",
  "pause_automation",
  "request_document_follow_up",
  "create_reply_draft"
] satisfies CaseAgentActionType[];

const caseAgentBlockedReasons = [
  "missing_phone",
  "automation_paused",
  "qa_hold",
  "client_credentials_pending",
  "model_provider_error",
  "invalid_model_output"
] satisfies CaseAgentBlockedReason[];

const caseAgentRiskLevels = ["low", "medium", "high"] satisfies CaseAgentRiskLevel[];
const caseAgentRunStatuses = ["completed", "waiting", "escalated", "blocked", "failed"] satisfies CaseAgentRunStatus[];
const caseAgentToolExecutionStatuses = ["executed", "queued", "blocked", "skipped", "failed"] satisfies CaseAgentToolExecutionStatus[];
const caseAgentTriggerTypes = [
  "new_lead",
  "no_response_follow_up",
  "document_missing",
  "inbound_customer_message"
] satisfies CaseAgentTriggerType[];
const defaultOpenAiBaseUrl = "https://api.openai.com/v1";

interface OpenAiResponsesEnvelope {
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
    type?: string;
  }>;
  output_text?: string;
}

export interface WorkerOpenAiCaseAgentConfiguration {
  apiKey: string | undefined;
  baseUrl: string;
  fetchImplementation?: typeof fetch;
  model: string | undefined;
  timeoutMs: number;
}

export function createWorkerCaseAgentModelAdapter(
  input: WorkerOpenAiCaseAgentConfiguration
): CaseAgentModelAdapter {
  if (!input.apiKey || !input.model) {
    return createDeterministicCaseAgentModelAdapter();
  }

  return createOpenAiCaseAgentModelAdapter({
    apiKey: input.apiKey,
    baseUrl: input.baseUrl,
    fetchImplementation: input.fetchImplementation ?? fetch,
    model: input.model,
    timeoutMs: input.timeoutMs
  });
}

export function createOpenAiCaseAgentModelAdapter(input: {
  apiKey: string;
  baseUrl?: string;
  fetchImplementation?: typeof fetch;
  model: string;
  timeoutMs?: number;
}): CaseAgentModelAdapter {
  const requestFetch = input.fetchImplementation ?? fetch;
  const baseUrl = input.baseUrl ?? defaultOpenAiBaseUrl;
  const timeoutMs = input.timeoutMs ?? 15000;

  return {
    modelMode: "openai_responses_v1",
    async generateDecision(modelInput) {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await requestFetch(`${baseUrl}/responses`, {
          body: JSON.stringify({
            input: [
              {
                content: [
                  {
                    text:
                      "You are the case agent for a bilingual real-estate operating system. Return one structured decision only. Use the supplied conversation intelligence and case memory, respect hard business boundaries, never invent facts, never promise discounts, legal guarantees, approvals, or outcomes, and keep WhatsApp copy concise and human.",
                    type: "input_text"
                  }
                ],
                role: "system"
              },
              {
                content: [
                  {
                    text: JSON.stringify(buildOpenAiCaseAgentPromptInput(modelInput)),
                    type: "input_text"
                  }
                ],
                role: "user"
              }
            ],
            model: input.model,
            text: {
              format: {
                name: "case_agent_decision",
                schema: buildCaseAgentDecisionJsonSchema(),
                strict: true,
                type: "json_schema"
              }
            }
          }),
          headers: {
            Authorization: `Bearer ${input.apiKey}`,
            "Content-Type": "application/json"
          },
          method: "POST",
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`openai_responses_http_${response.status}`);
        }

        const payload = (await response.json()) as OpenAiResponsesEnvelope;
        const outputText = readOpenAiOutputText(payload);

        if (!outputText) {
          throw new Error("openai_responses_missing_output");
        }

        return caseAgentDecisionSchema.parse(JSON.parse(outputText) as CaseAgentDecision);
      } finally {
        clearTimeout(timeoutHandle);
      }
    }
  };
}

function buildOpenAiCaseAgentPromptInput(input: CaseAgentModelInput) {
  const latestInboundMessage = [...input.caseDetail.auditEvents]
    .reverse()
    .find((event) => event.eventType === "whatsapp_inbound_received")?.payload?.textBody;
  const responseLocale =
    typeof latestInboundMessage === "string" && /[\u0600-\u06FF]/.test(latestInboundMessage)
      ? "ar"
      : input.caseDetail.preferredLocale;
  const latestRun = input.caseDetail.agentRuns?.[0] ?? null;
  const openDocumentItems = input.caseDetail.documentRequests
    .filter((documentRequest) => documentRequest.status !== "accepted")
    .map((documentRequest) => ({
      status: documentRequest.status,
      type: documentRequest.type
    }));

  return {
    allowedActions: input.allowedActions,
    case: {
      agentMemory: input.caseDetail.agentMemory ?? null,
      automationHoldReason: input.caseDetail.automationHoldReason,
      automationStatus: input.caseDetail.automationStatus,
      channelSummary: input.caseDetail.channelSummary,
      currentQaReview: input.caseDetail.currentQaReview,
      currentStage: input.caseDetail.stage,
      customerName: input.caseDetail.customerName,
      documentGapSummary: input.documentGapSummary,
      email: input.caseDetail.email,
      latestHumanReply: input.caseDetail.latestHumanReply ?? null,
      latestInboundMessage: typeof latestInboundMessage === "string" ? latestInboundMessage : null,
      latestRun,
      message: input.caseDetail.message,
      nextAction: input.caseDetail.nextAction,
      nextActionDueAt: input.caseDetail.nextActionDueAt,
      openDocumentItems,
      openInterventionsCount: input.caseDetail.openInterventionsCount,
      phone: input.caseDetail.phone,
      preferredLocale: input.caseDetail.preferredLocale,
      projectInterest: input.caseDetail.projectInterest,
      qualificationSnapshot: input.caseDetail.qualificationSnapshot ?? null,
      responseLocale,
      source: input.caseDetail.source,
      visit: input.caseDetail.currentVisit ?? null
    },
    conversationIntelligence: input.conversationIntelligence,
    constraints: {
      autoSendAllowedOnlyForLowRisk: true,
      messageMustMatchPreferredLocale: true,
      missingMessageIsInvalidForSendOrDraft: true,
      oneCustomerFacingActionPerRun: true
    },
    now: input.now,
    repeatedTriggerCount: input.repeatedTriggerCount,
    riskFlags: input.riskFlags,
    triggerType: input.triggerType
  };
}

function buildCaseAgentDecisionJsonSchema() {
  return {
    additionalProperties: false,
    properties: {
      actionType: {
        enum: caseAgentActionTypes,
        type: "string"
      },
      blockedReason: {
        anyOf: [
          {
            enum: caseAgentBlockedReasons,
            type: "string"
          },
          {
            type: "null"
          }
        ]
      },
      confidence: {
        maximum: 1,
        minimum: 0,
        type: "number"
      },
      escalationReason: {
        anyOf: [
          {
            type: "string"
          },
          {
            type: "null"
          }
        ]
      },
      proposedMessage: {
        anyOf: [
          {
            maxLength: 2000,
            minLength: 10,
            type: "string"
          },
          {
            type: "null"
          }
        ]
      },
      proposedNextAction: {
        maxLength: 200,
        minLength: 4,
        type: "string"
      },
      proposedNextActionDueAt: {
        format: "date-time",
        type: "string"
      },
      rationaleSummary: {
        maxLength: 500,
        minLength: 10,
        type: "string"
      },
      riskLevel: {
        enum: caseAgentRiskLevels,
        type: "string"
      },
      status: {
        enum: caseAgentRunStatuses,
        type: "string"
      },
      toolExecutionStatus: {
        anyOf: [
          {
            enum: caseAgentToolExecutionStatuses,
            type: "string"
          },
          {
            type: "null"
          }
        ]
      },
      triggerType: {
        enum: caseAgentTriggerTypes,
        type: "string"
      }
    },
    required: [
      "actionType",
      "blockedReason",
      "confidence",
      "escalationReason",
      "proposedMessage",
      "proposedNextAction",
      "proposedNextActionDueAt",
      "rationaleSummary",
      "riskLevel",
      "status",
      "toolExecutionStatus",
      "triggerType"
    ],
    type: "object"
  };
}

function readOpenAiOutputText(payload: OpenAiResponsesEnvelope) {
  if (typeof payload.output_text === "string" && payload.output_text.trim().length > 0) {
    return payload.output_text;
  }

  for (const outputItem of payload.output ?? []) {
    for (const contentItem of outputItem.content ?? []) {
      if (typeof contentItem.text === "string" && contentItem.text.trim().length > 0) {
        return contentItem.text;
      }
    }
  }

  return null;
}
