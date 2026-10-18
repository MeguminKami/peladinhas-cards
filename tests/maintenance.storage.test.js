import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { DEFAULT_POLICY } from "../js/system-policy.js";
if (
  !process.env.FIRESTORE_EMULATOR_HOST ||
  !process.env.FIREBASE_STORAGE_EMULATOR_HOST
)
  throw Error("Este teste requer os emuladores Firestore e Storage.");
test("avatars obey active-account checks, delegated capabilities and read-only mode", async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":"),
    [storageHost, storagePort] =
      process.env.FIREBASE_STORAGE_EMULATOR_HOST.split(":");
  const env = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT,
    firestore: {
      host,
      port: +port,
      rules: readFileSync("firestore.rules", "utf8"),
    },
    storage: {
      host: storageHost,
      port: +storagePort,
      rules: readFileSync("storage.rules", "utf8"),
    },
  });
  try {
    await env.withSecurityRulesDisabled(async (c) => {
      for (const [uid, role, capabilities] of [
        ["member", "member", null],
        ["root", "admin", null],
        ["limited", "admin", ["audit"]],
      ])
        await setDoc(doc(c.firestore(), `users/${uid}`), {
          uid,
          role,
          disabled: false,
          adminCapabilities: capabilities,
        });
    });
    const upload = (uid, target = uid) =>
      uploadBytes(
        ref(
          env.authenticatedContext(uid).storage(),
          `profiles/${target}/avatar`,
        ),
        new Uint8Array([1, 2, 3]),
        { contentType: "image/png" },
      );
    await assertSucceeds(upload("member"));
    await assertFails(upload("member", "root"));
    await assertFails(upload("limited", "member"));
    await assertSucceeds(upload("root", "member"));
    await env.withSecurityRulesDisabled(async (c) =>
      updateDoc(doc(c.firestore(), "users/member"), { disabled: true }),
    );
    await assertFails(upload("member"));
    const config = structuredClone(DEFAULT_POLICY);
    config.features.mode = "readOnly";
    await env.withSecurityRulesDisabled(async (c) =>
      setDoc(doc(c.firestore(), "settings/system"), {
        revision: 1,
        timeline: [
          { version: 1, effectiveMillis: 0, effectiveAt: "1970-01-01", config },
        ],
      }),
    );
    await assertFails(upload("root"));
  } finally {
    await env.cleanup();
  }
});
