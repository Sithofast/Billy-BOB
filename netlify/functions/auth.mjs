// "Log in with Discord" for the forum.
//   /api/auth/login     → sends the visitor to Discord to approve the login
//   /api/auth/callback  → Discord sends them back here; we check they're in the
//                         Ultima Warriors server and set a signed login cookie
//   /api/auth/me        → who is logged in (used by the forum page)
//   /api/auth/logout    → clears the login cookie
//
// Needs these Netlify environment variables: DISCORD_CLIENT_ID,
// DISCORD_CLIENT_SECRET, SESSION_SECRET. Optional: DISCORD_SERVER_ID,
// FORUM_MOD_IDS (comma-separated Discord user ids of moderators).
import { randomBytes } from "node:crypto";
import {
  OAUTH_COOKIE, SESSION_COOKIE, SESSION_DAYS, cookieHeader, currentUser, json,
  parseCookies, safeReturnPath, sign, verify,
} from "../lib/session.mjs";

export const config = { path: "/api/auth/:action" };

const DEFAULT_SERVER_ID = "969042661656915968";
const DISCORD_API = "https://discord.com/api/v10";

function redirect(location, cookies = []) {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
}

function avatarUrl(user) {
  if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
  const index = Number((BigInt(user.id) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

function errorPage(message, status = 400) {
  const safe = message.replace(/[<>&"]/g, "");
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>Login problem</title><body style="font-family:system-ui;background:#05060f;color:#e8ecff;padding:2rem">` +
      `<h1>Login problem</h1><p>${safe}</p><p><a style="color:#3ee0ff" href="/forum.html">Back to the forum</a></p>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

export default async (req, context) => {
  const action = context.params?.action;
  const url = new URL(req.url);
  const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, SESSION_SECRET } = process.env;
  const configured = Boolean(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET && SESSION_SECRET);
  const redirectUri = `${url.origin}/api/auth/callback`;

  if (action === "me") {
    return json({ user: currentUser(req), configured });
  }

  if (action === "logout") {
    return redirect(safeReturnPath(url.searchParams.get("return")), [cookieHeader(SESSION_COOKIE, "", 0)]);
  }

  if (!configured) return errorPage("Forum login isn't set up yet. Please try again later.", 503);

  if (action === "login") {
    const state = randomBytes(16).toString("base64url");
    const returnTo = safeReturnPath(url.searchParams.get("return"));
    const oauth = sign({ state, returnTo, exp: Date.now() + 10 * 60 * 1000 }, SESSION_SECRET);
    const discord = new URL("https://discord.com/oauth2/authorize");
    discord.search = new URLSearchParams({
      response_type: "code",
      client_id: DISCORD_CLIENT_ID,
      scope: "identify guilds",
      redirect_uri: redirectUri,
      state,
      prompt: "none",
    }).toString();
    return redirect(discord.toString(), [cookieHeader(OAUTH_COOKIE, oauth, 600)]);
  }

  if (action === "callback") {
    const pending = verify(parseCookies(req.headers.get("cookie"))[OAUTH_COOKIE], SESSION_SECRET);
    const state = url.searchParams.get("state");
    if (!pending || !state || pending.state !== state) {
      return errorPage("That login link expired or was already used. Please try logging in again.");
    }
    if (url.searchParams.get("error")) return redirect(pending.returnTo, [cookieHeader(OAUTH_COOKIE, "", 0)]);
    const code = url.searchParams.get("code");
    if (!code) return errorPage("Discord didn't send a login code. Please try again.");

    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
      }),
    });
    if (!tokenRes.ok) {
      console.error(`Discord token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
      return errorPage("Discord didn't accept the login. Please try again.", 502);
    }
    const { access_token: accessToken } = await tokenRes.json();
    const auth = { headers: { Authorization: `Bearer ${accessToken}` } };
    const [userRes, guildsRes] = await Promise.all([
      fetch(`${DISCORD_API}/users/@me`, auth),
      fetch(`${DISCORD_API}/users/@me/guilds`, auth),
    ]);
    if (!userRes.ok || !guildsRes.ok) {
      console.error(`Discord profile lookup failed: ${userRes.status} / ${guildsRes.status}`);
      return errorPage("Couldn't load your Discord profile. Please try again.", 502);
    }
    const user = await userRes.json();
    const guilds = await guildsRes.json();
    const serverId = process.env.DISCORD_SERVER_ID || DEFAULT_SERVER_ID;
    const member = Array.isArray(guilds) && guilds.some((g) => g.id === serverId);

    const session = sign(
      {
        id: user.id,
        name: user.global_name || user.username,
        avatar: avatarUrl(user),
        member,
        exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
      },
      SESSION_SECRET
    );
    return redirect(pending.returnTo, [
      cookieHeader(SESSION_COOKIE, session, SESSION_DAYS * 24 * 60 * 60),
      cookieHeader(OAUTH_COOKIE, "", 0),
    ]);
  }

  return json({ error: "Not found" }, 404);
};
