// Forum API used by forum.html. Anyone can read; members of the Ultima
// Warriors Discord (logged in via /api/auth/login) can post and reply.
//   GET  /api/forum/stats                         topic counts per category
//   GET  /api/forum/threads?category=…            topics in a category
//   GET  /api/forum/thread?category=…&id=…        one topic with its replies
//   POST /api/forum/threads   {category,title,body}
//   POST /api/forum/replies   {category,threadId,body}
//   POST /api/forum/delete    {category,threadId,replyId?}
import { getStore } from "@netlify/blobs";
import { currentUser, json } from "../lib/session.mjs";
import * as forum from "../lib/forum-core.mjs";

export const config = { path: "/api/forum/:action" };

const MAX_BODY_BYTES = 20000;

export async function handle(req, action, store) {
  const url = new URL(req.url);
  const user = currentUser(req);

  if (req.method === "GET") {
    const q = url.searchParams;
    if (action === "stats") return forum.stats(store);
    if (action === "threads") return forum.listThreads(store, q.get("category"));
    if (action === "thread") return forum.getThread(store, q.get("category"), q.get("id"));
    throw new forum.ForumError(404, "Not found");
  }

  if (req.method !== "POST") throw new forum.ForumError(405, "Method not allowed");
  // Only accept posts sent by this website's own pages
  if (req.headers.get("origin") !== url.origin) throw new forum.ForumError(403, "Posts must come from the forum page.");
  if (!String(req.headers.get("content-type") || "").includes("application/json")) {
    throw new forum.ForumError(415, "Expected JSON");
  }
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) throw new forum.ForumError(413, "That post is too long.");
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    throw new forum.ForumError(400, "Invalid request");
  }
  if (action === "threads") return forum.createThread(store, user, input);
  if (action === "replies") return forum.createReply(store, user, input);
  if (action === "delete") return forum.deletePost(store, user, input);
  throw new forum.ForumError(404, "Not found");
}

export default async (req, context) => {
  try {
    const store = getStore({ name: "forum", consistency: "strong" });
    return json(await handle(req, context.params?.action, store));
  } catch (err) {
    if (err instanceof forum.ForumError) return json({ error: err.message }, err.status);
    console.error("Forum error:", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
};
