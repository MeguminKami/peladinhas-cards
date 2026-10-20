export function assertTestEmulator(env = process.env) {
  if (!env.NODE_TEST_CONTEXT) return;
  if (!env.FIRESTORE_EMULATOR_HOST || !env.GCLOUD_PROJECT?.startsWith("demo-"))
    throw Error("Testes backend exigem FIRESTORE_EMULATOR_HOST e GCLOUD_PROJECT=demo-*. Usa npm.cmd run test:backend.");
}
export function emulatorAppOptions(env = process.env) {
  if (!env.FIRESTORE_EMULATOR_HOST || !env.GCLOUD_PROJECT?.startsWith("demo-")) return undefined;
  return {
    projectId: env.GCLOUD_PROJECT,
    storageBucket: `${env.GCLOUD_PROJECT}.appspot.com`,
    credential: cert({
      projectId: env.GCLOUD_PROJECT,
      clientEmail: `emulator@${env.GCLOUD_PROJECT}.iam.gserviceaccount.com`,
      privateKey: generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } }).privateKey,
    }),
  };
}
import { cert } from "firebase-admin/app";
import { generateKeyPairSync } from "node:crypto";
