# Ultima Warriors — Community Hub

The central website for all of the Ultima Warriors gaming communities. Our Discord
([discord.gg/ultimawarriors](https://discord.gg/ultimawarriors)) is home base.

## What's where

| Folder / file | What it is |
| --- | --- |
| `site/` | The website itself: `index.html` (home), `support.html`, `forum.html`, `styles.css`, `script.js`, `forum.js`, and `assets/` (artwork) |
| `netlify/functions/` | Small server programs Netlify runs: the support form → Discord (`submission-created.js`), the forum (`forum.mjs`), and Discord login (`auth.mjs`) |
| `netlify/lib/` | Code shared by those functions |
| `tests/` | Automated checks (`npm test`) |
| `netlify.toml` | Tells Netlify to publish `site/` and where the functions are |

## Editing the site

All of these are in `site/`:

- **Add or update a community** (YouTube, Twitch, Facebook, etc.): open `script.js` and edit
  the `COMMUNITIES` list at the top. Put the link in `url`. Entries with an empty `url`
  show as "Coming soon".
- **Change the games list**: edit `GAMES` in `script.js`. Each game has a `name`, its official
  website `url`, and a short `about` overview. On the home page, hovering over (or tapping) a game
  shows the overview with buttons to the official website and its forum board. Each game also
  gets its own forum board automatically, with a "New to this game? Visit the official website"
  link (see below).
- **Twitch**: the "On the air" section and the Twitch card follow `TWITCH_CHANNEL` in
  `script.js`. When the channel is live it shows the stream with LIVE badges; when offline it
  plays the latest past broadcast and lists recent ones. Twitch only keeps past broadcasts if
  "Store past broadcasts" is on in the Twitch creator settings.
- **Live Discord widget**: uses `DISCORD_SERVER_ID` in `script.js` (Server Settings → Widget →
  "Enable Server Widget" must be on in Discord).
- **Change the story, rules, or text**: edit `index.html`.
- **Change colors**: edit the variables at the top of `styles.css`.
- **Intro banner**: first-time visitors see a full-screen "Ultima Warriors" intro, with clouds
  drifting across the planet, a glowing atmosphere and the mech floating in front. After it closes
  (and on every later visit) the mech beside the welcome text flies in from the right edge. It only
  shows once per browser. To see it again, add `?intro` to the end of the address
  (or click "Replay intro" in the footer). Its text is in the `intro` section of `index.html`.
- **Artwork**: the realistic space background, intro banner and mech images live in
  `site/assets/`. Replace a file there (same name) to swap the picture.

## Forum (`forum.html`)

Boards are **General** plus one for each game in `GAMES`. Anyone can read. Members log in with
Discord, and only members of the Ultima Warriors Discord server can post or reply. Members can
delete their own posts; moderators can delete anything. There's a 15-second wait between posts
to stop spam. Posts are stored in Netlify Blobs (free, built into Netlify).

Note: if you rename or remove a game in `GAMES`, its board's address changes and its old topics
are hidden (not deleted). Rename it back to bring them back.

**One-time setup:**

1. **Create a Discord app** at https://discord.com/developers/applications → **New Application**
   (name it "Ultima Warriors"). Open **OAuth2**:
   - Copy the **Client ID**.
   - Click **Reset Secret** and copy the **Client Secret**.
   - Under **Redirects**, add `https://ultimawarriors.netlify.app/api/auth/callback`
     (use your own address if it's different) and save.
2. **In Netlify → Site configuration → Environment variables**, add (all scopes):
   - `DISCORD_CLIENT_ID` — the Client ID
   - `DISCORD_CLIENT_SECRET` — the Client Secret
   - `SESSION_SECRET` — a long random password (40+ characters) used to sign logins.
     Changing it later logs everyone out.
   - `FORUM_MOD_IDS` — Discord user IDs of moderators, separated by commas. (Discord: Settings →
     Advanced → Developer Mode on, then right-click / long-press your name → Copy User ID.)
   - Optional: `DISCORD_SERVER_ID` if the server ever changes (defaults to the Ultima Warriors server).
3. **Deploys → Trigger deploy** so the new settings take effect.

## Support page (`support.html`)

- **FAQ**: edit the `FAQS` list near the top of `script.js`.
- **Public email (optional)**: put an address in `SUPPORT_EMAIL` in `script.js` to show it on the
  page. Leave it empty to only use the contact form (keeps your inbox away from spam bots).
- **Contact form**: handled by Netlify Forms (100 messages a month on the free plan).
  1. In Netlify: **Forms** → **Enable form detection**.
  2. To get each message by email: **Site configuration → Notifications → Form submission
     notifications → Add notification → Email notification**.
  3. **Messages in Discord**: `netlify/functions/submission-created.js` posts every support
     message into a Discord channel. In Discord: channel settings → **Integrations → Webhooks →
     New Webhook → Copy Webhook URL**. In Netlify: environment variable
     `DISCORD_SUPPORT_WEBHOOK_URL` = that URL, then redeploy.

## Deploying

Netlify is linked to this GitHub repository and publishes the `main` branch automatically:
every change merged into `main` goes live within a minute or two. Pull requests get a preview
link from Netlify before they're merged.

## Running the checks

```sh
npm install
npm test
```

## Preview locally

The pages work from any static server, e.g. `python3 -m http.server 8000` inside `site/`, then
visit http://localhost:8000. (The forum, login and support form only work on Netlify, because
they need the server functions.)
