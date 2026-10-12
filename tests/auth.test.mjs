import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import auth from "../netlify/functions/auth.mjs";
import { SECRET } from "./helpers.mjs";

const SITE = "https://ultimawarriors.netlify.app";
const realFetch = global.fetch;

beforeEach(() => {
  Object.assign(process.env, {
    DISCORD_CLIENT_ID: "client123",
    DISCORD_CLIENT_SECRET: "shh",
    SESSION_SECRET: SECRET,
    FORUM_MOD_IDS: "555",
  });
  global.fetch = realFetch;
});

const call = (path, headers = {}) =>
  auth(new Request(`${SITE}/api/auth/${path}`, { headers }), { params: { action: path.split("?")[0] } });

function cookiesFrom(res) {
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

function fakeDiscord({ inServer }) {
  global.fetch = async (url, opts) => {
    if (url.endsWith("/oauth2/token")) {
      assert.equal(opts.body.get("redirect_uri"), `${SITE}/api/auth/callback`);
      assert.equal(opts.body.get("code"), "abc");
      return Response.json({ access_token: "tok" });
    }
    if (url.endsWith("/users/@me")) return Response.json({ id: "555", username: "harebrn", global_name: "Harebrn", avatar: "hash1" });
    if (url.endsWith("/users/@me/guilds")) return Response.json(inServer ? [{ id: "1" }, { id: "969042661656915968" }] : [{ id: "1" }]);
    throw new Error(`unexpected fetch ${url}`);
  };
}

async function fullLogin(inServer) {
  fakeDiscord({ inServer });
  const login = await call("login?return=/forum.html%23/c/general");
  assert.equal(login.status, 302);
  const to = new URL(login.headers.get("location"));
  assert.equal(to.origin, "https://discord.com");
  assert.equal(to.searchParams.get("client_id"), "client123");
  assert.equal(to.searchParams.get("scope"), "identify guilds");
  const state = to.searchParams.get("state");
  const cb = await call(`callback?code=abc&state=${state}`, { cookie: cookiesFrom(login) });
  assert.equal(cb.status, 302);
  assert.equal(cb.headers.get("location"), "/forum.html#/c/general");
  const me = await (await call("me", { cookie: cookiesFrom(cb) })).json();
  return me;
}

test("server members log in and can post", async () => {
  const me = await fullLogin(true);
  assert.equal(me.user.name, "Harebrn");
  assert.equal(me.user.member, true);
  assert.equal(me.user.isMod, true);
  assert.equal(me.user.avatar, "https://cdn.discordapp.com/avatars/555/hash1.png?size=64");
});

test("people outside the server log in as non-members", async () => {
  const me = await fullLogin(false);
  assert.equal(me.user.member, false);
});

test("callback with a wrong or missing state is rejected", async () => {
  fakeDiscord({ inServer: true });
  const login = await call("login");
  const res = await call("callback?code=abc&state=wrong", { cookie: cookiesFrom(login) });
  assert.equal(res.status, 400);
  assert.equal((await call("callback?code=abc&state=x")).status, 400);
});

test("logout clears the cookie and only redirects within the site", async () => {
  const res = await call("logout?return=https://evil.example");
  assert.equal(res.headers.get("location"), "/forum.html");
  assert.match(res.headers.getSetCookie()[0], /uw_session=;.*Max-Age=0/);
  assert.equal((await call("logout?return=//evil.example")).headers.get("location"), "/forum.html");
});

test("me reports not configured when Discord app settings are missing", async () => {
  delete process.env.DISCORD_CLIENT_SECRET;
  const me = await (await call("me")).json();
  assert.equal(me.configured, false);
  assert.equal(me.user, null);
  assert.equal((await call("login")).status, 503);
});
