import test from "node:test";
import assert from "node:assert/strict";
import { maintenanceLimits } from "../js/maintenance-limits.js";
import { DEFAULT_POLICY } from "../js/system-policy.js";
import { pathAttributeLimit } from "../js/path-model.js";

test("limit summaries reflect edited policy rather than hardcoded reward defaults", () => {
  const config = structuredClone(DEFAULT_POLICY);
  config.rewards.temporaryAttribute = 7;
  config.rewards.missionBudget = 23;
  config.progression.gainCap = 3;
  const rows = maintenanceLimits(config);
  assert.equal(rows.find(row=>row.title === "Bónus temporários ativos").value,"+7 por atributo");
  assert.equal(rows.find(row=>row.origin === "missions").value,"23 pontos");
  assert.ok(rows.find(row=>row.origin === "games").value.startsWith("+3 /"));
});

test("ETC keeps its own attribute allowance and appears with missions, not event quotas", () => {
  const missions = maintenanceLimits(DEFAULT_POLICY,"missions");
  assert.ok(missions.find(row=>row.origin === "path").value.includes(`+${pathAttributeLimit("passing")} por atributo`));
  assert.ok(missions.find(row=>row.origin === "path").value.includes(`+${pathAttributeLimit("goalkeeping")} a GR`));
  assert.equal(missions.some(row=>row.origin === "events"),false);
  assert.equal(maintenanceLimits(DEFAULT_POLICY,"events").some(row=>row.origin === "path"),false);
});

test("zero budget does not suggest that attribute caps are unlimited", () => {
  const rows = maintenanceLimits(DEFAULT_POLICY);
  assert.equal(rows.find(row=>row.origin === "missions").value,"Sem teto de orçamento");
  assert.equal(rows.find(row=>row.title === "Bónus permanentes").value,"+10 por atributo");
});
