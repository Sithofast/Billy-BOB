# Ultima Warriors — Community Hub

The central website for all of the Ultima Warriors gaming communities. Our Discord
([discord.gg/ultimawarriors](https://discord.gg/ultimawarriors)) is home base.

It's a plain static site — just `index.html`, `styles.css`, and `script.js`. No build step.

## Editing the site

- **Add or update a community** (YouTube, Twitch, Facebook, etc.): open `script.js` and edit
  the `COMMUNITIES` list at the top. Put the link in `url`. Entries with an empty `url`
  show as "Coming soon".
- **Change the games list**: edit `GAMES` in `script.js`.
- **Change the story, rules, or text**: edit `index.html`.
- **Change colors**: edit the variables at the top of `styles.css`.

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
