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
    description: "Catch us live and hang out in chat.",
    url: "",
    cta: "Watch live",
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

// Games the community plays.
const GAMES = [
  "Eve Online",
  "World of Warcraft: Forever",
  "Farming Simulator",
  "Conan Exiles",
  "Star Wars Galaxies",
];

// ============================================================
//  Site code below — you shouldn't need to edit this.
// ============================================================

function renderCommunities() {
  const grid = document.getElementById("community-grid");
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
    if (c.featured) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Home base";
      card.prepend(badge);
    }
    grid.append(card);
  }
}

function renderGames() {
  const list = document.getElementById("game-list");
  list.innerHTML = "";
  for (const g of GAMES) {
    const li = document.createElement("li");
    li.textContent = g;
    list.append(li);
  }
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
  loadDiscordWidget();
  if (DISCORD_SERVER_ID) setInterval(loadDiscordWidget, 60000); // refresh every minute
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
