// ============================================================
//  EDIT THESE LISTS to update the site — no HTML needed.
// ============================================================

// Your gaming communities. Add, remove, or reorder entries.
// Leave url as "" to show a "Coming soon" card.
const COMMUNITIES = [
  {
    name: "Discord",
    icon: "💬",
    description: "Our main home. Voice chat, game nights, LFG, and good company.",
    url: "https://discord.gg/ultimawarriors",
    cta: "Join the server",
    featured: true,
  },
  {
    name: "YouTube",
    icon: "▶️",
    description: "Highlights, funny moments, and game night recaps.",
    url: "",
    cta: "Watch",
  },
  {
    name: "Twitch",
    icon: "📺",
    description: "Watch Harebrn stream, then hang out in chat.",
    url: "https://twitch.tv/Harebrn",
    cta: "Watch on Twitch",
    twitch: true, // shows his profile picture and a LIVE badge when he's streaming
  },
  {
    name: "Facebook Group",
    icon: "👥",
    description: "News, events, and photos for the whole crew.",
    url: "",
    cta: "Join the group",
  },
  {
    name: "Steam Group",
    icon: "🎮",
    description: "Find us on Steam and join group events.",
    url: "",
    cta: "Join on Steam",
  },
  {
    name: "Xbox / PlayStation",
    icon: "🕹️",
    description: "Console clubs so you can squad up on any platform.",
    url: "",
    cta: "Join the club",
  },
];

// Discord live widget.
// 1. In Discord: Server Settings → Widget → turn on "Enable Server Widget".
// 2. Copy the "Server ID" shown on that page and paste it between the quotes.
const DISCORD_SERVER_ID = "969042661656915968";

// Twitch channel shown in the "On the air" section (just the name after twitch.tv/).
const TWITCH_CHANNEL = "Harebrn";

// Support page: optional public email address. Leave as "" to only show the
// contact form (keeps your inbox safe from spam bots).
const SUPPORT_EMAIL = "";

// Support page FAQ. Add, remove, or edit questions here.
const FAQS = [
  {
    q: "How do I join Ultima Warriors?",
    a: "Click any \"Join Discord\" button or go to discord.gg/ultimawarriors. Once you're in, say hello and check the rules channel.",
  },
  {
    q: "Who is the community for?",
    a: "We're built for older, grown-up gamers who want a laid-back, respectful place to play. If you're friendly and here to have fun, you'll fit right in.",
  },
  {
    q: "Do I need to be good at games?",
    a: "Not at all. Skill level doesn't matter here. Being a good teammate does.",
  },
  {
    q: "How do I report a problem with another member?",
    a: "Message a moderator in the Discord, or use the form below and choose \"Report a member\". Reports are kept private.",
  },
  {
    q: "Can I suggest a game for game night?",
    a: "Yes please! Drop your suggestion in the Discord and we'll add it to the rotation.",
  },
  {
    q: "Something on the website isn't working.",
    a: "Sorry about that! Use the form below and pick \"Website problem\". Tell us what device and browser you're using if you can.",
  },
];

// Games the community plays. Each one gets a forum board, and on the home page
// hovering (or tapping) a game shows its overview and a link to its website.
//   name:  the game's name (also used for its forum board)
//   url:   the game's official website ("" hides the website button)
//   about: one or two sentences for people who don't own it yet
const GAMES = [
  {
    name: "Eve Online",
    url: "https://www.eveonline.com/",
    about: "A huge sci-fi sandbox MMO where thousands of players mine, trade, explore and fight together in one shared universe of star systems.",
  },
  {
    name: "World of Warcraft: Forever",
    url: "https://worldofwarcraft.blizzard.com/en-us/forever",
    about: "Blizzard's new, permanent take on the original World of Warcraft: classic-style adventuring to level 60 with new zones, dungeons and raids. Included with a WoW subscription.",
  },
  {
    name: "Farming Simulator",
    url: "https://www.farming-simulator.com/",
    about: "Run your own farm: grow crops, raise animals and drive hundreds of real-brand tractors and machines, on your own or with friends in co-op.",
  },
  {
    name: "Conan Exiles",
    url: "https://www.conanexiles.com/",
    about: "Open-world survival in the savage lands of Conan the Barbarian: gather, craft, build a stronghold and fight to survive, solo or with friends.",
  },
  {
    name: "Star Wars Galaxies",
    url: "https://swguprising.com/",
    about: "The classic Star Wars MMO, kept alive by fan-run community servers. We play on SWG Uprising.",
  },
];

// ============================================================
//  Site code below — you shouldn't need to edit this.
// ============================================================

function renderCommunities() {
  const grid = document.getElementById("community-grid");
  if (!grid) return;
  grid.innerHTML = "";
  for (const c of COMMUNITIES) {
    const live = Boolean(c.url);
    const card = document.createElement(live ? "a" : "div");
    card.className = "card" + (c.featured ? " card-featured" : "") + (live ? "" : " card-soon");
    if (live) {
      card.href = c.url;
      card.target = "_blank";
      card.rel = "noopener";
    }
    const icon = document.createElement("div");
    icon.className = "card-icon";
    icon.textContent = c.icon;
    const title = document.createElement("h3");
    title.textContent = c.name;
    const desc = document.createElement("p");
    desc.textContent = c.description;
    const action = document.createElement("span");
    action.className = "card-cta";
    action.textContent = live ? `${c.cta} →` : "Coming soon";
    card.append(icon, title, desc, action);
    if (c.twitch) {
      card.classList.add("card-twitch");
      icon.classList.add("twitch-avatar-slot");
      const liveBadge = document.createElement("span");
      liveBadge.className = "live-badge";
      liveBadge.textContent = "Live";
      card.append(liveBadge);
    }
    if (c.featured) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Home base";
      card.prepend(badge);
    }
    grid.append(card);
  }
}

// "World of Warcraft: Forever" → "world-of-warcraft-forever" (forum board address)
function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}

// Opens the card to the left if it would run off the right edge of the screen
function placeGameCard(li) {
  const card = li.querySelector(".game-card");
  li.classList.remove("align-right");
  const right = li.getBoundingClientRect().left + card.offsetWidth;
  if (right > document.documentElement.clientWidth - 12) li.classList.add("align-right");
}

// Accepts either a plain name ("Eve Online") or a full game entry
function gameInfo(game) {
  return typeof game === "string" ? { name: game, url: "", about: "" } : { url: "", about: "", ...game };
}

function renderGames() {
  const list = document.getElementById("game-list");
  if (!list) return;
  list.innerHTML = "";
  GAMES.map(gameInfo).forEach((game, i) => {
    const li = document.createElement("li");
    li.className = "game-chip";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "game-chip-btn";
    toggle.textContent = game.name;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", `game-card-${i}`);

    const card = document.createElement("div");
    card.className = "game-card";
    card.id = `game-card-${i}`;
    const title = document.createElement("strong");
    title.textContent = game.name;
    card.append(title);
    if (game.about) {
      const about = document.createElement("p");
      about.textContent = game.about;
      card.append(about);
    }
    const actions = document.createElement("div");
    actions.className = "game-card-actions";
    if (game.url) {
      const site = document.createElement("a");
      site.className = "btn btn-small game-site";
      site.href = game.url;
      site.target = "_blank";
      site.rel = "noopener";
      site.textContent = "Official website ↗";
      actions.append(site);
    }
    const forum = document.createElement("a");
    forum.href = `forum.html#/c/${slugify(game.name)}`;
    forum.textContent = "Forum board →";
    actions.append(forum);
    card.append(actions);

    // Hover shows the card on computers; tapping/clicking toggles it (phones, keyboards)
    toggle.addEventListener("click", () => {
      placeGameCard(li);
      const open = !li.classList.contains("open");
      list.querySelectorAll(".game-chip.open").forEach((other) => {
        other.classList.remove("open");
        other.querySelector(".game-chip-btn").setAttribute("aria-expanded", "false");
      });
      li.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    li.addEventListener("mouseenter", () => placeGameCard(li));
    toggle.addEventListener("focus", () => placeGameCard(li));
    li.append(toggle, card);
    list.append(li);
  });
  // Close an open card when clicking elsewhere or pressing Escape
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".game-chip")) list.querySelectorAll(".game-chip.open").forEach((li) => {
      li.classList.remove("open");
      li.querySelector(".game-chip-btn").setAttribute("aria-expanded", "false");
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") list.querySelectorAll(".game-chip.open").forEach((li) => {
      li.classList.remove("open");
      li.querySelector(".game-chip-btn").setAttribute("aria-expanded", "false");
    });
  });
}

function setupNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function setupCopy() {
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = "Copied!";
      } catch {
        btn.textContent = "Copy failed";
      }
      setTimeout(() => (btn.textContent = "Copy link"), 1800);
    });
  });
}

// Hide any artwork image that fails to load instead of showing a broken icon.
function hideMissingImages() {
  document.querySelectorAll("img").forEach((img) => {
    const hide = () => (img.style.visibility = "hidden");
    if (img.complete && img.naturalWidth === 0) hide();
    else img.addEventListener("error", hide);
  });
}

function setupIntro() {
  const intro = document.getElementById("intro");
  const root = document.documentElement;
  if (!intro) {
    root.classList.remove("show-intro");
    return;
  }
  if (!root.classList.contains("show-intro")) {
    intro.remove();
    return;
  }
  const enter = intro.querySelector(".intro-enter");
  const close = () => {
    if (intro.classList.contains("closing")) return;
    intro.classList.add("closing");
    try { localStorage.setItem("uw-intro-seen", "1"); } catch {}
    document.removeEventListener("keydown", onKey);
    setTimeout(() => {
      root.classList.remove("show-intro");
      intro.remove();
    }, 700);
  };
  const onKey = (e) => {
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      close();
    }
  };
  intro.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  enter.focus({ preventScroll: true });
}

function startStarfield() {
  const canvas = document.getElementById("stars");
  const backdrop = document.querySelector(".space-bg");
  const ctx = canvas.getContext("2d");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let stars = [];
  let width = 0;
  let height = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round((width * height) / 5000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      depth: Math.random() * 0.8 + 0.2,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  // Scrolling moves near stars faster than far ones, and nudges the space
  // photo a little, so the background feels deep and continuous.
  function parallax() {
    if (reduceMotion) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
    const range = window.innerHeight * 0.08;
    backdrop.style.transform = `translateY(${range - 2 * range * progress}px)`;
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    const scroll = reduceMotion ? 0 : window.scrollY;
    for (const s of stars) {
      if (!reduceMotion) {
        s.y += s.depth * 0.08;
        if (s.y > height) {
          s.y = 0;
          s.x = Math.random() * width;
        }
      }
      const y = (((s.y - scroll * s.depth * 0.35) % height) + height) % height;
      const twinkle = 0.5 + 0.5 * Math.sin(s.phase + time * 0.002 * s.depth);
      ctx.globalAlpha = 0.2 + 0.7 * twinkle * s.depth;
      ctx.fillStyle = s.depth > 0.85 ? "#bfe9ff" : "#ffffff";
      const size = s.depth * 1.6;
      ctx.fillRect(s.x, y, size, size);
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  window.addEventListener("resize", () => {
    resize();
    parallax();
    if (reduceMotion) draw(0);
  });
  window.addEventListener("scroll", parallax, { passive: true });
  resize();
  parallax();
  if (reduceMotion) draw(0);
  else requestAnimationFrame(draw);
}

// ---------- Discord live widget ----------
const STATUS_LABELS = { online: "Online", idle: "Away", dnd: "Do not disturb" };

function memberRow(member) {
  const li = document.createElement("li");
  li.className = "dw-member";
  const avatar = document.createElement("span");
  avatar.className = "dw-avatar";
  avatar.textContent = (member.username || "?").charAt(0).toUpperCase();
  if (member.avatar_url) {
    const img = document.createElement("img");
    img.src = member.avatar_url;
    img.alt = "";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => img.remove());
    avatar.append(img);
  }
  const status = document.createElement("span");
  status.className = `dw-status dw-status-${member.status || "online"}`;
  status.title = STATUS_LABELS[member.status] || "Online";
  avatar.append(status);

  const text = document.createElement("span");
  text.className = "dw-member-text";
  const name = document.createElement("span");
  name.className = "dw-member-name";
  name.textContent = member.username || "Member";
  text.append(name);
  if (member.game && member.game.name) {
    const game = document.createElement("span");
    game.className = "dw-member-game";
    game.textContent = `Playing ${member.game.name}`;
    text.append(game);
  }
  li.append(avatar, text);
  return li;
}

function renderDiscordWidget(data) {
  const body = document.getElementById("dw-body");
  const members = data.members || [];
  const online = data.presence_count ?? members.length;
  const inVoice = members.filter((m) => m.channel_id);
  document.getElementById("discord-widget").classList.add("is-live");

  document.getElementById("dw-name").textContent = data.name || "Ultima Warriors";
  document.getElementById("dw-count").textContent = `${online} online`;
  document.getElementById("dw-online").textContent = online;
  document.getElementById("dw-voice").textContent = inVoice.length;
  if (data.instant_invite) document.getElementById("dw-join").href = data.instant_invite;

  body.innerHTML = "";

  // Voice channels that have people in them
  const channels = (data.channels || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((ch) => ({ ...ch, people: inVoice.filter((m) => m.channel_id === ch.id) }))
    .filter((ch) => ch.people.length);
  // People in voice channels Discord doesn't name (private channels) go in one group
  const known = new Set(channels.map((ch) => ch.id));
  const unnamed = inVoice.filter((m) => !known.has(m.channel_id));
  if (unnamed.length) channels.push({ name: "Voice chat", people: unnamed });
  if (channels.length) {
    const heading = document.createElement("h3");
    heading.className = "dw-heading";
    heading.textContent = "In voice";
    body.append(heading);
    for (const ch of channels) {
      const group = document.createElement("div");
      group.className = "dw-channel";
      const title = document.createElement("div");
      title.className = "dw-channel-name";
      title.textContent = `🔊 ${ch.name}`;
      const list = document.createElement("ul");
      list.className = "dw-list";
      ch.people.forEach((m) => list.append(memberRow(m)));
      group.append(title, list);
      body.append(group);
    }
  }

  const heading = document.createElement("h3");
  heading.className = "dw-heading";
  heading.textContent = `Online — ${online}`;
  body.append(heading);
  if (members.length) {
    const list = document.createElement("ul");
    list.className = "dw-list";
    members.forEach((m) => list.append(memberRow(m)));
    body.append(list);
  } else {
    const empty = document.createElement("p");
    empty.className = "dw-message";
    empty.textContent = "It's quiet right now — be the first to log on!";
    body.append(empty);
  }
}

function showWidgetMessage(text) {
  document.getElementById("discord-widget").classList.remove("is-live");
  document.getElementById("dw-body").innerHTML = "";
  const p = document.createElement("p");
  p.className = "dw-message";
  p.textContent = text;
  document.getElementById("dw-body").append(p);
}

async function loadDiscordWidget() {
  if (!DISCORD_SERVER_ID) {
    showWidgetMessage("Live member list coming soon. Hop into the Discord to see who's around!");
    return;
  }
  try {
    const res = await fetch(`https://discord.com/api/guilds/${encodeURIComponent(DISCORD_SERVER_ID)}/widget.json`);
    if (!res.ok) throw new Error(`Discord returned ${res.status}`);
    renderDiscordWidget(await res.json());
  } catch (err) {
    console.warn("Discord widget unavailable:", err);
    showWidgetMessage("Couldn't reach Discord right now. Hop into the server to see who's around!");
  }
}

function startDiscordWidget() {
  if (!document.getElementById("discord-widget")) return;
  loadDiscordWidget();
  if (DISCORD_SERVER_ID) setInterval(loadDiscordWidget, 60000); // refresh every minute
}

// ---------- Twitch: profile, live status, player and past streams ----------
// Profile picture, stream title, game and past streams come from decapi.me, a
// free public helper for Twitch info. Twitch's own player reports live/offline.
const twitch = { live: null, player: null, replays: [], picked: false };

function twitchInfo(path, query = "") {
  return fetch(`https://decapi.me/twitch/${path}/${encodeURIComponent(TWITCH_CHANNEL)}${query}`)
    .then((res) => (res.ok ? res.text() : ""))
    .then((text) => text.trim())
    .catch(() => "");
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setTwitchLive(isLive) {
  if (twitch.live === isLive) return;
  twitch.live = isLive;
  document.querySelectorAll(".card-twitch, #stream, .nav-stream").forEach((el) =>
    el.classList.toggle("is-live", isLive)
  );
  setText("tw-status", isLive ? "Live now" : "Offline");
  if (isLive) {
    twitchInfo("title").then((t) => setText("tw-title", t));
    twitchInfo("game").then((g) => setText("tw-game", g ? `Playing ${g}` : ""));
    if (twitch.player && !twitch.picked) watchLive();
  } else {
    setText("tw-game", "");
    offlineMessage();
    playLatestReplay();
  }
  renderReplays();
}

function offlineMessage() {
  if (twitch.live !== false) return;
  setText("tw-title", twitch.replays.length
    ? "Not live right now — catch up on his past streams below."
    : "Not live right now — follow on Twitch to catch the next stream.");
}

function showTwitchAvatar(url) {
  if (!/^https:\/\//.test(url)) return; // decapi returns an error message instead of a URL if something's wrong
  document.querySelectorAll(".twitch-avatar-slot, #tw-avatar").forEach((slot) => {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("load", () => slot.classList.add("has-img"));
    img.addEventListener("error", () => img.remove());
    slot.append(img);
  });
}

// decapi lists videos as "Title - https://www.twitch.tv/videos/123" entries
function parseReplays(text) {
  const found = [];
  const pattern = /(?:^|\n|\s\|\s)\s*(.*?)\s+-\s+(https?:\/\/(?:www\.)?twitch\.tv\/videos\/(\d+))/g;
  let m;
  while ((m = pattern.exec(text))) found.push({ title: m[1] || "Past stream", url: m[2], id: m[3] });
  return found;
}

function watchLive() {
  if (!twitch.player) return;
  twitch.player.setChannel(TWITCH_CHANNEL);
  twitch.current = "live";
  setText("tw-now", "Now showing: live stream");
  renderReplays();
}

function watchReplay(replay) {
  if (!twitch.player) return;
  twitch.player.setVideo(`v${replay.id}`, 0);
  twitch.current = replay.id;
  setText("tw-now", `Now showing replay: ${replay.title}`);
  renderReplays();
}

function playLatestReplay() {
  if (twitch.live === false && !twitch.picked && twitch.player && twitch.replays.length && twitch.current !== twitch.replays[0].id) {
    watchReplay(twitch.replays[0]);
  }
}

function renderReplays() {
  const list = document.getElementById("tw-replays");
  if (!list) return;
  list.innerHTML = "";
  const items = [];
  if (twitch.live) items.push({ live: true, title: "Watch live now", url: `https://twitch.tv/${TWITCH_CHANNEL}` });
  items.push(...twitch.replays);
  if (!items.length) {
    const p = document.createElement("p");
    p.className = "tw-empty";
    p.textContent = "No past streams to show yet.";
    list.append(p);
    return;
  }
  for (const item of items) {
    const a = document.createElement("a");
    a.className = "tw-replay" + (item.live ? " tw-replay-live" : "");
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener";
    if ((item.live && twitch.current === "live") || item.id === twitch.current) a.classList.add("is-playing");
    const icon = document.createElement("span");
    icon.className = "tw-replay-icon";
    icon.textContent = item.live ? "●" : "▶";
    const title = document.createElement("span");
    title.className = "tw-replay-title";
    title.textContent = item.title;
    a.title = item.title;
    a.append(icon, title);
    a.addEventListener("click", (e) => {
      if (!twitch.player) return; // no embedded player: open on Twitch instead
      e.preventDefault();
      twitch.picked = true;
      item.live ? watchLive() : watchReplay(item);
      document.getElementById("twitch-player").scrollIntoView({ behavior: "smooth", block: "center" });
    });
    list.append(a);
  }
}

function loadTwitchPlayer() {
  const host = window.location.hostname;
  const box = document.getElementById("twitch-player");
  if (!box || !host) return; // Twitch's player only runs on a real website, not a file opened from disk
  const script = document.createElement("script");
  script.src = "https://player.twitch.tv/js/embed/v1.js";
  script.addEventListener("load", () => {
    const player = new window.Twitch.Player("twitch-player", {
      channel: TWITCH_CHANNEL,
      width: "100%",
      height: "100%",
      parent: [host],
      autoplay: false,
      muted: true,
    });
    twitch.player = player;
    twitch.current = "live";
    player.addEventListener(window.Twitch.Player.ONLINE, () => setTwitchLive(true));
    player.addEventListener(window.Twitch.Player.OFFLINE, () => setTwitchLive(false));
    box.classList.add("has-player");
    playLatestReplay();
    renderReplays();
  });
  document.head.append(script);
}

async function checkTwitchLive() {
  const uptime = await twitchInfo("uptime");
  if (/offline/i.test(uptime)) setTwitchLive(false);
  else if (uptime && !/error|not found|invalid/i.test(uptime)) setTwitchLive(true);
}

async function startTwitch() {
  if (!TWITCH_CHANNEL || !document.getElementById("stream")) return;
  document.querySelectorAll("[data-twitch-link]").forEach((a) => (a.href = `https://twitch.tv/${TWITCH_CHANNEL}`));
  setText("tw-name", TWITCH_CHANNEL);
  loadTwitchPlayer();
  twitchInfo("avatar").then(showTwitchAvatar);
  twitch.replays = parseReplays(await twitchInfo("videos", "?limit=6"));
  renderReplays();
  offlineMessage();
  playLatestReplay();
  checkTwitchLive();
  setInterval(checkTwitchLive, 120000); // re-check every 2 minutes
}

// ---------- Support page: FAQ and contact form ----------
function renderFaqs() {
  const list = document.getElementById("faq-list");
  if (!list) return;
  for (const item of FAQS) {
    const details = document.createElement("details");
    details.className = "faq-item";
    const summary = document.createElement("summary");
    summary.textContent = item.q;
    const answer = document.createElement("p");
    answer.textContent = item.a;
    details.append(summary, answer);
    list.append(details);
  }
}

// Messages are collected by Netlify Forms (see README). Netlify can email you
// each one and pass them on to other tools later.
function setupContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  if (SUPPORT_EMAIL) {
    const link = document.getElementById("contact-email-link");
    link.href = `mailto:${SUPPORT_EMAIL}`;
    link.textContent = SUPPORT_EMAIL;
    document.getElementById("contact-email").hidden = false;
  }
  const status = document.getElementById("form-status");
  const button = form.querySelector('button[type="submit"]');
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    button.disabled = true;
    status.className = "form-status";
    status.textContent = "Sending…";
    try {
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      if (!res.ok) throw new Error(`Form returned ${res.status}`);
      form.reset();
      status.classList.add("is-success");
      status.textContent = "Thanks! Your message was sent. We'll get back to you soon.";
    } catch (err) {
      console.warn("Contact form failed:", err);
      status.classList.add("is-error");
      status.textContent = "Sorry, that didn't send. Please try again, or message a moderator on Discord.";
    } finally {
      button.disabled = false;
    }
  });
}

document.getElementById("year").textContent = new Date().getFullYear();
renderCommunities();
renderGames();
setupNav();
setupCopy();
hideMissingImages();
setupIntro();
startStarfield();
startDiscordWidget();
startTwitch();
renderFaqs();
setupContactForm();
