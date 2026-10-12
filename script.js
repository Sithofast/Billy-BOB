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

document.getElementById("year").textContent = new Date().getFullYear();
renderCommunities();
renderGames();
setupNav();
setupCopy();
