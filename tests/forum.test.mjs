import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { handle } from "../netlify/functions/forum.mjs";
import { memoryStore, sessionCookie, SECRET, MEMBER, OTHER, OUTSIDER, MOD } from "./helpers.mjs";

const SITE = "https://ultimawarriors.netlify.app";
let store;

beforeEach(() => {
  store = memoryStore();
  process.env.SESSION_SECRET = SECRET;
  process.env.FORUM_MOD_IDS = "999";
});

function get(path) {
  return handle(new Request(`${SITE}/api/forum/${path}`), path.split("?")[0], store);
}

function post(action, body, user, headers = {}) {
  return handle(
    new Request(`${SITE}/api/forum/${action}`, {
      method: "POST",
      headers: {
        origin: SITE,
        "content-type": "application/json",
        ...(user ? { cookie: sessionCookie(user) } : {}),
        ...headers,
      },
      body: JSON.stringify(body),
    }),
    action,
    store
  );
}

async function rejects(promise, status, pattern) {
  await assert.rejects(promise, (err) => {
    assert.equal(err.status, status);
    if (pattern) assert.match(err.message, pattern);
    return true;
  });
}

test("members can start a topic, others can read it", async () => {
  const { thread } = await post("threads", { category: "eve-online", title: "  Mining op tonight? ", body: "Who's in?" }, MEMBER);
  assert.equal(thread.title, "Mining op tonight?");
  assert.equal(thread.author.name, "Dad");

  const list = await get("threads?category=eve-online");
  assert.equal(list.threads.length, 1);
  assert.equal(list.threads[0].body, undefined, "list omits the post body");

  const stats = await get("stats");
  assert.equal(stats.categories["eve-online"].threads, 1);
});

test("replies are listed in order and bump the topic", async () => {
  const { thread } = await post("threads", { category: "general", title: "Hello all", body: "First post" }, MEMBER);
  await post("replies", { category: "general", threadId: thread.id, body: "Welcome!" }, OTHER);
  await post("replies", { category: "general", threadId: thread.id, body: "Glad to be here" }, MOD);
  const view = await get(`thread?category=general&id=${thread.id}`);
  assert.deepEqual(view.replies.map((r) => r.body), ["Welcome!", "Glad to be here"]);
  assert.equal(view.thread.replyCount, 2);
});

test("topics are sorted by latest activity", async () => {
  const a = await post("threads", { category: "general", title: "Older topic", body: "a" }, MEMBER);
  await post("threads", { category: "general", title: "Newer topic", body: "b" }, OTHER);
  await post("replies", { category: "general", threadId: a.thread.id, body: "bump" }, MOD);
  const { threads } = await get("threads?category=general");
  assert.deepEqual(threads.map((t) => t.title), ["Older topic", "Newer topic"]);
});

test("logged-out visitors and non-members can't post", async () => {
  await rejects(post("threads", { category: "general", title: "Hi there", body: "x" }, null), 401, /Log in/);
  await rejects(post("threads", { category: "general", title: "Hi there", body: "x" }, OUTSIDER), 403, /Only members/);
});

test("forged or tampered login cookies are ignored", async () => {
  const forged = sessionCookie(MEMBER).replace(/.$/, (c) => (c === "A" ? "B" : "A"));
  await rejects(post("threads", { category: "general", title: "Hi there", body: "x" }, null, { cookie: forged }), 401);
  process.env.SESSION_SECRET = "a-different-secret";
  await rejects(post("threads", { category: "general", title: "Hi there", body: "x" }, MEMBER), 401);
});

test("posts from other websites are refused", async () => {
  await rejects(post("threads", { category: "general", title: "Hi there", body: "x" }, MEMBER, { origin: "https://evil.example" }), 403);
  await rejects(post("threads", { category: "general", title: "Hi there", body: "x" }, MEMBER, { "content-type": "text/plain" }), 415);
});

test("input is validated", async () => {
  await rejects(post("threads", { category: "../secret", title: "Hello", body: "x" }, MEMBER), 400, /category/);
  await rejects(post("threads", { category: "general", title: "Hi", body: "x" }, MEMBER), 400, /title/);
  await rejects(post("threads", { category: "general", title: "x".repeat(121), body: "x" }, MEMBER), 400, /too long/);
  await rejects(post("threads", { category: "general", title: "Hello", body: "   " }, MEMBER), 400, /message/);
  await rejects(post("replies", { category: "general", threadId: "nope", body: "x" }, MEMBER), 404);
  await rejects(get("thread?category=general&id=../../rate/111"), 404);
});

test("members must wait between posts (mods don't)", async () => {
  const { thread } = await post("threads", { category: "general", title: "Topic one", body: "x" }, MEMBER);
  await rejects(post("replies", { category: "general", threadId: thread.id, body: "again" }, MEMBER), 429, /Slow down/);
  await post("replies", { category: "general", threadId: thread.id, body: "mod 1" }, MOD);
  await post("replies", { category: "general", threadId: thread.id, body: "mod 2" }, MOD);
});

test("members can delete only their own posts; mods can delete anything", async () => {
  const { thread } = await post("threads", { category: "general", title: "Delete test", body: "x" }, MEMBER);
  const { reply } = await post("replies", { category: "general", threadId: thread.id, body: "mine" }, OTHER);
  await rejects(post("delete", { category: "general", threadId: thread.id }, OTHER), 403);
  await rejects(post("delete", { category: "general", threadId: thread.id, replyId: reply.id }, MEMBER), 403);
  await post("delete", { category: "general", threadId: thread.id, replyId: reply.id }, OTHER);
  assert.equal((await get(`thread?category=general&id=${thread.id}`)).replies.length, 0);
  await post("delete", { category: "general", threadId: thread.id }, MOD);
  await rejects(get(`thread?category=general&id=${thread.id}`), 404);
});

test("deleting a topic removes its replies too", async () => {
  const { thread } = await post("threads", { category: "general", title: "Cleanup", body: "x" }, MEMBER);
  await post("replies", { category: "general", threadId: thread.id, body: "r1" }, OTHER);
  await post("delete", { category: "general", threadId: thread.id }, MEMBER);
  assert.equal([...store.data.keys()].filter((k) => k.startsWith("reply/")).length, 0);
});
