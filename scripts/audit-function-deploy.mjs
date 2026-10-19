import { auditAuth } from "./firestore-audit-cache.mjs";
// Read-only deployment diagnostics. Does not deploy, cancel, or print credentials.
import { createRequire } from "node:module";
import { firebaseConfig } from "../js/config.js";
const require = createRequire(import.meta.url);
const auth = auditAuth;
const account = auth.getGlobalDefaultAccount();
if (!account) throw Error("Sem sessão Firebase.");
const token = await auth.getAccessToken(
  account.tokens.refresh_token,
  account.tokens.scopes,
);
async function get(url, body) {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const value = await response.json();
  if (!response.ok)
    return { httpStatus: response.status, error: value.error?.message };
  return value;
}
const parent = `projects/${firebaseConfig.projectId}/locations/europe-west1`;
const fn = await get(
  `https://cloudfunctions.googleapis.com/v2/${parent}/functions/voteEvent`,
);
console.log(
  JSON.stringify(
    {
      function: fn.name,
      state: fn.state,
      stateMessages: fn.stateMessages,
      updateTime: fn.updateTime,
      build: fn.buildConfig?.build,
      runtime: fn.buildConfig?.runtime,
      entryPoint: fn.buildConfig?.entryPoint,
      service: fn.serviceConfig?.service,
      revision: fn.serviceConfig?.revision,
      memory: fn.serviceConfig?.availableMemory,
      error: fn.error,
    },
    null,
    2,
  ),
);
const operations = await get(
  `https://cloudfunctions.googleapis.com/v2/${parent}/operations?pageSize=100`,
);
console.log(
  JSON.stringify(
    {
      operations: (operations.operations || [])
        .filter((op) => op.metadata?.target?.includes("voteEvent"))
        .map((op) => ({
          name: op.name,
          done: op.done,
          error: op.error,
          createTime: op.metadata?.createTime,
          endTime: op.metadata?.endTime,
          stages: op.metadata?.stages?.map((stage) => ({
            name: stage.name,
            state: stage.state,
            message: stage.message,
          })),
        })),
      error: operations.error,
    },
    null,
    2,
  ),
);
if (fn.buildConfig?.build) {
  const build = await get(
    `https://cloudbuild.googleapis.com/v1/${fn.buildConfig.build}`,
  );
  console.log(
    JSON.stringify(
      {
        buildStatus: build.status,
        createTime: build.createTime,
        startTime: build.startTime,
        finishTime: build.finishTime,
        failureInfo: build.failureInfo,
        statusDetail: build.statusDetail,
        steps: build.steps?.map((step) => ({
          name: step.name,
          status: step.status,
          timing: step.timing,
        })),
        logUrl: build.logUrl,
        error: build.error,
      },
      null,
      2,
    ),
  );
}
