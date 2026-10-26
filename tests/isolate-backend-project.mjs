// Each test file owns a demo namespace; complete checks must not consume
// another suite's pending jobs or notify its users.
if (process.env.NODE_TEST_CONTEXT) {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.GCLOUD_PROJECT?.startsWith("demo-"))
    throw Error("Isolamento backend exige um emulador e um projeto demo.");
  process.env.GCLOUD_PROJECT += `-worker-${process.pid}`;
}
