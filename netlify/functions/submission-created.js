// Runs automatically on Netlify every time a form is submitted (Netlify calls
// any function named "submission-created" after a submission passes its spam
// checks). It posts support messages into a Discord channel.
//
// Setup: in Netlify, add an environment variable named DISCORD_SUPPORT_WEBHOOK_URL
// containing the webhook URL from Discord (Channel settings → Integrations → Webhooks).

const TOPIC_COLORS = {
  "Report a member": 0xeb0400,
  "Website problem": 0xff8a3d,
  "Streaming or partnership": 0x9146ff,
};
const DEFAULT_COLOR = 0x3ee0ff;

// Discord rejects embeds with fields that are empty or too long
function clip(value, max) {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function buildDiscordMessage(payload) {
  const data = payload.data || {};
  const topic = clip(data.topic || "General question", 200);
  return {
    username: "Ultima Warriors Support",
    // Never let text typed into the form ping @everyone, roles, or members
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `New support message: ${topic}`,
        description: clip(data.message, 4000),
        color: TOPIC_COLORS[topic] ?? DEFAULT_COLOR,
        fields: [
          { name: "Name", value: clip(data.name, 256), inline: true },
          { name: "Email", value: clip(data.email, 256), inline: true },
          { name: "Discord", value: clip(data.discord, 256), inline: true },
        ],
        footer: { text: "Sent from the website contact form" },
        timestamp: payload.created_at || new Date().toISOString(),
      },
    ],
  };
}

exports.handler = async (event) => {
  let payload;
  try {
    payload = JSON.parse(event.body).payload;
  } catch {
    return { statusCode: 400, body: "Invalid submission payload" };
  }
  if (!payload || payload.form_name !== "support") {
    return { statusCode: 200, body: "Not a support form submission; skipped" };
  }

  const webhookUrl = process.env.DISCORD_SUPPORT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("DISCORD_SUPPORT_WEBHOOK_URL is not set; message saved in Netlify only.");
    return { statusCode: 200, body: "Discord webhook not configured" };
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildDiscordMessage(payload)),
  });
  if (!res.ok) {
    // The message is still saved in Netlify's Forms tab even if Discord fails
    console.error(`Discord webhook failed: ${res.status} ${await res.text()}`);
    return { statusCode: 502, body: "Discord webhook failed" };
  }
  return { statusCode: 200, body: "Posted to Discord" };
};

exports.buildDiscordMessage = buildDiscordMessage;
