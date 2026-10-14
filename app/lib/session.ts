// app/lib/session.ts
// Signed admin session cookie: base64url(JSON payload) + "." + base64url(HMAC-SHA256).
// Uses Web Crypto so the same code runs in proxy.ts and in server actions.
// No SESSION_SECRET (or one shorter than 32 chars) = nobody can log in (fail closed).

export const SESSION_COOKIE = "admin_session";
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export type Session = { userId: number; role: string; exp: number };

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function key(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set (32+ characters)");
  }
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function signSession(userId: number, role: string, now = Date.now()): Promise<string> {
  const payload: Session = { userId, role, exp: now + SESSION_TTL_MS };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

// Returns the session only if the signature is valid and it has not expired.
export async function verifySession(token: string | undefined, now = Date.now()): Promise<Session | null> {
  if (!token) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  try {
    // crypto.subtle.verify compares in constant time
    const ok = await crypto.subtle.verify("HMAC", await key(), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const s = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Session;
    if (typeof s.userId !== "number" || typeof s.exp !== "number" || s.exp <= now) return null;
    return s;
  } catch {
    return null;
  }
}
