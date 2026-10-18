import { DEFAULT_POLICY, validatePolicy } from "../../js/system-policy.js";
export async function maintenanceFixture(state, name, data) {
  const document = state.systemPolicy || { revision: 0, timeline: [] };
  const config = document.timeline.at(-1)?.config || DEFAULT_POLICY;
  state.systemAudit ||= [];
  if (name === "maintenanceRead") {
    const section = data.section;
    if (section === "config")
      return {
        document,
        config,
        version: document.revision,
        draft: state.systemDraft || null,
      };
    if (section === "history")
      return { audit: state.systemAudit, versions: state.systemVersions || [] };
    if (section === "rewards") return { rewards: state.eventRewards || [] };
    if (section === "access")
      return {
        users: state.users
          .filter((user) => user.role === "admin")
          .map((user) => ({
            ...user,
            name: user.displayName || user.username,
          })),
        capabilities: {},
      };
    if (section === "diagnostics")
      return {
        checkedAt: new Date().toISOString(),
        counts: { users: state.users.length, games: state.games.length },
        issues: [],
      };
    if (section === "backups")
      throw Error("As cópias cloud não estão disponíveis no emulador.");
    return {
      version: document.revision,
      jobs: [],
      registered: [
        { id: "closeEvents", group: "events", schedule: "every 5 minutes" },
      ],
      pending: [],
      environment: "emulator",
      configuration: config,
    };
  }
  if (data.action === "draft") {
    state.systemDraft = { config: validatePolicy(data.config) };
    return { ok: true };
  }
  if (data.action === "publish") {
    const policy = validatePolicy(data.config);
    if (document.revision !== data.expectedRevision)
      throw Error("A configuração mudou.");
    const version = document.revision + 1,
      effectiveAt = data.effectiveAt || new Date().toISOString();
    const entry = {
      version,
      effectiveAt,
      effectiveMillis: +new Date(effectiveAt),
      config: policy,
    };
    state.systemPolicy = {
      revision: version,
      timeline: [...document.timeline, entry],
    };
    state.systemVersions ||= [];
    state.systemVersions.push({
      ...entry,
      actorId: "pedro",
      reason: data.reason,
    });
    state.systemDraft = null;
    return { revision: version };
  }
  if (data.action === "simulate")
    return {
      players: [
        { uid: "pedro", name: "Pedro", before: 70, after: 72, delta: 2 },
      ],
      notice: "Simulação sem alterar dados.",
    };
  if (data.action === "retention")
    return { preview: data.confirm !== true, count: 0 };
  if (data.action === "export")
    return { rows: state[data.collection] || [], next: null };
  if (data.action === "permissions") {
    state.users.find((user) => user.uid === data.uid).adminCapabilities =
      data.capabilities;
    return { ok: true };
  }
  return { ok: true };
}
