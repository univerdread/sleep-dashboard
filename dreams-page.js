// The Dreams page: a map of what your dreams share, first; click a point to read the dreams behind
// it. The archive with search sits underneath.
let D, query = "", kind = null, picked = null;

const FIELDS = ["themes", "people", "places"];
const tagsOf = (e) => FIELDS.flatMap((f) => e[f] || []);
const niceDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const shown = () => D.entries.filter((e) => (!kind || (e.kinds || []).includes(kind))
  && (!query || `${e.title} ${e.clean} ${tagsOf(e).join(" ")}`.toLowerCase().includes(query)));

function entry(e) {
  return h("article", { class: "dream" },
    h("div", { class: "when" }, niceDate(e.night), h("br"), [e.source, e.time].filter(Boolean).join(" · ")),
    h("div", {}, h("h3", {}, e.title || "Untitled"), h("p", {}, e.clean),
      h("div", { class: "tags" }, (e.kinds || []).map((k) => h("span", { class: "tag kind" }, k.replace("_", " "))),
        e.mood ? h("span", { class: "tag" }, e.mood) : null, tagsOf(e).map((t) => h("span", { class: "tag" }, t))),
      e.audio ? h("audio", { controls: true, preload: "none", src: `../${e.audio}` }) : null));
}

function list() {
  const rows = shown();
  $("#list").replaceChildren(...(rows.length ? rows.map(entry) : [h("p", { class: "empty" }, "No dream matches that.")]));
  $("#count").textContent = `${rows.length} of ${D.entries.length}`;
}

// The panel beside the map: the dreams behind the picked point, or how to use the map.
function related() {
  const box = $("#related");
  if (!picked) {
    box.replaceChildren(h("h2", {}, "Click a point"), h("p", { class: "fine", style: "margin:0" },
      `Each point is a theme, person or place from your ${D.entries.length} ${D.entries.length === 1 ? "dream" : "dreams"}. Lines join what appeared in the same dream.`));
    return;
  }
  const rows = D.entries.filter((e) => tagsOf(e).includes(picked));
  box.replaceChildren(h("h2", {}, picked),
    h("p", { class: "fine", style: "margin:0 0 8px" }, `${rows.length} ${rows.length === 1 ? "dream" : "dreams"} · `,
      h("button", { class: "linkish", type: "button", onclick: () => pick(null) }, "clear")),
    ...rows.map((e) => h("div", { class: "item" }, h("div", { class: "when" }, niceDate(e.night)), h("h3", {}, e.title || "Untitled"), h("p", {}, e.clean))));
}

// Springs along shared dreams, repulsion between everything: what belongs together drifts together.
// It runs in open space and is fitted to the box afterwards, so nothing piles up at an edge. Seeded
// from fixed positions, so the map stays the same from one visit to the next.
function layout(names, links) {
  const P = names.map((_, i) => {
    const r = Math.sqrt((i + 0.6) / names.length), a = i * 2.39996;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
  const rest = 0.34;
  for (let step = 0; step < 400; step++) {
    const cool = 1 - step / 400;
    const F = P.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const dx = P[i].x - P[j].x, dy = P[i].y - P[j].y, d2 = dx * dx + dy * dy + 0.002;
      const f = 0.012 / d2;
      F[i].x += dx * f; F[i].y += dy * f; F[j].x -= dx * f; F[j].y -= dy * f;
    }
    for (const [a, b, n] of links) {
      const dx = P[b].x - P[a].x, dy = P[b].y - P[a].y, d = Math.hypot(dx, dy) + 1e-6;
      const f = (0.05 * Math.min(n, 3) * (d - rest)) / d;
      F[a].x += dx * f; F[a].y += dy * f; F[b].x -= dx * f; F[b].y -= dy * f;
    }
    P.forEach((p, i) => {
      F[i].x -= p.x * 0.03; F[i].y -= p.y * 0.03;
      p.x += Math.max(-0.08, Math.min(0.08, F[i].x)) * cool;
      p.y += Math.max(-0.08, Math.min(0.08, F[i].y)) * cool;
    });
  }
  const xs = P.map((p) => p.x), ys = P.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return P.map((p) => ({ x: 0.1 + (0.78 * (p.x - x0)) / (x1 - x0 || 1), y: 0.08 + (0.78 * (p.y - y0)) / (y1 - y0 || 1) }));
}

function map(box) {
  const counts = new Map();
  const kindOf = new Map();
  for (const e of D.entries) for (const f of FIELDS) for (const t of e[f] || []) { counts.set(t, (counts.get(t) || 0) + 1); kindOf.set(t, f); }
  const names = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a)).slice(0, 48);
  const index = new Map(names.map((t, i) => [t, i]));
  const pairs = new Map();
  for (const e of D.entries) {
    const tags = [...new Set(tagsOf(e))].filter((t) => index.has(t));
    for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) {
      const a = Math.min(index.get(tags[i]), index.get(tags[j])), b = Math.max(index.get(tags[i]), index.get(tags[j]));
      pairs.set(`${a},${b}`, (pairs.get(`${a},${b}`) || 0) + 1);
    }
  }
  const links = [...pairs].map(([k, n]) => [...k.split(",").map(Number), n]);
  const near = (t) => new Set(links.flatMap(([a, b]) => (names[a] === t ? [names[b]] : names[b] === t ? [names[a]] : [])));
  let nodes = [], edges = [];
  const paint = () => {
    const friends = picked ? near(picked) : null;
    nodes.forEach(({ g, t }) => { g.style.opacity = !picked || t === picked || friends.has(t) ? 1 : 0.22; });
    edges.forEach(({ l, a, b }) => { l.style.opacity = !picked ? 0.8 : names[a] === picked || names[b] === picked ? 1 : 0.1; });
    nodes.forEach(({ c, t }) => c.setAttribute("fill", t === picked ? "var(--plate-ink)" : "var(--accent)"));
  };
  const draw = (w) => {
    const H = Math.max(380, Math.min(540, w * 0.72));
    const P = layout(names, links);
    const X = (i) => P[i].x * w, Y = (i) => P[i].y * H;
    const svg = s("svg", { viewBox: `0 0 ${w} ${H}`, style: `height:${H}px`, role: "group", "aria-label": "Map of the themes, people and places in your dreams" });
    edges = links.map(([a, b]) => {
      const l = s("line", { class: "edge", x1: X(a), y1: Y(a), x2: X(b), y2: Y(b), stroke: "var(--plate-line)" });
      svg.append(l);
      return { l, a, b };
    });
    nodes = names.map((t, i) => {
      const k = counts.get(t), r = 3.5 + k * 1.8;
      const shape = kindOf.get(t) === "themes" ? s("circle", { cx: X(i), cy: Y(i), r })
        : kindOf.get(t) === "people" ? s("rect", { x: X(i) - r, y: Y(i) - r, width: 2 * r, height: 2 * r, transform: `rotate(45 ${X(i)} ${Y(i)})` })
          : s("rect", { x: X(i) - r, y: Y(i) - r, width: 2 * r, height: 2 * r });
      const g = s("g", { class: "node", role: "button", tabindex: 0, "aria-label": `${t}, ${k} ${k === 1 ? "dream" : "dreams"}` }, shape);
      const right = P[i].x < 0.72;
      const label = s("text", { x: X(i) + (right ? r + 5 : -r - 5), y: Y(i) + 4, fill: "var(--plate-ink)", "font-size": 12.5, "text-anchor": right ? "start" : "end" });
      label.textContent = t;
      g.append(label, s("circle", { cx: X(i), cy: Y(i), r: 16, fill: "transparent" }));
      g.addEventListener("click", () => pick(picked === t ? null : t));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(picked === t ? null : t); } });
      svg.append(g);
      return { g, t, c: shape };
    });
    box.querySelector("svg")?.remove();
    box.prepend(svg);
    paint();
  };
  onSize(box, draw);
  return paint;
}

let repaint = () => {};
function pick(t) {
  picked = t;
  repaint();
  related();
  if (t && innerWidth <= 900) $("#related").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function render() {
  D = await LAB.load("dreams");
  const plate = h("div", { class: "plate map" }, h("span", { class: "hint" }, "● theme   ◆ person   ■ place"));
  const kinds = Object.entries(D.kind_counts || {}).sort((a, b) => b[1] - a[1]);
  const chips = kinds.map(([k, n]) => h("button", {
    class: "chip", type: "button", "aria-pressed": String(kind === k),
    onclick: (e) => {
      kind = kind === k ? null : k;
      e.currentTarget.parentNode.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
      if (kind) e.currentTarget.setAttribute("aria-pressed", "true");
      list();
    },
  }, k.replace("_", " "), h("small", {}, n)));
  $("#app").replaceChildren(
    h("div", { class: "dream-top" }, plate, h("aside", { class: "related", id: "related", "aria-live": "polite" })),
    h("section", {}, h("div", { class: "head" }, h("h2", {}, "All dreams"), h("span", { class: "fine", id: "count", style: "margin:0" })),
      h("input", { class: "search", type: "search", placeholder: "Search your dreams", "aria-label": "Search your dreams",
        oninput: (e) => { query = e.target.value.toLowerCase(); list(); } }),
      h("div", { class: "filters" }, chips), h("div", { id: "list" })));
  repaint = map(plate);
  related();
  list();
}

theme();
addEventListener("themechange", () => { if (D) render(); });
unlock(render);
