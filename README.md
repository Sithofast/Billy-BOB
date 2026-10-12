# Ultima Warriors — Community Hub

The central website for all of the Ultima Warriors gaming communities. Our Discord
([discord.gg/ultimawarriors](https://discord.gg/ultimawarriors)) is home base.

It's a plain static site — just `index.html`, `styles.css`, and `script.js`. No build step.

## Editing the site

- **Add or update a community** (YouTube, Twitch, Facebook, etc.): open `script.js` and edit
  the `COMMUNITIES` list at the top. Put the link in `url`. Entries with an empty `url`
  show as "Coming soon".
- **Change the games list**: edit `GAMES` in `script.js`.
- **Twitch**: the "On the air" section and the Twitch card follow `TWITCH_CHANNEL` in
  `script.js`. When the channel is live it shows the stream with LIVE badges; when offline it
  plays the latest past broadcast and lists recent ones. Twitch only keeps past broadcasts if
  "Store past broadcasts" is on in the Twitch creator settings.
- **Turn on the live Discord widget**: in Discord go to Server Settings → Widget, switch on
  "Enable Server Widget", copy the Server ID, and paste it into `DISCORD_SERVER_ID` near the
  top of `script.js`. Until then the widget shows a friendly "coming soon" message.
- **Change the story, rules, or text**: edit `index.html`.
- **Change colors**: edit the variables at the top of `styles.css`.
- **Intro banner**: first-time visitors see a full-screen "Ultima Warriors" intro. It only
  shows once per browser. To see it again, add `?intro` to the end of the address
  (or click "Replay intro" in the footer). Its text is in the `intro` section of `index.html`.
- **Artwork**: the realistic space background, intro banner and mech images live in `assets/`.
  Replace a file there (same name) to swap the picture. See `assets/README.md`.

## Support page (`support.html`)

- **FAQ**: edit the `FAQS` list near the top of `script.js`.
- **Public email (optional)**: put an address in `SUPPORT_EMAIL` in `script.js` to show it on the
  page. Leave it empty to only use the contact form (keeps your inbox away from spam bots).
- **Contact form**: handled by Netlify Forms, free on Netlify (100 messages a month on the free plan).
  1. In Netlify, open your site → **Forms** → **Enable form detection**, then re-upload the site.
     A form called **support** appears there.
  2. To get each message by email: **Site configuration → Notifications → Emails and webhooks →
     Form submission notifications → Add notification → Email notification**.
  3. **Messages in Discord**: `netlify/functions/submission-created.js` posts every support
     message into a Discord channel. In Discord: channel settings → **Integrations → Webhooks →
     New Webhook → Copy Webhook URL**. In Netlify: **Site configuration → Environment variables →
     Add a variable**, key `DISCORD_SUPPORT_WEBHOOK_URL`, value = that URL. Redeploy once.
     (Functions only run when Netlify deploys from GitHub, not from drag-and-drop uploads.)
  The form only sends on the live Netlify site; testing locally shows the "didn't send" message.

## Preview locally

Open `index.html` in a browser, or run:

```sh
python3 -m http.server 8000
```

then visit http://localhost:8000.

## Deploying (Netlify, linked to GitHub)

The site deploys automatically from this GitHub repository: every change pushed to the
production branch goes live within a minute or two. `netlify.toml` tells Netlify there's no build
step and where the functions live.

## Publish for free with GitHub Pages (alternative)

1. On GitHub, go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Pick the branch (e.g. `main`) and the `/ (root)` folder, then **Save**.
4. After a minute your site will be live at `https://<your-username>.github.io/<repo-name>/`.
