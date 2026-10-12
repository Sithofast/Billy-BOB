import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const fn = require("../netlify/functions/submission-created.js");
const realFetch = global.fetch;
let calls;

beforeEach(() => {
  calls = [];
  process.env.DISCORD_SUPPORT_WEBHOOK_URL = " https://discord.com/api/webhooks/123/abc\n";
  global.fetch = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) });
    return { ok: true, status: 204, text: async () => "" };
  };
});
afterEach(() => { global.fetch = realFetch; });

const submission = (data, form_name = "support") => ({ body: JSON.stringify({ payload: { form_name, data } }) });

test("support messages are posted to Discord without pings", async () => {
  const res = await fn.handler(submission({ name: "A", email: "a@example.com", topic: "Report a member", message: "@everyone help" }));
  assert.equal(res.statusCode, 200);
  assert.equal(calls[0].url, "https://discord.com/api/webhooks/123/abc", "pasted whitespace is removed");
  assert.deepEqual(calls[0].body.allowed_mentions, { parse: [] });
  assert.equal(calls[0].body.embeds[0].color, 0xeb0400);
});

test("long messages are trimmed and empty fields show a dash", async () => {
  await fn.handler(submission({ name: "A", email: "a@example.com", message: "x".repeat(6000) }));
  const embed = calls[0].body.embeds[0];
  assert.ok(embed.description.length <= 4000);
  assert.equal(embed.fields.find((f) => f.name === "Discord").value, "—");
});

test("other forms and missing settings are skipped safely", async () => {
  await fn.handler(submission({ message: "hi" }, "newsletter"));
  delete process.env.DISCORD_SUPPORT_WEBHOOK_URL;
  const res = await fn.handler(submission({ message: "hi" }));
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 0);
});

test("the webhook token never appears in logs", () => {
  const line = fn.describeWebhookUrl("https://discord.com/api/webhooks/1/SECRETTOKEN");
  assert.ok(!line.includes("SECRETTOKEN"));
});
