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

// Games the community plays.
const GAMES = [
  "Call of Duty",
  "Fortnite",
  "Minecraft",
  "Sea of Thieves",
  "Destiny 2",
  "Diablo IV",
  "Rocket League",
  "Halo Infinite",
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

document.getElementById("year").textContent = new Date().getFullYear();
renderCommunities();
renderGames();
setupNav();
setupCopy();
hideMissingImages();
setupIntro();
startStarfield();
