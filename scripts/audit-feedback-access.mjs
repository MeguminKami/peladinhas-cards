// Read-only diagnostics. No credentials, identities or individual votes in output.
import { createRequire } from "node:module";
import { firebaseConfig } from "../js/config.js";
import { policyAt } from "../js/system-policy.js";
const require = createRequire(import.meta.url),
  auth = require("firebase-tools/lib/auth.js"),
  account = auth.getGlobalDefaultAccount();
if (!account) throw Error("Sem sessão Firebase.");
const token = await auth.getAccessToken(
  account.tokens.refresh_token,
  account.tokens.scopes,
);
async function read(url, body) {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const value = await response.json();
  return response.ok
    ? value
    : { httpStatus: response.status, error: value.error?.message };
}
const project = firebaseConfig.projectId,
  parent = `projects/${project}/locations/europe-west1`;
const fn = await read(
  `https://cloudfunctions.googleapis.com/v2/${parent}/functions/feedbackAction`,
);
const service = fn.serviceConfig?.service;
const iam = service
  ? await read(`https://run.googleapis.com/v2/${service}:getIamPolicy`)
  : null;
const since = new Date(Date.now() - 7 * 86400000).toISOString();
const logs = process.argv.includes("--errors-only")
  ? {}
  : await read("https://logging.googleapis.com/v2/entries:list", {
      resourceNames: [`projects/${project}`],
      filter: `resource.type="cloud_run_revision" AND resource.labels.service_name="feedbackaction" AND timestamp>="${since}"`,
      orderBy: "timestamp desc",
      pageSize: 300,
    });
const errors = await read("https://logging.googleapis.com/v2/entries:list", {
  resourceNames: [`projects/${project}`],
  filter: `resource.type="cloud_run_revision" AND resource.labels.service_name="feedbackaction" AND timestamp>="${since}" AND httpRequest.status>=400`,
  orderBy: "timestamp desc",
  pageSize: 100,
});
const decode = (value) =>
  value.mapValue
    ? Object.fromEntries(
        Object.entries(value.mapValue.fields || {}).map(([key, value]) => [
          key,
          decode(value),
        ]),
      )
    : value.arrayValue
      ? (value.arrayValue.values || []).map(decode)
      : value.integerValue !== undefined
        ? Number(value.integerValue)
        : (value.doubleValue ??
          value.booleanValue ??
          value.timestampValue ??
          value.stringValue ??
          null);
const documents = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const settings = await read(`${documents}/settings/system`);
const policy = policyAt(
  new Date(),
  settings.fields ? decode({ mapValue: { fields: settings.fields } }) : null,
);
async function collection(path) {
  let rows = [],
    pageToken;
  do {
    const response = await read(
      `${documents}/${path}?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,
    );
    if (response.error) return { error: response.error };
    rows.push(
      ...(response.documents || []).map((doc) => ({
        ...decode({ mapValue: { fields: doc.fields || {} } }),
        id: doc.name.split("/").at(-1),
      })),
    );
    pageToken = response.nextPageToken;
  } while (pageToken);
  return rows;
}
const [games, users] = await Promise.all([
  collection("games"),
  collection("users"),
]);
const latest = Array.isArray(games)
  ? games
      .filter((game) => game.status === "closed" && !game.deleting)
      .sort((a, b) => +new Date(b.closedAt) - +new Date(a.closedAt))[0]
  : null;
let latestGame = null;
if (latest && Array.isArray(users)) {
  const ids = [
    ...(latest.teamA?.starters || []),
    ...(latest.teamA?.bench || []),
    ...(latest.teamB?.starters || []),
    ...(latest.teamB?.bench || []),
  ];
  const feedback = await collection(`games/${latest.id}/feedback`);
  latestGame = {
    closedAt: latest.closedAt,
    participants: ids.length,
    missingProfiles: ids.filter(
      (uid) => !users.some((user) => (user.uid || user.id) === uid),
    ).length,
    disabledProfiles: ids.filter((uid) =>
      users.some((user) => (user.uid || user.id) === uid && user.disabled),
    ).length,
    roles: Object.fromEntries(
      [
        ...new Set(
          users
            .filter((user) => ids.includes(user.uid || user.id))
            .map((user) => user.role || "member"),
        ),
      ].map((role) => [
        role,
        users.filter(
          (user) =>
            ids.includes(user.uid || user.id) &&
            (user.role || "member") === role,
        ).length,
      ]),
    ),
    submitted: feedback.filter?.((vote) => vote.submitted).length,
    drafts: feedback.filter?.((vote) => !vote.submitted).length,
  };
}
const requests = (logs.entries || [])
  .filter((entry) => entry.httpRequest)
  .map((entry) => ({
    time: entry.timestamp,
    status: entry.httpRequest.status,
    device: /Android/i.test(entry.httpRequest.userAgent)
      ? "Android"
      : /iPhone|iPad/i.test(entry.httpRequest.userAgent)
        ? "iOS"
        : "other",
  }));
const messages = (logs.entries || [])
  .filter((entry) => !entry.httpRequest)
  .map((entry) =>
    String(entry.textPayload || entry.jsonPayload?.message || ""),
  );
const assets = await Promise.all(
  ["js/db.js", "js/ratings.js", "sw.js"].map(async (path) => {
    const response = await fetch(`https://${project}.web.app/${path}`, {
        cache: "no-store",
      }),
      source = await response.text();
    return {
      path,
      status: response.status,
      usesCallable: source.includes('callAdmin("feedbackAction"'),
      usesDirectFeedbackTransaction:
        /games\/\$\{gid\}\/feedback/.test(source) &&
        /runTransaction/.test(
          source.slice(
            source.indexOf("export async function saveFeedback"),
            source.indexOf("export async function saveGame"),
          ),
        ),
      cacheVersion:
        path === "sw.js"
          ? source.match(/(?:CACHE|VERSION)[\w ]*\s*=\s*["'`]([^"'`]+)/)?.[1]
          : undefined,
    };
  }),
);
console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      function: {
        state: fn.state,
        updateTime: fn.updateTime,
        entryPoint: fn.buildConfig?.entryPoint,
        error: fn.error,
      },
      policy: {
        mode: policy.features.mode,
        ratings: policy.features.ratings,
        requireAppCheck: policy.security.requireAppCheck,
        hasAppCheckKey: !!policy.security.appCheckSiteKey,
      },
      invoker: {
        public: iam?.bindings?.some(
          (binding) =>
            binding.role === "roles/run.invoker" &&
            binding.members?.includes("allUsers"),
        ),
        error: iam?.error,
      },
      latestGame,
      requests: {
        sampleSize: requests.length,
        first: requests.at(-1)?.time,
        last: requests[0]?.time,
        statuses: Object.fromEntries(
          [...new Set(requests.map((request) => request.status))].map(
            (status) => [
              status,
              requests.filter((request) => request.status === status).length,
            ],
          ),
        ),
        errors: (errors.entries || []).map((entry) => ({
          time: entry.timestamp,
          status: entry.httpRequest?.status,
        })),
        limited: !!logs.nextPageToken,
      },
      messages: {
        notAuthenticated: messages.filter((message) =>
          /not authenticated|unauthenticated/i.test(message),
        ).length,
        permissionDenied: messages.filter((message) =>
          /permission.denied|permission_denied|permission denied/i.test(
            message,
          ),
        ).length,
        appCheck: messages.filter((message) => /app.?check/i.test(message))
          .length,
      },
      logError: logs.error,
      errorQueryError: errors.error,
      assets,
    },
    null,
    2,
  ),
);
