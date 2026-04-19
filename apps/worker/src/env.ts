import { fileURLToPath } from "node:url";

import { z } from "zod";

const defaultDatabasePath = fileURLToPath(new URL("../../api/.data/phase2-alpha", import.meta.url));

const workerEnvironmentSchema = z.object({
  WORKER_AGENT_OPENAI_API_KEY: z.string().min(1).optional(),
  WORKER_AGENT_OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  WORKER_AGENT_OPENAI_MODEL: z.string().min(1).default("gpt-5.4-mini"),
  WORKER_AGENT_OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  WORKER_BATCH_LIMIT: z.coerce.number().int().positive().default(25),
  WORKER_DATABASE_PATH: z.string().min(1).default(defaultDatabasePath),
  WORKER_META_WHATSAPP_ACCESS_TOKEN: z.string().min(1).optional(),
  WORKER_META_WHATSAPP_API_VERSION: z.string().min(1).default("v20.0"),
  WORKER_META_WHATSAPP_PHONE_NUMBER_ID: z.string().min(1).optional(),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(15000)
}).superRefine((environment, context) => {
  if (Boolean(environment.WORKER_META_WHATSAPP_ACCESS_TOKEN) !== Boolean(environment.WORKER_META_WHATSAPP_PHONE_NUMBER_ID)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "WORKER_META_WHATSAPP_ACCESS_TOKEN and WORKER_META_WHATSAPP_PHONE_NUMBER_ID must be set together.",
      path: ["WORKER_META_WHATSAPP_ACCESS_TOKEN"]
    });
  }
});

export type WorkerEnvironment = z.infer<typeof workerEnvironmentSchema>;

export function parseWorkerEnvironment(environment: NodeJS.ProcessEnv): WorkerEnvironment {
  return workerEnvironmentSchema.parse(environment);
}
