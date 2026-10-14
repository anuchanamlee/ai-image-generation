// node --test tests/   (Node 22.6+ strips the TypeScript types from session.ts)
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-characters";
const { signSession, verifySession, SESSION_TTL_MS } = await import("../app/lib/session.ts");

const b64url = (s) => Buffer.from(s).toString("base64url");

test("a signed session verifies", async () => {
  const s = await verifySession(await signSession(1, "admin"));
  assert.equal(s?.userId, 1);
  assert.equal(s?.role, "admin");
});

test("the old unsigned JSON cookie is rejected", async () => {
  assert.equal(await verifySession(JSON.stringify({ userId: 1, role: "superadmin" })), null);
});

test("a forged payload with someone else's signature is rejected", async () => {
  const [, sig] = (await signSession(2, "admin")).split(".");
  const forged = b64url(JSON.stringify({ userId: 1, role: "superadmin", exp: Date.now() + 1e9 }));
  assert.equal(await verifySession(`${forged}.${sig}`), null);
});

test("an expired session is rejected", async () => {
  const token = await signSession(1, "admin", Date.now() - SESSION_TTL_MS - 1);
  assert.equal(await verifySession(token), null);
});

test("a token signed with another secret is rejected", async () => {
  const token = await signSession(1, "admin");
  process.env.SESSION_SECRET = "another-secret-that-is-also-32-characters!";
  try {
    assert.equal(await verifySession(token), null);
  } finally {
    process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-characters";
  }
});

test("no secret = fail closed on sign, null on verify", async () => {
  const token = await signSession(1, "admin");
  delete process.env.SESSION_SECRET;
  try {
    await assert.rejects(signSession(1, "admin"));
    assert.equal(await verifySession(token), null);
  } finally {
    process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-characters";
  }
});

test("garbage input is rejected without throwing", async () => {
  for (const t of [undefined, "", ".", "a.b.c", "%%%.%%%", "eyJ9.x"]) {
    assert.equal(await verifySession(t), null);
  }
});
