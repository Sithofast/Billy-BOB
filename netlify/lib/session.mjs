// Signed cookies for forum logins. A cookie holds the member's Discord id,
// name and avatar plus an expiry, signed with SESSION_SECRET so it can't be
// forged or edited in the browser.
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "uw_session";
export const OAUTH_COOKIE = "uw_oauth";
export const SESSION_DAYS = 30;

function signature(body, secret) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function sign(data, secret) {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${body}.${signature(body, secret)}`;
}

export function verify(token, secret) {
  if (!token || !secret) return null;
  const [body, sig] = String(token).split(".");
  if (!body || !sig) return null;
  const given = Buffer.from(sig);
  const expected = Buffer.from(signature(body, secret));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!data || typeof data.exp !== "number" || Date.now() > data.exp) return null;
  return data;
}

export function parseCookies(header) {
  const cookies = {};
  for (const part of String(header || "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    cookies[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return cookies;
}

export function cookieHeader(name, value, maxAgeSeconds) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function modIds() {
  return String(process.env.FORUM_MOD_IDS || "")
    .split(/[\s,]+/)
    .filter(Boolean);
}

// The logged-in member for this request, or null
export function currentUser(req) {
  const cookies = parseCookies(req.headers.get("cookie"));
  const data = verify(cookies[SESSION_COOKIE], process.env.SESSION_SECRET);
  if (!data || !data.id) return null;
  return {
    id: String(data.id),
    name: String(data.name || "Member"),
    avatar: String(data.avatar || ""),
    member: Boolean(data.member),
    isMod: modIds().includes(String(data.id)),
  };
}

// Only allow redirects back to a page on this site
export function safeReturnPath(value, fallback = "/forum.html") {
  const path = String(value || "");
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : fallback;
}

export function json(data, status = 200, extraHeaders) {
  const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
  for (const [k, v] of extraHeaders || []) headers.append(k, v);
  return new Response(JSON.stringify(data), { status, headers });
}
