import test from "node:test";
import assert from "node:assert/strict";
import webpush from "web-push";
import { validateVapidKeyPair } from "../functions/push.js";

test("VAPID accepts the matching private key and normalizes surrounding whitespace", () => {
  const pair = webpush.generateVAPIDKeys();
  assert.equal(
    validateVapidKeyPair(pair.publicKey, pair.privateKey),
    pair.privateKey,
  );
  assert.equal(
    validateVapidKeyPair(pair.publicKey, `\n${pair.privateKey}\r\n`),
    pair.privateKey,
  );
});
test("VAPID rejects a public key, malformed value and a valid but mismatched private key", () => {
  const pair = webpush.generateVAPIDKeys(),
    different = webpush.generateVAPIDKeys();
  for (const privateKey of [
    undefined,
    "",
    pair.publicKey,
    "WEB_PUSH_PRIVATE_KEY=" + pair.privateKey,
    different.privateKey,
    "A".repeat(43),
  ]) {
    assert.throws(
      () => validateVapidKeyPair(pair.publicKey, privateKey),
      (error) => {
        assert.equal(error.code, "failed-precondition");
        assert.equal(error.details.reason, "push-configuration");
        if (typeof privateKey === "string" && privateKey.length > 10)
          assert.equal(error.message.includes(privateKey), false);
        return true;
      },
    );
  }
});
