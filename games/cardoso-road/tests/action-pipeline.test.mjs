import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createActionPipeline,
  waitForPresentation,
} from "../action-pipeline.mjs";
const flush = () => new Promise((resolve) => setImmediate(resolve));
test("paint, durable confirmation, presentation, animation and sound run in order", async () => {
  const order = [],
    phases = [];
  const p = createActionPipeline({
    onPhase: (phase) => phases.push(phase),
    paint: async () => order.push("paint"),
  });
  await p.run("step", {
    confirm: async () => {
      order.push("confirm");
      return 7;
    },
    present: (value) => {
      assert.equal(value, 7);
      order.push("present");
    },
    animate: async () => order.push("animate"),
    sound: () => order.push("sound"),
  });
  assert.deepEqual(order, [
    "paint",
    "confirm",
    "present",
    "paint",
    "animate",
    "sound",
  ]);
  assert.deepEqual(phases, [
    "feedback",
    "confirm",
    "present",
    "animate",
    "sound",
    "idle",
  ]);
  assert.equal(p.active, false);
});
test("repeated clicks and cashout cannot overtake an unconfirmed command", async () => {
  let release,
    calls = 0;
  const p = createActionPipeline({ paint: async () => {} }),
    stages = {
      confirm: async () => {
        calls++;
        await new Promise((resolve) => (release = resolve));
      },
      present() {},
      animate: async () => {},
      sound() {},
    };
  const first = p.run("start", stages);
  await flush();
  assert.equal(p.phase, "confirm");
  assert.equal(await p.run("start", stages), false);
  assert.equal(await p.run("cashout", stages), false);
  release();
  await first;
  assert.equal(calls, 1);
});
test("cashout cancels only the confirmed animation and discards its stale sound", async () => {
  const sounds = [],
    p = createActionPipeline({ paint: async () => {} });
  let confirms = 0;
  const first = p.run("step", {
    confirm: async () => ++confirms,
    present() {},
    animate: (_, signal) => waitForPresentation(10000, signal),
    sound: () => sounds.push("step"),
  });
  await flush();
  assert.equal(p.phase, "animate");
  assert.equal(
    await p.run("step", {
      confirm() {
        throw Error("must not run");
      },
    }),
    false,
  );
  await p.run("cashout", {
    confirm: async () => ++confirms,
    present() {},
    animate: async () => {},
    sound: () => sounds.push("cashout"),
  });
  await first;
  assert.equal(confirms, 2);
  assert.deepEqual(sounds, ["cashout"]);
  assert.equal(p.phase, "idle");
});
test("confirmation failures skip presentation and sound and release the pipeline", async () => {
  const p = createActionPipeline({ paint: async () => {} });
  let applied = 0;
  await assert.rejects(
    p.run("start", {
      confirm: async () => {
        throw Error("disk failure");
      },
      present: () => applied++,
      sound: () => applied++,
    }),
    /disk failure/,
  );
  assert.equal(applied, 0);
  assert.equal(p.active, false);
  await p.run("start", {
    confirm: async () => {},
    present() {},
    animate: async () => {},
    sound() {},
  });
});
