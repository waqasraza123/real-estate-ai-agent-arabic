import { createAlphaLeadCaptureStore } from "@real-estate-ai/database";
import type { CaseAgentDecision } from "@real-estate-ai/contracts";
import { runPersistedCaseAgentCycle, runPersistedFollowUpCycle, type CaseAgentModelAdapter } from "@real-estate-ai/workflows";

import { createWorkerCaseAgentModelAdapter } from "./case-agent-model";

export interface CaseAgentEvalResult {
  passed: boolean;
  scenarioId: string;
  summary: string;
}

export async function runCaseAgentEvalScenarios(): Promise<CaseAgentEvalResult[]> {
  return Promise.all([
    evaluateScenario("deterministic_fallback_without_provider", async () => {
      const store = await createAlphaLeadCaptureStore({ inMemory: true });

      try {
        const createdCase = await store.createWebsiteLeadCase({
          customerName: "Maya Cole",
          email: "maya@example.com",
          message: "Need a callback about a premium unit this afternoon.",
          nextAction: "Call the buyer back immediately",
          nextActionDueAt: "2026-04-12T08:00:00.000Z",
          phone: "+1 555 200 1000",
          preferredLocale: "en",
          projectInterest: "Marina Crest"
        });

        const cycle = await runPersistedCaseAgentCycle(store, {
          canSendWhatsApp: true,
          modelAdapter: createWorkerCaseAgentModelAdapter({
            apiKey: undefined,
            baseUrl: "https://api.openai.com/v1",
            model: "gpt-5.4-mini",
            timeoutMs: 5000
          }),
          runAt: "2099-01-01T00:00:00.000Z"
        });
        const caseDetail = await store.getCaseDetail(createdCase.caseId);

        if (
          cycle.processedJobs !== 1 ||
          caseDetail?.agentRuns?.[0]?.modelMode !== "deterministic_v1" ||
          caseDetail.channelSummary?.latestOutboundStatus !== "queued"
        ) {
          throw new Error("deterministic_fallback_assertion_failed");
        }

        return "Falls back to deterministic mode and still queues the first WhatsApp reply.";
      } finally {
        await store.close();
      }
    }),
    evaluateScenario("provider_decision_low_risk_auto_send", async () => {
      const store = await createAlphaLeadCaptureStore({ inMemory: true });

      try {
        const createdCase = await store.createWebsiteLeadCase({
          customerName: "Alya Noor",
          email: "alya@example.com",
          message: "Please share next steps for a 2-bedroom unit.",
          nextAction: "Review the lead and continue qualification",
          nextActionDueAt: "2026-04-12T08:00:00.000Z",
          phone: "+966 50 123 4567",
          preferredLocale: "en",
          projectInterest: "Palm Horizon"
        });

        const cycle = await runPersistedCaseAgentCycle(store, {
          canSendWhatsApp: true,
          modelAdapter: createStaticModelAdapter("stub_eval_v1", (input) => ({
            actionType: "send_whatsapp_message",
            blockedReason: null,
            confidence: 0.95,
            escalationReason: null,
            proposedMessage: `Hi ${input.caseDetail.customerName}, we can continue the next step on WhatsApp.`,
            proposedNextAction: "Wait for the customer reply and continue qualification on WhatsApp",
            proposedNextActionDueAt: "2099-01-01T04:00:00.000Z",
            rationaleSummary: "Low-risk provider-backed first reply approved for auto-send.",
            riskLevel: "low",
            status: "completed",
            toolExecutionStatus: "queued",
            triggerType: input.triggerType
          })),
          runAt: "2099-01-01T00:00:00.000Z"
        });
        const caseDetail = await store.getCaseDetail(createdCase.caseId);

        if (
          cycle.processedJobs !== 1 ||
          caseDetail?.agentRuns?.[0]?.modelMode !== "stub_eval_v1" ||
          caseDetail.agentState?.latestRunStatus !== "completed" ||
          caseDetail.channelSummary?.latestOutboundStatus !== "queued"
        ) {
          throw new Error("provider_auto_send_assertion_failed");
        }

        return "Accepts a provider-backed low-risk decision and keeps the transport path queued.";
      } finally {
        await store.close();
      }
    }),
    evaluateScenario("guardrail_downgrades_low_confidence_send_to_draft", async () => {
      const store = await createAlphaLeadCaptureStore({ inMemory: true });

      try {
        const createdCase = await store.createWebsiteLeadCase({
          customerName: "Rana Saleh",
          email: "rana@example.com",
          message: "Tell me more about the available layouts.",
          nextAction: "Review the lead and continue qualification",
          nextActionDueAt: "2026-04-12T08:00:00.000Z",
          phone: "+966 50 777 2000",
          preferredLocale: "en",
          projectInterest: "Harbor Gate"
        });

        await runPersistedCaseAgentCycle(store, {
          canSendWhatsApp: true,
          modelAdapter: createStaticModelAdapter("stub_low_confidence_v1", (input) => ({
            actionType: "send_whatsapp_message",
            blockedReason: null,
            confidence: 0.72,
            escalationReason: null,
            proposedMessage: `Hi ${input.caseDetail.customerName}, I can share the next details here on WhatsApp.`,
            proposedNextAction: "Wait for the customer reply and continue qualification on WhatsApp",
            proposedNextActionDueAt: "2099-01-01T04:00:00.000Z",
            rationaleSummary: "The model is unsure, so this should require human review.",
            riskLevel: "medium",
            status: "completed",
            toolExecutionStatus: "queued",
            triggerType: input.triggerType
          })),
          runAt: "2099-01-01T00:00:00.000Z"
        });
        const caseDetail = await store.getCaseDetail(createdCase.caseId);

        if (
          caseDetail?.agentState?.latestRecommendedAction !== "create_reply_draft" ||
          caseDetail.agentState.latestRunStatus !== "waiting" ||
          caseDetail.agentRuns?.[0]?.proposedMessage === null
        ) {
          throw new Error("draft_guardrail_assertion_failed");
        }

        return "Downgrades medium-risk or low-confidence sends into human-visible drafts.";
      } finally {
        await store.close();
      }
    }),
    evaluateScenario("repeated_no_response_is_escalated_even_if_model_wants_send", async () => {
      const store = await createAlphaLeadCaptureStore({ inMemory: true });

      try {
        const createdCase = await store.createWebsiteLeadCase({
          customerName: "Noura Aziz",
          email: "noura@example.com",
          message: "Need details on the available layout.",
          nextAction: "Review the lead and continue qualification",
          nextActionDueAt: "2026-04-12T08:00:00.000Z",
          phone: "+966 50 123 7777",
          preferredLocale: "en",
          projectInterest: "Harbor Gate"
        });

        await runPersistedCaseAgentCycle(store, {
          canSendWhatsApp: true,
          runAt: "2026-04-12T08:05:00.000Z"
        });
        await store.manageCaseFollowUp(createdCase.caseId, {
          nextAction: "Check back if the customer stays silent",
          nextActionDueAt: "2026-04-12T09:00:00.000Z",
          ownerName: "Revenue Ops Queue"
        });
        await runPersistedFollowUpCycle(store, {
          limit: 10,
          runAt: "2026-04-12T12:00:00.000Z"
        });
        await runPersistedCaseAgentCycle(store, {
          canSendWhatsApp: true,
          runAt: "2026-04-12T12:00:00.000Z"
        });

        await store.manageCaseFollowUp(createdCase.caseId, {
          nextAction: "One more check-in before escalation",
          nextActionDueAt: "2026-04-12T13:00:00.000Z",
          ownerName: "Revenue Ops Queue"
        });
        await runPersistedFollowUpCycle(store, {
          limit: 10,
          runAt: "2026-04-12T16:00:00.000Z"
        });
        await runPersistedCaseAgentCycle(store, {
          canSendWhatsApp: true,
          modelAdapter: createStaticModelAdapter("stub_retry_v1", (input) => ({
            actionType: "send_whatsapp_message",
            blockedReason: null,
            confidence: 0.93,
            escalationReason: null,
            proposedMessage: `Hi ${input.caseDetail.customerName}, following up again on ${input.caseDetail.projectInterest}.`,
            proposedNextAction: "Wait for the next reply or escalate if the customer stays silent",
            proposedNextActionDueAt: "2026-04-13T16:00:00.000Z",
            rationaleSummary: "The model would like to try one more follow-up.",
            riskLevel: "low",
            status: "completed",
            toolExecutionStatus: "queued",
            triggerType: input.triggerType
          })),
          runAt: "2026-04-12T16:00:00.000Z"
        });
        const caseDetail = await store.getCaseDetail(createdCase.caseId);

        if (
          caseDetail?.agentState?.latestRunStatus !== "escalated" ||
          caseDetail.agentState.latestRecommendedAction !== "request_manager_intervention"
        ) {
          throw new Error("repeat_follow_up_guardrail_assertion_failed");
        }

        return "Escalates repeated no-response cases even when the model proposes another send.";
      } finally {
        await store.close();
      }
    }),
    evaluateScenario("adapter_failure_falls_back_to_deterministic", async () => {
      const store = await createAlphaLeadCaptureStore({ inMemory: true });

      try {
        const createdCase = await store.createWebsiteLeadCase({
          customerName: "Sami Khan",
          email: "sami@example.com",
          message: "I can send the remaining paperwork after the visit.",
          nextAction: "Track the lead after the visit",
          nextActionDueAt: "2026-04-12T08:00:00.000Z",
          phone: "+966 54 000 9898",
          preferredLocale: "en",
          projectInterest: "Palm Horizon"
        });

        await runPersistedCaseAgentCycle(store, {
          canSendWhatsApp: true,
          modelAdapter: {
            modelMode: "failing_eval_v1",
            async generateDecision() {
              throw new Error("provider_failed");
            }
          },
          runAt: "2099-01-01T00:00:00.000Z"
        });
        const caseDetail = await store.getCaseDetail(createdCase.caseId);

        if (
          caseDetail?.agentRuns?.[0]?.modelMode !== "failing_eval_v1_fallback" ||
          caseDetail.agentState?.latestRunStatus !== "completed"
        ) {
          throw new Error("adapter_failure_fallback_assertion_failed");
        }

        return "Falls back to deterministic policy when the provider adapter throws.";
      } finally {
        await store.close();
      }
    }),
    evaluateScenario("hard_block_prevents_model_execution", async () => {
      const store = await createAlphaLeadCaptureStore({ inMemory: true });
      let callCount = 0;

      try {
        const createdCase = await store.createWebsiteLeadCase({
          customerName: "Layal Abbas",
          email: "layal@example.com",
          message: "Need a bilingual callback later today.",
          nextAction: "Prepare first bilingual reply",
          nextActionDueAt: "2026-04-12T08:00:00.000Z",
          phone: "+966 55 555 1111",
          preferredLocale: "ar",
          projectInterest: "Palm Horizon"
        });

        await runPersistedCaseAgentCycle(store, {
          canSendWhatsApp: false,
          modelAdapter: {
            modelMode: "counting_eval_v1",
            async generateDecision() {
              callCount += 1;
              throw new Error("should_not_run");
            }
          },
          runAt: "2099-01-01T00:00:00.000Z"
        });
        const caseDetail = await store.getCaseDetail(createdCase.caseId);

        if (callCount !== 0 || caseDetail?.agentState?.latestRunStatus !== "blocked") {
          throw new Error("hard_block_short_circuit_assertion_failed");
        }

        return "Short-circuits the model path when provider credentials are still blocked.";
      } finally {
        await store.close();
      }
    })
  ]);
}

function createStaticModelAdapter(
  modelMode: string,
  decide: (input: Parameters<CaseAgentModelAdapter["generateDecision"]>[0]) => CaseAgentDecision
): CaseAgentModelAdapter {
  return {
    modelMode,
    async generateDecision(input) {
      return decide(input);
    }
  };
}

async function evaluateScenario(scenarioId: string, run: () => Promise<string>): Promise<CaseAgentEvalResult> {
  try {
    return {
      passed: true,
      scenarioId,
      summary: await run()
    };
  } catch (error) {
    return {
      passed: false,
      scenarioId,
      summary: error instanceof Error ? error.message : "unknown_case_agent_eval_failure"
    };
  }
}
