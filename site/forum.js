// ============================================================
//  Ultima Warriors forum (forum.html)
//  Categories are "General" plus every game in the GAMES list in script.js.
//  Posts are stored by the forum API (netlify/functions/forum.mjs); members
//  log in with Discord (netlify/functions/auth.mjs).
// ============================================================

const forum = { user: null, configured: true, authFailed: false };

function forumCategories() {
  return [
    { slug: "general", name: "General", icon: "💬", desc: "Introductions, chat, game-night plans, and anything else." },
    ...GAMES.map((game) => ({
      slug: slugify(game),
      name: game,
      icon: "🎮",
      desc: `Tips, squads, stories, and screenshots from ${game}.`,
    })),
  ];
}

function findCategory(slug) {
  return forumCategories().find((c) => c.slug === slug);
}

// Small helper to build elements without ever treating member text as HTML
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

// Round profile picture; shows the member's initial if the picture can't load
function avatar(person) {
  const box = el("span", { class: "forum-avatar", "aria-hidden": "true", text: (person.name || "?").charAt(0).toUpperCase() });
  if (person.avatar) {
    const img = el("img", { src: person.avatar, alt: "", loading: "lazy", referrerpolicy: "no-referrer" });
    img.addEventListener("error", () => img.remove());
    box.append(img);
  }
  return box;
}

function timeAgo(ms) {
  if (!ms) return "";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [name, size] of units) {
    const n = Math.floor(s / size);
    if (n >= 1) return `${n} ${name}${n > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

function fullDate(ms) {
  return new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

async function forumApi(path, body) {
  const options = body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : {};
  let res;
  try {
    res = await fetch(`/api/forum/${path}`, options);
  } catch {
    throw new Error("Couldn't reach the forum. Check your connection and try again.");
  }
  let data = {};
  try {
    data = await res.json();
  } catch {
    // non-JSON response, e.g. the forum isn't deployed yet
  }
  if (!res.ok) throw new Error(data.error || "The forum isn't available right now. Please try again later.");
  return data;
}

// ---------- login bar ----------
async function loadForumUser() {
  try {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    forum.user = data.user;
    forum.configured = data.configured;
  } catch {
    forum.authFailed = true;
  }
  renderForumAuth();
}

function returnPath() {
  return encodeURIComponent(location.pathname + location.hash);
}

function renderForumAuth() {
  const box = document.getElementById("forum-auth");
  box.innerHTML = "";
  if (forum.user) {
    box.append(
      avatar(forum.user),
      el("div", { class: "forum-auth-text" },
        el("strong", { text: forum.user.name }),
        forum.user.isMod ? el("span", { class: "mod-badge", text: "Mod" }) : null,
        el("a", { href: `/api/auth/logout?return=${returnPath()}`, text: "Log out" })
      )
    );
  } else if (forum.configured && !forum.authFailed) {
    box.append(el("a", { class: "btn btn-discord btn-small", href: `/api/auth/login?return=${returnPath()}`, text: "Log in with Discord" }));
  }
}

function canPost() {
  return Boolean(forum.user && forum.user.member);
}

function canDelete(authorId) {
  return Boolean(forum.user && (forum.user.id === authorId || forum.user.isMod));
}

// Shown instead of a post box when the visitor can't post
function postingNotice() {
  if (forum.authFailed || !forum.configured) {
    return el("p", { class: "forum-notice", text: "Posting opens soon. You can read along in the meantime!" });
  }
  if (!forum.user) {
    return el("p", { class: "forum-notice" },
      el("a", { href: `/api/auth/login?return=${returnPath()}`, text: "Log in with Discord" }),
      " to post. Only members of the Ultima Warriors Discord can post."
    );
  }
  return el("p", { class: "forum-notice" },
    "Only members of the Ultima Warriors Discord can post. ",
    el("a", { href: "https://discord.gg/ultimawarriors", target: "_blank", rel: "noopener", text: "Join the server" }),
    ", then ",
    el("a", { href: `/api/auth/logout?return=${returnPath()}`, text: "log out" }),
    " and back in."
  );
}

// ---------- breadcrumbs ----------
function setCrumbs(...items) {
  const nav = document.getElementById("forum-crumbs");
  nav.innerHTML = "";
  const all = [{ label: "All boards", href: "#/" }, ...items];
  all.forEach((item, i) => {
    if (i) nav.append(el("span", { class: "crumb-sep", "aria-hidden": "true", text: "›" }));
    nav.append(i === all.length - 1 ? el("span", { "aria-current": "page", text: item.label }) : el("a", { href: item.href, text: item.label }));
  });
}

function showError(view, message) {
  view.innerHTML = "";
  view.append(el("p", { class: "forum-notice is-error", text: message }), el("p", {}, el("a", { href: "#/", text: "Back to all boards" })));
}

// ---------- views ----------
async function renderBoards(view) {
  setCrumbs();
  document.title = "Forum · Ultima Warriors";
  const grid = el("div", { class: "board-grid" });
  view.innerHTML = "";
  view.append(grid);
  let stats = {};
  try {
    stats = (await forumApi("stats")).categories || {};
  } catch {
    // still show the boards, just without counts
  }
  for (const cat of forumCategories()) {
    const s = stats[cat.slug];
    grid.append(
      el("a", { class: "board-card", href: `#/c/${cat.slug}` },
        el("span", { class: "board-icon", "aria-hidden": "true", text: cat.icon }),
        el("span", { class: "board-text" },
          el("strong", { text: cat.name }),
          el("span", { class: "board-desc", text: cat.desc })
        ),
        el("span", { class: "board-meta" },
          el("span", { class: "board-count", text: s ? `${s.threads} topic${s.threads === 1 ? "" : "s"}` : "No topics yet" }),
          s && s.latest ? el("span", { text: `Newest ${timeAgo(s.latest)}` }) : null
        )
      )
    );
  }
}

function composer({ titleField, placeholder, button, onSubmit }) {
  const status = el("p", { class: "form-status", role: "status" });
  const title = titleField ? el("input", { type: "text", name: "title", maxlength: "120", required: true, placeholder: "Topic title" }) : null;
  const body = el("textarea", { name: "body", rows: titleField ? "6" : "4", maxlength: "5000", required: true, placeholder });
  const submit = el("button", { type: "submit", class: "btn btn-discord", text: button });
  const form = el("form", { class: "contact-form forum-composer" },
    title ? el("label", { class: "field" }, el("span", { text: "Title" }), title) : null,
    el("label", { class: "field" }, el("span", { text: titleField ? "Message" : "Your reply" }), body),
    submit,
    status
  );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submit.disabled = true;
    status.className = "form-status";
    status.textContent = "Posting…";
    try {
      await onSubmit({ title: title?.value, body: body.value });
      form.reset();
      status.textContent = "";
    } catch (err) {
      status.classList.add("is-error");
      status.textContent = err.message;
    } finally {
      submit.disabled = false;
    }
  });
  return form;
}

async function renderBoard(view, slug) {
  const cat = findCategory(slug);
  if (!cat) return showError(view, "That board doesn't exist.");
  setCrumbs({ label: cat.name });
  document.title = `${cat.name} · Forum · Ultima Warriors`;
  view.innerHTML = "";
  const header = el("div", { class: "board-head" },
    el("h2", {}, el("span", { "aria-hidden": "true", text: `${cat.icon} ` }), cat.name),
    el("p", { class: "section-lead", text: cat.desc })
  );
  const list = el("div", { class: "thread-list" }, el("p", { class: "forum-muted", text: "Loading topics…" }));
  const newTopic = el("details", { class: "new-topic" }, el("summary", { class: "btn btn-ghost", text: "＋ Start a new topic" }));
  newTopic.append(canPost()
    ? composer({
        titleField: true,
        placeholder: "What's on your mind?",
        button: "Post topic",
        onSubmit: async ({ title, body }) => {
          const { thread } = await forumApi("threads", { category: slug, title, body });
          location.hash = `#/t/${slug}/${thread.id}`;
        },
      })
    : postingNotice());
  view.append(header, newTopic, list);

  try {
    const { threads } = await forumApi(`threads?category=${encodeURIComponent(slug)}`);
    list.innerHTML = "";
    if (!threads.length) {
      list.append(el("p", { class: "forum-muted", text: "No topics yet. Be the first to start one!" }));
      return;
    }
    for (const t of threads) {
      list.append(
        el("a", { class: "thread-row", href: `#/t/${slug}/${t.id}` },
          avatar(t.author),
          el("span", { class: "thread-main" },
            el("strong", { class: "thread-title", text: t.title }),
            el("span", { class: "thread-by", text: `by ${t.author.name} · ${timeAgo(t.createdAt)}` })
          ),
          el("span", { class: "thread-stats" },
            el("span", { class: "thread-replies", text: `${t.replyCount} ${t.replyCount === 1 ? "reply" : "replies"}` }),
            el("span", { text: `Active ${timeAgo(t.lastActivity)}` })
          )
        )
      );
    }
  } catch (err) {
    list.innerHTML = "";
    list.append(el("p", { class: "forum-notice is-error", text: err.message }));
  }
}

function postCard(post, { isTopic, onDelete }) {
  return el("article", { class: `post-card${isTopic ? " is-topic" : ""}` },
    el("header", { class: "post-head" },
      avatar(post.author),
      el("strong", { text: post.author.name }),
      el("time", { datetime: new Date(post.createdAt).toISOString(), title: fullDate(post.createdAt), text: timeAgo(post.createdAt) }),
      canDelete(post.author.id)
        ? el("button", { type: "button", class: "post-delete", text: "Delete", onclick: onDelete })
        : null
    ),
    el("div", { class: "post-body", text: post.body })
  );
}

async function renderThread(view, slug, id) {
  const cat = findCategory(slug);
  if (!cat) return showError(view, "That board doesn't exist.");
  setCrumbs({ label: cat.name, href: `#/c/${slug}` }, { label: "Topic" });
  view.innerHTML = "";
  view.append(el("p", { class: "forum-muted", text: "Loading topic…" }));

  let data;
  try {
    data = await forumApi(`thread?category=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}`);
  } catch (err) {
    return showError(view, err.message);
  }
  const { thread, replies } = data;
  setCrumbs({ label: cat.name, href: `#/c/${slug}` }, { label: thread.title });
  document.title = `${thread.title} · Forum · Ultima Warriors`;

  const remove = (replyId) => async () => {
    const what = replyId ? "this reply" : "this whole topic and all its replies";
    if (!confirm(`Delete ${what}? This can't be undone.`)) return;
    try {
      await forumApi("delete", { category: slug, threadId: id, replyId });
      if (replyId) renderThread(view, slug, id);
      else location.hash = `#/c/${slug}`;
    } catch (err) {
      alert(err.message);
    }
  };

  view.innerHTML = "";
  view.append(
    el("h2", { class: "thread-heading", text: thread.title }),
    postCard(thread, { isTopic: true, onDelete: remove() }),
    el("h3", { class: "dw-heading", text: `${replies.length} ${replies.length === 1 ? "reply" : "replies"}` }),
    ...replies.map((r) => postCard(r, { onDelete: remove(r.id) })),
    canPost()
      ? composer({
          placeholder: "Write a reply…",
          button: "Post reply",
          onSubmit: async ({ body }) => {
            await forumApi("replies", { category: slug, threadId: id, body });
            await renderThread(view, slug, id);
            window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
          },
        })
      : postingNotice()
  );
}

// ---------- router: #/  ·  #/c/<board>  ·  #/t/<board>/<topic> ----------
function routeForum() {
  const view = document.getElementById("forum-view");
  const [, kind, slug, id] = location.hash.split("/");
  renderForumAuth(); // keeps login/logout links returning to the current page
  if (kind === "c" && slug) renderBoard(view, slug);
  else if (kind === "t" && slug && id) renderThread(view, slug, id);
  else renderBoards(view);
  window.scrollTo({ top: 0 });
}

if (document.getElementById("forum-view")) {
  window.addEventListener("hashchange", routeForum);
  loadForumUser().then(routeForum);
}
