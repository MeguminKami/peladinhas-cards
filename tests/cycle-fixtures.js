// Domain regression suites explicitly insert a permitted check after fixture
// writes. Production timing and read-only access are tested separately in
// automation-cycle.backend.test.js; these helpers never access a live project.
import { randomUUID } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { assertTestEmulator } from "../functions/test-environment.js";

export async function checkCards() {
  assertTestEmulator();
  const { refreshCardCollection } = await import("../functions/index.js");
  return refreshCardCollection.run({ cycle: true });
}
export async function checkCycle() {
  assertTestEmulator();
  const { systemHeartbeat } = await import("../functions/index.js");
  return systemHeartbeat.run({ scheduleTime: `fixture-${randomUUID()}` });
}
export async function checkNotices() {
  const { scheduledNotifications } = await import("../functions/index.js");
  return scheduledNotifications.run({ cycle: true });
}
export function afterCheck(endpoint, check = checkCards) {
  return { run: async request => {
    const result = await endpoint.run(request);
    await check();
    return result;
  } };
}
export function checkedEventNotice(endpoint) {
  return { run: async request => {
    const current = (await getFirestore().doc(`events/${request.params.eid}`).get()).data();
    await endpoint.run({ ...request, data: { after: { data: () => current } } });
    return checkNotices();
  } };
}
