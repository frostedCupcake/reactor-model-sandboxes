import assert from "node:assert/strict";
import test from "node:test";
import { createKeySession, readKeySession, SESSION_TTL_MS } from "../src/session.js";

process.env.SESSION_SECRET = "test-only-session-secret-with-at-least-32-characters";

test("keeps an encrypted API key session for one hour", () => {
  assert.equal(SESSION_TTL_MS, 60 * 60 * 1_000);
});

test("encrypts and restores a Reactor API key", () => {
  const now = 1_700_000_000_000;
  const session = createKeySession("example-key-not-real", now);
  assert.equal(session.value.includes("example-key"), false);
  assert.deepEqual(readKeySession(session.value, now + 1), {
    apiKey: "example-key-not-real",
    expiresAt: now + SESSION_TTL_MS,
  });
});

test("rejects expired and tampered sessions", () => {
  const now = 1_700_000_000_000;
  const session = createKeySession("example-key-not-real", now);
  assert.equal(readKeySession(session.value, now + SESSION_TTL_MS), null);
  assert.equal(readKeySession(`${session.value}tampered`, now + 1), null);
});
