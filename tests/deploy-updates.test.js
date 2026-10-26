import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  deploymentStages,
  sourceExports,
  fromStage,
} from "../scripts/deploy-updates.mjs";

const manifest = JSON.parse(
  readFileSync(
    new URL("../scripts/deploy-updates.json", import.meta.url),
    "utf8",
  ),
);
test("rollout covers every current export once, with explicit selectors and no Storage/index deploy", () => {
  const names = sourceExports(
    readFileSync(new URL("../functions/index.js", import.meta.url), "utf8"),
  );
  assert.deepEqual([...manifest.functions].sort(), names);
  const stages = deploymentStages(manifest);
  assert.equal(stages[0].only, "firestore:rules");
  assert.equal(stages.at(-1).only, "hosting");
  const deployed = stages
    .slice(1, -1)
    .flatMap((stage) => stage.only.split(","));
  assert.deepEqual(
    deployed.map((selector) => selector.split(":").at(-1)).sort(),
    names,
  );
  assert.equal(new Set(deployed).size, names.length);
  assert.ok(
    stages.slice(1, -1).every((stage) => stage.only.split(",").length <= 8),
  );
  assert.ok(
    deployed.every((selector) => selector.startsWith("functions:peladinhas:")),
  );
  assert.ok(
    stages.every(
      (stage) =>
        !stage.args.includes("--force") &&
        !stage.only.includes("storage") &&
        !stage.only.includes("indexes"),
    ),
  );
});
test("resume is explicit and rejects invalid stage/options", () => {
  const count = deploymentStages(manifest).length;
  assert.equal(fromStage([], count), 1);
  assert.equal(fromStage(["--plan", "--from-stage", "3"], count), 3);
  for (const args of [
    ["--from-stage"],
    ["--from-stage", "0"],
    ["--from-stage", String(count + 1)],
    ["--force"],
  ])
    assert.throws(() => fromStage(args, count));
  assert.throws(() => deploymentStages({ ...manifest, batchSize: 40 }));
  assert.throws(() =>
    deploymentStages({ ...manifest, functions: ["duplicate", "duplicate"] }),
  );
});
