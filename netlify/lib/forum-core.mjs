// Forum rules and storage, kept separate from Netlify so it can be tested.
// Storage layout (Netlify Blobs store "forum"):
//   thread/<category>/<threadId>  → the topic: title, first post, author, counts
//   reply/<threadId>/<replyId>    → one reply
//   rate/<discordUserId>          → when that member last posted (anti-spam)
// Ids start with the time, so sorting ids sorts by age.
import { randomBytes } from "node:crypto";

export const LIMITS = { title: 120, body: 5000, threadsPerCategory: 200, repliesPerThread: 1000 };
export const POST_COOLDOWN_MS = 15 * 1000;

const CATEGORY_RE = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;
const ID_RE = /^[0-9a-z]{9}[0-9a-f]{8}$/;

export class ForumError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Ids always increase, even for posts made in the same millisecond, so
// sorting ids keeps posts in the order they were made
let lastIdTime = 0;
export function newId(now = Date.now()) {
  const time = Math.max(now, lastIdTime + 1);
  lastIdTime = time;
  return time.toString(36).padStart(9, "0") + randomBytes(4).toString("hex");
}

function idTime(id) {
  return parseInt(id.slice(0, 9), 36);
}

function checkCategory(cat) {
  if (!CATEGORY_RE.test(String(cat || ""))) throw new ForumError(400, "Unknown forum category.");
  return cat;
}

function checkId(id, what = "post") {
  if (!ID_RE.test(String(id || ""))) throw new ForumError(404, `That ${what} doesn't exist.`);
  return id;
}

function cleanText(value, max, label, min = 1) {
  const text = String(value ?? "").replace(/\r\n?/g, "\n").trim();
  if (text.length < min) throw new ForumError(400, `Please write a ${label}.`);
  if (text.length > max) throw new ForumError(400, `Your ${label} is too long (${max} characters max).`);
  return text;
}

function requirePoster(user) {
  if (!user) throw new ForumError(401, "Log in with Discord to post.");
  if (!user.member) throw new ForumError(403, "Only members of the Ultima Warriors Discord can post. Join the server, then log in again.");
}

function author(user) {
  return { id: user.id, name: user.name, avatar: user.avatar };
}

async function enforceCooldown(store, user, now) {
  if (user.isMod) return;
  const last = await store.get(`rate/${user.id}`, { type: "json" });
  if (last && now - last.at < POST_COOLDOWN_MS) {
    const wait = Math.ceil((POST_COOLDOWN_MS - (now - last.at)) / 1000);
    throw new ForumError(429, `Slow down a little — you can post again in ${wait} seconds.`);
  }
  await store.setJSON(`rate/${user.id}`, { at: now });
}

async function keys(store, prefix) {
  const { blobs } = await store.list({ prefix });
  return blobs.map((b) => b.key);
}

// Topic counts and newest-topic time for each category (one listing, no reads)
export async function stats(store) {
  const categories = {};
  for (const key of await keys(store, "thread/")) {
    const [, cat, id] = key.split("/");
    const entry = (categories[cat] ||= { threads: 0, latest: 0 });
    entry.threads += 1;
    entry.latest = Math.max(entry.latest, idTime(id));
  }
  return { categories };
}

export async function listThreads(store, cat) {
  checkCategory(cat);
  const ids = (await keys(store, `thread/${cat}/`)).sort().reverse().slice(0, LIMITS.threadsPerCategory);
  const threads = (await Promise.all(ids.map((k) => store.get(k, { type: "json" })))).filter(Boolean);
  // Most recently active first; ties go to the newer topic
  threads.sort((a, b) => b.lastActivity - a.lastActivity || (a.id < b.id ? 1 : -1));
  return { threads: threads.map(({ body, ...summary }) => summary) };
}

export async function getThread(store, cat, threadId) {
  checkCategory(cat);
  checkId(threadId, "topic");
  const thread = await store.get(`thread/${cat}/${threadId}`, { type: "json" });
  if (!thread) throw new ForumError(404, "That topic doesn't exist (it may have been deleted).");
  const replyKeys = (await keys(store, `reply/${threadId}/`)).sort().slice(0, LIMITS.repliesPerThread);
  const replies = (await Promise.all(replyKeys.map((k) => store.get(k, { type: "json" })))).filter(Boolean);
  return { thread: { ...thread, replyCount: replies.length }, replies };
}

export async function createThread(store, user, input, now = Date.now()) {
  requirePoster(user);
  const cat = checkCategory(input?.category);
  const title = cleanText(input?.title, LIMITS.title, "title", 3);
  const body = cleanText(input?.body, LIMITS.body, "message");
  await enforceCooldown(store, user, now);
  const id = newId(now);
  const at = idTime(id); // same as now, nudged forward if two posts share a millisecond
  const thread = {
    id, category: cat, title, body, author: author(user),
    createdAt: at, lastActivity: at, replyCount: 0,
  };
  await store.setJSON(`thread/${cat}/${thread.id}`, thread);
  return { thread };
}

export async function createReply(store, user, input, now = Date.now()) {
  requirePoster(user);
  const cat = checkCategory(input?.category);
  const threadId = checkId(input?.threadId, "topic");
  const body = cleanText(input?.body, LIMITS.body, "reply");
  const key = `thread/${cat}/${threadId}`;
  const thread = await store.get(key, { type: "json" });
  if (!thread) throw new ForumError(404, "That topic doesn't exist (it may have been deleted).");
  await enforceCooldown(store, user, now);
  const id = newId(now);
  const at = idTime(id);
  const reply = { id, threadId, body, author: author(user), createdAt: at };
  await store.setJSON(`reply/${threadId}/${reply.id}`, reply);
  await store.setJSON(key, { ...thread, lastActivity: at, replyCount: (thread.replyCount || 0) + 1 });
  return { reply };
}

export async function deletePost(store, user, input) {
  if (!user) throw new ForumError(401, "Log in to delete posts.");
  const cat = checkCategory(input?.category);
  const threadId = checkId(input?.threadId, "topic");
  const key = `thread/${cat}/${threadId}`;
  const thread = await store.get(key, { type: "json" });
  if (!thread) throw new ForumError(404, "That topic doesn't exist (it may have been deleted).");

  if (input?.replyId) {
    const replyKey = `reply/${threadId}/${checkId(input.replyId, "reply")}`;
    const reply = await store.get(replyKey, { type: "json" });
    if (!reply) throw new ForumError(404, "That reply doesn't exist (it may have been deleted).");
    if (reply.author.id !== user.id && !user.isMod) throw new ForumError(403, "You can only delete your own posts.");
    await store.delete(replyKey);
    await store.setJSON(key, { ...thread, replyCount: Math.max(0, (thread.replyCount || 1) - 1) });
    return { deleted: "reply" };
  }

  if (thread.author.id !== user.id && !user.isMod) throw new ForumError(403, "You can only delete your own topics.");
  const replyKeys = await keys(store, `reply/${threadId}/`);
  await Promise.all(replyKeys.map((k) => store.delete(k)));
  await store.delete(key);
  return { deleted: "thread" };
}
