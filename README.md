# Ultima Warriors — Community Hub

The central website for all of the Ultima Warriors gaming communities. Our Discord
([discord.gg/ultimawarriors](https://discord.gg/ultimawarriors)) is home base.

It's a plain static site — just `index.html`, `styles.css`, and `script.js`. No build step.

## Editing the site

- **Add or update a community** (YouTube, Twitch, Facebook, etc.): open `script.js` and edit
  the `COMMUNITIES` list at the top. Put the link in `url`. Entries with an empty `url`
  show as "Coming soon".
- **Change the games list**: edit `GAMES` in `script.js`.
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

## Preview locally

Open `index.html` in a browser, or run:

```sh
python3 -m http.server 8000
```

then visit http://localhost:8000.

## Publish for free with GitHub Pages

1. On GitHub, go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Pick the branch (e.g. `main`) and the `/ (root)` folder, then **Save**.
4. After a minute your site will be live at `https://<your-username>.github.io/<repo-name>/`.
