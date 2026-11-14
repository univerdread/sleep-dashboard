// Shared by both pages: loading (and unlocking) data files, the theme, tooltips and small helpers.
const $ = (sel, root = document) => root.querySelector(sel);

function h(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  n.append(...kids.flat().filter((x) => x != null));
  return n;
}

const SVGNS = "http://www.w3.org/2000/svg";
function s(tag, attrs = {}, ...kids) {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  n.append(...kids.flat().filter((x) => x != null));
  return n;
}

// Minutes after noon on the evening a night began, as a clock time.
const clock = (m) => {
  const t = (Math.round(m) + 720) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
const hm = (min) => {
  const m = Math.round(Math.abs(min));
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`;
};
const fmt = (v, nd = 0) => (v == null ? "–" : Number(v).toFixed(nd));
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const STAGE = {
  W: { name: "Awake", var: "--wake" }, R: { name: "REM", var: "--rem" }, 1: { name: "N1 · drowsy", var: "--n1" },
  2: { name: "N2 · light", var: "--n2" }, 3: { name: "N3 · deep", var: "--n3" },
};
const stageColor = (c) => (STAGE[c] ? cssVar(STAGE[c].var) : "#2a2d3a");

// --- data files: each one is a script that calls LAB.put --------------------------------------
const LAB = {
  waiting: {}, key: null,
  put(name, value) { (this.waiting[name] || (() => {}))(value); },
  file(name, src) {
    return new Promise((resolve, reject) => {
      this.waiting[name] = resolve;
      document.head.append(h("script", { src, onerror: () => reject(new Error(`can't load ${src}`)) }));
    });
  },
  async load(name, src = `${name}.js`) {
    const value = await this.file(name, src);
    return typeof value === "string" && value.startsWith("enc:") ? openBox(value, this.key) : value;
  },
};

// --- the lock ---------------------------------------------------------------------------------
const REMEMBER = "sleep-key";
const store = {
  get() { try { return localStorage.getItem(REMEMBER); } catch { return null; } },
  set(v) { try { localStorage.setItem(REMEMBER, v); } catch { /* private window */ } },
  clear() { try { localStorage.removeItem(REMEMBER); } catch { /* private window */ } },
};
const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const unhex = (t) => Uint8Array.from(t.match(/../g), (x) => parseInt(x, 16));

async function unlock(render) {
  const cfg = window.LAB_CONFIG;
  const app = $("#app");
  if (!cfg.locked) return render();
  const saved = store.get() || sessionStorage.getItem(REMEMBER);
  if (saved) {
    LAB.key = unhex(saved);
    try { return await render(); } catch { store.clear(); sessionStorage.removeItem(REMEMBER); location.reload(); return; }
  }
  const err = h("p", { class: "err", role: "alert" });
  const input = h("input", { type: "password", autocomplete: "current-password", "aria-label": "Passphrase", placeholder: "Passphrase", required: true });
  const keep = h("input", { type: "checkbox" });
  const go = h("button", { type: "submit" }, "Open");
  app.replaceChildren(h("div", { class: "lock" }, h("form", {
    onsubmit: async (e) => {
      e.preventDefault();
      err.textContent = ""; go.textContent = "Opening…"; go.disabled = true;
      const key = await deriveKey(input.value, cfg.salt, cfg.iterations);
      LAB.key = key;
      try {
        await render();
        (keep.checked ? store.set(hex(key)) : sessionStorage.setItem(REMEMBER, hex(key)));
      } catch {
        err.textContent = "That isn't it."; go.textContent = "Open"; go.disabled = false; input.select();
      }
    },
  }, h("h1", {}, "Sleep Dashboard"), h("p", { class: "fine" }, "Private. Enter your passphrase."), input,
  h("label", {}, keep, " Remember on this device"), go, err)));
  input.focus();
}

// --- theme and tooltip -------------------------------------------------------------------------
// The theme is set before the page paints (the line in <head>); this is the picker. Canvases read
// their colours when drawn, so a change tells the page to draw again.
function theme() {
  const pick = $("#theme");
  pick.value = document.documentElement.dataset.theme;
  pick.addEventListener("change", () => {
    document.documentElement.dataset.theme = pick.value;
    try { localStorage.setItem("sleep-theme", pick.value); } catch { /* private window */ }
    dispatchEvent(new Event("themechange"));
  });
}

const tip = {
  show(x, y, html) {
    const t = $("#tip");
    t.innerHTML = html; t.classList.add("on");
    const r = t.getBoundingClientRect();
    t.style.left = `${Math.max(8, Math.min(x + 14, innerWidth - r.width - 8))}px`;
    t.style.top = `${Math.max(8, y - r.height - 12 < 8 ? y + 16 : y - r.height - 12)}px`;
  },
  hide() { $("#tip").classList.remove("on"); },
};
const swatch = (c) => `<i style="background:${stageColor(c)}"></i>`;

// Redraw a canvas or chart when its box changes, once it has a size.
function onSize(el, draw) {
  let last = 0;
  new ResizeObserver(([e]) => {
    const w = Math.round(e.contentRect.width);
    if (w && w !== last) { last = w; draw(w); }
  }).observe(el);
}

function canvasFor(el, height) {
  const c = el.tagName === "CANVAS" ? el : el.querySelector("canvas");
  const d = Math.min(devicePixelRatio || 1, 2);
  const w = c.clientWidth;
  const hgt = height || c.clientHeight;
  c.width = w * d; c.height = hgt * d;
  c.style.height = `${hgt}px`;
  const g = c.getContext("2d");
  g.setTransform(d, 0, 0, d, 0, 0);
  return { g, w, h: hgt };
}
