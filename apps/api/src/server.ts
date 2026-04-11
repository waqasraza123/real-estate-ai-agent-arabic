import { createAlphaLeadCaptureStore } from "@real-estate-ai/database";

import { buildApiApp } from "./app";
import { parseApiEnvironment } from "./env";

const environment = parseApiEnvironment(process.env);
const store = await createAlphaLeadCaptureStore({
  dataPath: environment.API_DATABASE_PATH
});
const app = buildApiApp({
  store
});

const stop = async () => {
  await app.close();
  await store.close();
};

process.on("SIGINT", () => {
  void stop();
});

process.on("SIGTERM", () => {
  void stop();
});

await app.listen({
  host: environment.API_HOST,
  port: environment.API_PORT
});
