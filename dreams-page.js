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
      `Each point is a theme, person or place from your ${D.entries.length} ${D.entries.length === 1 ? "dream" : "dreams"}. Lines join what appeared in the same dream. Drag a point and what it shares a dream with follows; drag the background to move around, and pinch or use + and − to zoom.`));
    return;
  }
  const rows = D.entries.filter((e) => tagsOf(e).includes(picked));
  box.replaceChildren(h("h2", {}, picked),
    h("p", { class: "fine", style: "margin:0 0 8px" }, `${rows.length} ${rows.length === 1 ? "dream" : "dreams"} · `,
      h("button", { class: "linkish", type: "button", onclick: () => pick(null) }, "clear")),
    ...rows.map((e) => h("div", { class: "item" }, h("div", { class: "when" }, niceDate(e.night)), h("h3", {}, e.title || "Untitled"), h("p", {}, e.clean))));
}

// A web of what your dreams share, live: springs along shared dreams, repulsion between everything,
// and every point's label keeps a box of its own, so no two labels sit on each other. Drag a point
// and what it shares a dream with follows; drag the background to move around; pinch, ctrl-scroll or
// the buttons to zoom. It starts from fixed positions and settles before it's shown, so the map
// opens the same way on every visit.
const REST = 74, CHARGE = 1300, PAD = 4;

function settle(N, links, w, H, alpha, steps) {
  for (let s = 0; s < steps; s++) step(N, links, w, H, alpha * (1 - s / steps));
}

function step(N, links, w, H, alpha) {
  for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
    const a = N[i], b = N[j], dx = a.x - b.x, dy = a.y - b.y, d2 = Math.max(dx * dx + dy * dy, 25);
    const f = ((a.group === b.group ? 1 : 2) * CHARGE * alpha) / d2 / Math.sqrt(d2);  // dreams apart
    a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
  }
  for (const [i, j, n] of links) {
    const a = N[i], b = N[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    const f = (0.03 * Math.min(n, 3) * (d - REST) * alpha) / d;
    a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
  }
  for (const p of N) {
    p.vx += (w / 2 - p.x) * 0.0015 * alpha; p.vy += (H / 2 - p.y) * 0.0025 * alpha;
    if (p.fixed) { p.vx = p.vy = 0; continue; }
    p.vx *= 0.6; p.vy *= 0.6;
    p.x += Math.max(-24, Math.min(24, p.vx)); p.y += Math.max(-24, Math.min(24, p.vy));
  }
  // Label boxes: a point with its label to the right. Overlapping boxes move apart along the
  // shorter overlap, half each (all of it on the one not being dragged).
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
    const a = N[i], b = N[j];
    const ox = Math.min(a.x + a.right, b.x + b.right) - Math.max(a.x - a.left, b.x - b.left) + PAD;
    const oy = Math.min(a.y + 10, b.y + 10) - Math.max(a.y - 10, b.y - 10) + PAD;
    if (ox <= 0 || oy <= 0) continue;
    const share = a.fixed ? [0, 1] : b.fixed ? [1, 0] : [0.5, 0.5];
    if (ox < oy) {
      const dir = a.x - a.left + a.x + a.right < b.x - b.left + b.x + b.right ? -1 : 1;
      a.x += dir * ox * share[0]; b.x -= dir * ox * share[1];
    } else {
      const dir = a.y < b.y || (a.y === b.y && i < j) ? -1 : 1;
      a.y += dir * oy * share[0]; b.y -= dir * oy * share[1];
    }
  }
}

function map(box) {
  const counts = new Map();
  const kindOf = new Map();
  for (const e of D.entries) for (const f of FIELDS) for (const t of e[f] || []) { counts.set(t, (counts.get(t) || 0) + 1); kindOf.set(t, f); }
  const names = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a)).slice(0, 160);  // the web zooms and pans, so it can hold them all
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
  const groups = names.map((_, i) => i);  // linked points, by union-find
  const root = (i) => (groups[i] === i ? i : (groups[i] = root(groups[i])));
  for (const [a, b] of links) groups[root(a)] = root(b);
  names.forEach((_, i) => { groups[i] = root(i); });
  const near = (t) => new Set(links.flatMap(([a, b]) => (names[a] === t ? [names[b]] : names[b] === t ? [names[a]] : [])));
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let nodes = [], edges = [], N = [], view = { x: 0, y: 0, k: 1 }, layer = null, svg = null, W = 0, H = 0;
  let heat = 0, frame = 0;

  const paint = () => {
    const friends = picked ? near(picked) : null;
    nodes.forEach(({ g, t }) => { g.style.opacity = !picked || t === picked || friends.has(t) ? 1 : 0.22; });
    edges.forEach(({ l, a, b }) => { l.style.opacity = !picked ? 0.8 : names[a] === picked || names[b] === picked ? 1 : 0.1; });
    nodes.forEach(({ c, t }) => c.setAttribute("fill", t === picked ? "var(--plate-ink)" : "var(--accent)"));
  };
  const place = () => {
    nodes.forEach(({ g }, i) => g.setAttribute("transform", `translate(${N[i].x.toFixed(1)} ${N[i].y.toFixed(1)})`));
    edges.forEach(({ l, a, b }) => { l.setAttribute("x1", N[a].x); l.setAttribute("y1", N[a].y); l.setAttribute("x2", N[b].x); l.setAttribute("y2", N[b].y); });
  };
  const look = () => layer.setAttribute("transform", `translate(${view.x} ${view.y}) scale(${view.k})`);
  const fit = () => {
    const x0 = Math.min(...N.map((p) => p.x - p.left)), x1 = Math.max(...N.map((p) => p.x + p.right));
    const y0 = Math.min(...N.map((p) => p.y - 12)), y1 = Math.max(...N.map((p) => p.y + 12));
    const k = Math.min(1.6, (W - 36) / (x1 - x0 || 1), (H - 64) / (y1 - y0 || 1));
    view = { k, x: (W - k * (x1 + x0)) / 2, y: (H - 24 - k * (y1 + y0)) / 2 };
    look();
  };
  const zoom = (by, cx = W / 2, cy = H / 2) => {
    const k = Math.max(0.3, Math.min(4, view.k * by));
    view = { k, x: cx - ((cx - view.x) * k) / view.k, y: cy - ((cy - view.y) * k) / view.k };
    look();
  };
  // While something is moving, a frame at a time; still motion settles it at once.
  const run = () => {
    if (still) { settle(N, links, W, H, 0.6, 120); place(); return; }
    if (frame) return;
    const go = () => {
      step(N, links, W, H, Math.min(1, heat));
      place();
      heat *= 0.97;
      frame = heat > 0.02 ? requestAnimationFrame(go) : 0;
    };
    frame = requestAnimationFrame(go);
  };
  const local = (e) => {
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };
  const world = (e) => { const q = local(e); return { x: (q.x - view.x) / view.k, y: (q.y - view.y) / view.k }; };

  const draw = (w) => {
    W = w; H = Math.max(400, Math.min(560, w * 0.72));
    svg = s("svg", { viewBox: `0 0 ${W} ${H}`, style: `height:${H}px;touch-action:none`, role: "group", "aria-label": "Map of the themes, people and places in your dreams" });
    layer = s("g");
    svg.append(layer);
    // Each group of linked points (usually one dream's) starts on its own spot around the middle.
    const sizes = groups.reduce((m, g) => m.set(g, (m.get(g) || 0) + 1), new Map());
    const order = [...sizes.keys()].sort((a, b) => sizes.get(b) - sizes.get(a));
    const seen = new Map();
    N = names.map((t, i) => {
      const g = groups[i], at = order.indexOf(g), n = seen.get(g) || 0, ring = order.length > 1 ? 0.2 : 0;
      seen.set(g, n + 1);
      const cx = W / 2 + Math.cos((2 * Math.PI * at) / order.length) * ring * W;
      const cy = H / 2 + Math.sin((2 * Math.PI * at) / order.length) * ring * H;
      const r = 14 * Math.sqrt(n + 0.5), a = n * 2.39996;
      return { t, group: g, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: 0, vy: 0, size: 3.5 + counts.get(t) * 1.8 };
    });
    edges = links.map(([a, b]) => {
      const l = s("line", { class: "edge", stroke: "var(--plate-line)" });
      layer.append(l);
      return { l, a, b };
    });
    nodes = names.map((t, i) => {
      const k = counts.get(t), r = N[i].size;
      const shape = kindOf.get(t) === "themes" ? s("circle", { r })
        : kindOf.get(t) === "people" ? s("rect", { x: -r, y: -r, width: 2 * r, height: 2 * r, transform: "rotate(45)" })
          : s("rect", { x: -r, y: -r, width: 2 * r, height: 2 * r });
      const g = s("g", { class: "node", role: "button", tabindex: 0, "aria-label": `${t}, ${k} ${k === 1 ? "dream" : "dreams"}` }, shape);
      const label = s("text", { x: r + 5, y: 4, fill: "var(--plate-ink)", "font-size": 12.5 });
      label.textContent = t;
      g.append(s("circle", { r: Math.max(14, r + 6), fill: "transparent" }), label);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(picked === t ? null : t); } });
      g.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        g.setPointerCapture(e.pointerId);
        const p = N[i], from = local(e);
        let moved = false;
        p.fixed = true;
        const move = (ev) => {
          const q = local(ev);
          if (!moved && Math.hypot(q.x - from.x, q.y - from.y) < 4) return;
          moved = true;
          const at = world(ev);
          p.x = at.x; p.y = at.y;
          heat = Math.max(heat, 0.5);
          if (still) place(); else run();
        };
        const up = () => {
          g.removeEventListener("pointermove", move);
          g.removeEventListener("pointerup", up);
          g.removeEventListener("pointercancel", up);
          p.fixed = false;
          if (!moved) pick(picked === t ? null : t);
          else { heat = Math.max(heat, 0.3); run(); }
        };
        g.addEventListener("pointermove", move);
        g.addEventListener("pointerup", up);
        g.addEventListener("pointercancel", up);
      });
      layer.append(g);
      return { g, t, c: shape, label };
    });
    box.querySelector("svg")?.remove();
    box.querySelector(".zoom")?.remove();
    box.prepend(svg);
    nodes.forEach(({ label }, i) => { N[i].left = N[i].size + 2; N[i].right = N[i].size + 7 + label.getComputedTextLength(); });
    settle(N, links, W, H, 1, 400);
    place();
    fit();
    paint();

    svg.addEventListener("pointerdown", (e) => {
      svg.setPointerCapture(e.pointerId);
      const from = local(e), start = { ...view };
      let moved = false;
      const move = (ev) => {
        const q = local(ev);
        moved = moved || Math.hypot(q.x - from.x, q.y - from.y) > 4;
        view = { ...start, x: start.x + q.x - from.x, y: start.y + q.y - from.y };
        look();
      };
      const up = () => {
        svg.removeEventListener("pointermove", move);
        svg.removeEventListener("pointerup", up);
        svg.removeEventListener("pointercancel", up);
        if (!moved && picked) pick(null);
      };
      svg.addEventListener("pointermove", move);
      svg.addEventListener("pointerup", up);
      svg.addEventListener("pointercancel", up);
    });
    // A trackpad pinch arrives as ctrl + wheel; a plain wheel still scrolls the page.
    svg.addEventListener("wheel", (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const q = local(e);
      zoom(Math.exp(-e.deltaY * 0.01), q.x, q.y);
    }, { passive: false });
    box.append(h("div", { class: "zoom", role: "group", "aria-label": "Zoom the map" },
      h("button", { type: "button", "aria-label": "Zoom out", onclick: () => zoom(1 / 1.25) }, "−"),
      h("button", { type: "button", "aria-label": "Zoom in", onclick: () => zoom(1.25) }, "+"),
      h("button", { type: "button", onclick: fit }, "Fit")));
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
  const plate = h("div", { class: "plate map" }, h("span", { class: "hint" }, "● theme   ◆ person   ■ place   · drag to untangle"));
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
