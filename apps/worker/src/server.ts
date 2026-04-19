import { createAlphaLeadCaptureStore } from "@real-estate-ai/database";
import { createMetaWhatsAppClient, type WhatsAppClient } from "@real-estate-ai/integrations";
import { runPersistedCaseAgentCycle, runPersistedFollowUpCycle } from "@real-estate-ai/workflows";

import { createWorkerCaseAgentModelAdapter } from "./case-agent-model";
import { parseWorkerEnvironment } from "./env";

const whatsappAgentReplyJobType = "whatsapp_agent_reply";
const whatsappCaseReplyJobType = "whatsapp_case_reply";
const whatsappInitialReplyJobType = "whatsapp_initial_reply";
const whatsappInitialReplyMaxAttempts = 3;
const retryDelayMs = 5 * 60 * 1000;

const environment = parseWorkerEnvironment(process.env);
const store = await createAlphaLeadCaptureStore({
  dataPath: environment.WORKER_DATABASE_PATH
});
const whatsappClient: WhatsAppClient | null =
  environment.WORKER_META_WHATSAPP_ACCESS_TOKEN && environment.WORKER_META_WHATSAPP_PHONE_NUMBER_ID
    ? createMetaWhatsAppClient(fetch, {
        accessToken: environment.WORKER_META_WHATSAPP_ACCESS_TOKEN,
        apiVersion: environment.WORKER_META_WHATSAPP_API_VERSION,
        phoneNumberId: environment.WORKER_META_WHATSAPP_PHONE_NUMBER_ID
      })
    : null;
const caseAgentModelAdapter = createWorkerCaseAgentModelAdapter({
  apiKey: environment.WORKER_AGENT_OPENAI_API_KEY,
  baseUrl: environment.WORKER_AGENT_OPENAI_BASE_URL,
  fetchImplementation: fetch,
  model: environment.WORKER_AGENT_OPENAI_MODEL,
  timeoutMs: environment.WORKER_AGENT_OPENAI_TIMEOUT_MS
});

async function runWhatsAppOutboundCycle(input: {
  jobType: string;
  limit: number;
  runAt: string;
}) {
  const dueJobs = await store.getDueAutomationJobs({
    jobType: input.jobType,
    limit: input.limit,
    runAt: input.runAt
  });

  let processedJobs = 0;
  const touchedCaseIds = new Set<string>();

  for (const job of dueJobs) {
    processedJobs += 1;
    touchedCaseIds.add(job.caseId);

    const caseDetail = await store.getCaseDetail(job.caseId);

    if (!caseDetail) {
      await store.markAutomationJobCompleted(job.jobId, input.runAt);
      continue;
    }

    const phoneNumber = caseDetail.channelSummary?.contactValue ?? caseDetail.phone ?? null;
    const messageBody = typeof job.payload.messageBody === "string" ? job.payload.messageBody : caseDetail.channelSummary?.latestOutboundMessage ?? "";
    const origin = job.payload.origin === "manager" ? "manager" : "system";
    const sentByName = typeof job.payload.sentByName === "string" ? job.payload.sentByName : null;

    if (!phoneNumber) {
      await store.recordWhatsAppOutboundAttempt(job.caseId, {
        blockReason: "missing_phone",
        failureCode: null,
        failureDetail: null,
        jobId: job.jobId,
        messageBody,
        origin,
        provider: "meta_whatsapp_cloud",
        providerMessageId: null,
        retryAfter: null,
        sentByName,
        status: "blocked",
        updatedAt: input.runAt
      });
      await store.markAutomationJobCompleted(job.jobId, input.runAt);
      continue;
    }

    if (caseDetail.automationStatus === "paused" || caseDetail.automationHoldReason !== null) {
      await store.recordWhatsAppOutboundAttempt(job.caseId, {
        blockReason: caseDetail.automationStatus === "paused" ? "automation_paused" : "qa_hold",
        failureCode: null,
        failureDetail: null,
        jobId: job.jobId,
        messageBody,
        origin,
        provider: "meta_whatsapp_cloud",
        providerMessageId: null,
        retryAfter: null,
        sentByName,
        status: "blocked",
        updatedAt: input.runAt
      });
      await store.markAutomationJobCompleted(job.jobId, input.runAt);
      continue;
    }

    if (!whatsappClient) {
      await store.recordWhatsAppOutboundAttempt(job.caseId, {
        blockReason: "client_credentials_pending",
        failureCode: "client_credentials_pending",
        failureDetail: "Meta WhatsApp send code is ready, but client credentials are not configured for this environment yet.",
        jobId: job.jobId,
        messageBody,
        origin,
        provider: "meta_whatsapp_cloud",
        providerMessageId: null,
        retryAfter: null,
        sentByName,
        status: "blocked",
        updatedAt: input.runAt
      });
      await store.markAutomationJobCompleted(job.jobId, input.runAt);
      continue;
    }

    const sendResult = await whatsappClient.sendTextMessage({
      body: messageBody,
      locale: caseDetail.preferredLocale,
      referenceId: job.caseId,
      to: phoneNumber
    });

    if (sendResult.kind === "sent") {
      await store.recordWhatsAppOutboundAttempt(job.caseId, {
        blockReason: null,
        failureCode: null,
        failureDetail: sendResult.providerStatus,
        jobId: job.jobId,
        messageBody,
        origin,
        provider: "meta_whatsapp_cloud",
        providerMessageId: sendResult.providerMessageId,
        retryAfter: null,
        sentByName,
        status: "sent",
        updatedAt: sendResult.acceptedAt
      });
      await store.markAutomationJobCompleted(job.jobId, sendResult.acceptedAt);
      continue;
    }

    const nextAttemptCount = job.attempts + 1;
    const retryAfter =
      sendResult.retryable && nextAttemptCount < whatsappInitialReplyMaxAttempts
        ? new Date(new Date(input.runAt).getTime() + retryDelayMs).toISOString()
        : null;

    await store.recordWhatsAppOutboundAttempt(job.caseId, {
      blockReason: null,
      failureCode: sendResult.code,
      failureDetail: sendResult.detail,
      jobId: job.jobId,
      messageBody,
      origin,
      provider: "meta_whatsapp_cloud",
      providerMessageId: null,
      retryAfter,
      sentByName,
      status: "failed",
      updatedAt: input.runAt
    });

    if (retryAfter) {
      await store.rescheduleAutomationJob(job.jobId, {
        attempts: nextAttemptCount,
        runAfter: retryAfter,
        updatedAt: input.runAt
      });
      continue;
    }

    await store.markAutomationJobCompleted(job.jobId, input.runAt);
  }

  return {
    processedJobs,
    touchedCaseIds: Array.from(touchedCaseIds)
  };
}

const runCycle = async () => {
  const runAt = new Date().toISOString();
  const followUpResult = await runPersistedFollowUpCycle(store, {
    limit: environment.WORKER_BATCH_LIMIT,
    runAt
  });
  const caseAgentResult = await runPersistedCaseAgentCycle(store, {
    canSendWhatsApp: Boolean(whatsappClient),
    limit: environment.WORKER_BATCH_LIMIT,
    modelAdapter: caseAgentModelAdapter,
    runAt
  });
  const [agentReplyResult, initialReplyResult, caseReplyResult] = await Promise.all([
    runWhatsAppOutboundCycle({
      jobType: whatsappAgentReplyJobType,
      limit: environment.WORKER_BATCH_LIMIT,
      runAt
    }),
    runWhatsAppOutboundCycle({
      jobType: whatsappInitialReplyJobType,
      limit: environment.WORKER_BATCH_LIMIT,
      runAt
    }),
    runWhatsAppOutboundCycle({
      jobType: whatsappCaseReplyJobType,
      limit: environment.WORKER_BATCH_LIMIT,
      runAt
    })
  ]);

  if (
    followUpResult.processedJobs > 0 ||
    followUpResult.openedInterventions > 0 ||
    caseAgentResult.processedJobs > 0 ||
    agentReplyResult.processedJobs > 0 ||
    initialReplyResult.processedJobs > 0 ||
    caseReplyResult.processedJobs > 0
  ) {
    console.info(
      JSON.stringify({
        blockedAgentRuns: caseAgentResult.blockedRuns,
        escalatedAgentRuns: caseAgentResult.escalatedRuns,
        openedInterventions: followUpResult.openedInterventions,
        processedJobs:
          followUpResult.processedJobs +
          caseAgentResult.processedJobs +
          agentReplyResult.processedJobs +
          initialReplyResult.processedJobs +
          caseReplyResult.processedJobs,
        touchedCaseIds: Array.from(
          new Set([
            ...followUpResult.touchedCaseIds,
            ...caseAgentResult.touchedCaseIds,
            ...agentReplyResult.touchedCaseIds,
            ...initialReplyResult.touchedCaseIds,
            ...caseReplyResult.touchedCaseIds
          ])
        ),
        worker: "case_agent_cycle"
      })
    );
  }
};

await runCycle();

const intervalHandle = setInterval(() => {
  void runCycle();
}, environment.WORKER_POLL_INTERVAL_MS);

const stop = async () => {
  clearInterval(intervalHandle);
  await store.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void stop();
});

process.on("SIGTERM", () => {
  void stop();
});
