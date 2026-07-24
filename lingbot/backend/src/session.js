import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const SESSION_TTL_MS = 30 * 60 * 1_000;
export const SESSION_COOKIE = "reactor_key_session";

function encryptionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  return createHash("sha256").update(secret).digest();
}

export function createKeySession(apiKey, now = Date.now()) {
  const expiresAt = now + SESSION_TTL_MS;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify({ apiKey, expiresAt }), "utf8"),
    cipher.final(),
  ]);
  const value = [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
  return { value, expiresAt };
}

export function readKeySession(value, now = Date.now()) {
  if (!value) return null;
  try {
    const [ivValue, tagValue, encryptedValue] = value.split(".");
    if (!ivValue || !tagValue || !encryptedValue) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]);
    const session = JSON.parse(decrypted.toString("utf8"));
    if (
      typeof session?.apiKey !== "string" ||
      typeof session?.expiresAt !== "number" ||
      session.expiresAt <= now
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        return separator === -1
          ? [part, ""]
          : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      }),
  );
}

export function sessionCookie(value, maxAgeSeconds = SESSION_TTL_MS / 1_000) {
  const sameSite = process.env.COOKIE_SAME_SITE || "Lax";
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}; SameSite=${sameSite}${secure}`;
}

export function clearSessionCookie() {
  return sessionCookie("", 0);
}
