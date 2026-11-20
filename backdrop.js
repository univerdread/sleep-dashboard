// The scenes behind the art themes, drawn once on a fixed canvas (dark and light have none). All of
// it is generated here, so nothing but code goes online. A seeded random keeps each scene the same.
const SCENES = {};
let sceneRun = 0;

function seeded(n) {
  let s = n;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function paintBackdrop() {
  sceneRun += 1;
  const c = $("#backdrop");
  const scene = SCENES[document.documentElement.dataset.theme];
  c.style.display = scene ? "block" : "none";
  if (!scene) return;
  const d = Math.min(devicePixelRatio || 1, 2), w = innerWidth, h = innerHeight;
  c.width = w * d; c.height = h * d;
  const g = c.getContext("2d");
  g.setTransform(d, 0, 0, d, 0, 0);
  scene(g, w, h);
}

// --- Brutalism: slab towers going up into fog, seen from the street. ------------------------------
function slab(g, x, y, w, h, tone, r, cols, lit) {
  g.fillStyle = tone;
  g.fillRect(x, y, w, h);
  const cw = w / cols, rh = cw * 0.86;
  for (let yy = y + rh * 0.3, row = 0; yy < y + h; yy += rh, row++) {
    g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(x, yy - rh * 0.24, w, 1.2);
    for (let i = 0; i < cols; i++) {
      const dark = 0.34 + r() * 0.34;
      g.fillStyle = r() < lit ? "rgba(206,190,140,.34)" : `rgba(16,18,18,${dark})`;
      g.fillRect(x + i * cw + cw * 0.12, yy, cw * 0.76, rh * 0.5);
      g.fillStyle = "rgba(226,228,222,.06)"; g.fillRect(x + i * cw + cw * 0.12, yy + rh * 0.5, cw * 0.76, 1);
    }
  }
  const shade = g.createLinearGradient(x, 0, x + w, 0);
  shade.addColorStop(0, "rgba(255,255,255,.05)"); shade.addColorStop(1, "rgba(0,0,0,.22)");
  g.fillStyle = shade; g.fillRect(x, y, w, h);
}
SCENES.brutalism = (g, w, h) => {
  const r = seeded(11);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#a3a7a2"); sky.addColorStop(0.45, "#7e827e"); sky.addColorStop(1, "#4b4e4b");
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const veil = (a) => {
    const fog = g.createLinearGradient(0, 0, 0, h);
    fog.addColorStop(0, `rgba(170,174,168,${a})`); fog.addColorStop(0.5, `rgba(136,140,135,${a * 0.75})`); fog.addColorStop(1, `rgba(96,99,95,${a * 0.3})`);
    g.fillStyle = fog; g.fillRect(0, 0, w, h);
  };
  // Far: pale blocks barely there. Middle: the ones you'd recognise. Near: the walls of the street.
  [[0.3, 0.05, 0.12, 0.62], [0.52, 0.02, 0.1, 0.72], [0.66, 0.09, 0.12, 0.6]].forEach(([x, y, tw]) => slab(g, x * w, y * h, tw * w, h, "#8a8e89", r, 16, 0));
  veil(0.62);
  [[0.2, 0.0, 0.14], [0.57, 0.0, 0.13], [0.42, 0.14, 0.11]].forEach(([x, y, tw]) => slab(g, x * w, y * h, tw * w, h, "#6c706b", r, 13, 0.01));
  veil(0.34);
  slab(g, -0.03 * w, -20, 0.24 * w, h + 40, "#51544f", r, 10, 0.02);
  slab(g, 0.8 * w, -20, 0.24 * w, h + 40, "#494c48", r, 9, 0.02);
  veil(0.1);
  const fall = g.createLinearGradient(0, 0, 0, h);
  fall.addColorStop(0, "rgba(30,32,31,.28)"); fall.addColorStop(0.35, "rgba(32,34,33,.58)"); fall.addColorStop(1, "rgba(28,30,29,.9)");
  g.fillStyle = fall; g.fillRect(0, 0, w, h);
};

// --- Backrooms: Level 0. Yellowed damask wallpaper, drop ceiling, buzzing tubes, wet carpet. -------
SCENES.backrooms = (g, w, h) => {
  const r = seeded(7);
  const wall = g.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, "#e2d38a"); wall.addColorStop(0.55, "#d3c172"); wall.addColorStop(1, "#b9a658");
  g.fillStyle = wall; g.fillRect(0, 0, w, h);
  // The paper: a repeat of pointed ovals in columns, printed slightly darker than the ground.
  const cw = 58, rh = 92;
  g.lineWidth = 1.3;
  for (let x = -cw, col = 0; x < w + cw; x += cw, col++) {
    for (let y = col % 2 ? -rh / 2 : 0; y < h + rh; y += rh) {
      g.strokeStyle = "rgba(122,98,28,.2)";
      g.beginPath();
      g.moveTo(x, y - 34); g.bezierCurveTo(x + 21, y - 16, x + 21, y + 16, x, y + 34);
      g.bezierCurveTo(x - 21, y + 16, x - 21, y - 16, x, y - 34);
      g.stroke();
      g.beginPath(); g.moveTo(x, y - 18); g.bezierCurveTo(x + 9, y - 7, x + 9, y + 7, x, y + 18);
      g.bezierCurveTo(x - 9, y + 7, x - 9, y - 7, x, y - 18); g.stroke();
      g.fillStyle = "rgba(122,98,28,.18)";
      g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill();
      for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * cw / 2, y + rh / 2, 1.6, 0, 7); g.fill(); }
    }
  }
  // Seams where the rolls meet, and the damp that has crept out from them.
  for (let x = 90; x < w; x += 340) {
    g.fillStyle = "rgba(92,74,20,.16)"; g.fillRect(x, 0, 1, h);
    g.fillStyle = "rgba(255,246,200,.1)"; g.fillRect(x + 1, 0, 1, h);
    for (let i = 0, n = 2 + Math.floor(r() * 3); i < n; i++) {
      const sx = x + (r() - 0.5) * 90, sy = r() * h * 0.8;
      for (let b = 0; b < 7; b++) {
        const bx = sx + (r() - 0.5) * 70, by = sy + r() * 150, br = 16 + r() * 50;
        const st = g.createRadialGradient(bx, by, 0, bx, by, br);
        st.addColorStop(0, "rgba(110,84,22,.09)"); st.addColorStop(1, "rgba(110,84,22,0)");
        g.fillStyle = st; g.fillRect(bx - br, by - br, br * 2, br * 2);
      }
    }
  }
  // Drop ceiling, with a tube fixture every so often.
  const ch = 128;
  g.fillStyle = "#d9d2ac"; g.fillRect(0, 0, w, ch);
  for (let i = 0; i < 2600 * (w / 1400); i++) { g.fillStyle = `rgba(90,80,40,${0.05 + r() * 0.14})`; g.fillRect(r() * w, r() * ch, 1.2, 1.2); }
  g.strokeStyle = "#a59a68"; g.lineWidth = 2;
  for (let x = 0; x < w; x += 120) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, ch); g.stroke(); }
  for (const y of [52, 118]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.fillStyle = "rgba(92,74,20,.35)"; g.fillRect(0, ch, w, 3);
  for (let x = 60; x < w; x += 360) {
    const glow = g.createRadialGradient(x + 60, 86, 6, x + 60, 86, 340);
    glow.addColorStop(0, "rgba(255,252,214,.72)"); glow.addColorStop(0.35, "rgba(255,248,190,.24)"); glow.addColorStop(1, "rgba(255,248,190,0)");
    g.fillStyle = glow; g.fillRect(x - 280, 0, 680, 400);
    g.fillStyle = "#fdf9dc"; g.fillRect(x, 66, 120, 40);
    g.fillStyle = "rgba(190,178,120,.55)"; for (let k = 1; k < 4; k++) g.fillRect(x, 66 + k * 10, 120, 1);
  }
  // Skirting board and the damp carpet.
  const floor = h - 46;
  g.fillStyle = "#8f7d3e"; g.fillRect(0, floor - 14, w, 14);
  g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(0, floor - 1, w, 2);
  g.fillStyle = "#7d6f3a"; g.fillRect(0, floor, w, 46);
  for (let i = 0; i < 9000 * (w / 1400); i++) {
    g.fillStyle = r() < 0.5 ? `rgba(40,32,10,${r() * 0.22})` : `rgba(190,170,96,${r() * 0.2})`;
    g.fillRect(r() * w, floor + r() * 46, 1.5, 1.5);
  }
  for (let i = 0; i < 5; i++) {
    const x = r() * w, wet = g.createRadialGradient(x, h - 18, 0, x, h - 18, 90 + r() * 120);
    wet.addColorStop(0, "rgba(30,24,8,.34)"); wet.addColorStop(1, "rgba(30,24,8,0)");
    g.fillStyle = wet; g.fillRect(x - 220, floor, 440, 46);
  }
};

// --- Amanita: a fairy ring in a dark wood at dusk, with spores drifting. --------------------------
function mushroom(g, x, y, s, r) {
  g.save();
  g.translate(x, y); g.rotate((r() - 0.5) * 0.26);
  const stem = g.createLinearGradient(-s * 0.2, 0, s * 0.2, 0);
  stem.addColorStop(0, "#d9cfb6"); stem.addColorStop(0.5, "#f6efdd"); stem.addColorStop(1, "#c7bb9f");
  g.fillStyle = stem;
  g.beginPath(); g.moveTo(-s * 0.13, 0); g.quadraticCurveTo(-s * 0.2, -s * 0.5, -s * 0.09, -s * 0.92);
  g.lineTo(s * 0.09, -s * 0.92); g.quadraticCurveTo(s * 0.2, -s * 0.5, s * 0.13, 0); g.closePath(); g.fill();
  g.fillStyle = "#efe6d1"; g.beginPath(); g.ellipse(0, -s * 0.62, s * 0.2, s * 0.05, 0, 0, 7); g.fill();
  const cap = g.createRadialGradient(-s * 0.14, -s * 1.12, s * 0.05, 0, -s * 0.9, s * 0.62);
  cap.addColorStop(0, "#f0553f"); cap.addColorStop(0.6, "#c9281f"); cap.addColorStop(1, "#7f1712");
  g.fillStyle = cap;
  g.beginPath(); g.ellipse(0, -s * 0.9, s * 0.56, s * 0.36, 0, Math.PI, 0); g.quadraticCurveTo(0, -s * 0.8, -s * 0.56, -s * 0.9); g.fill();
  g.fillStyle = "#f7efdf";
  for (let i = 0; i < 11; i++) {
    const a = Math.PI + r() * Math.PI, q = 0.25 + r() * 0.7;
    g.beginPath(); g.ellipse(Math.cos(a) * s * 0.5 * q, -s * 0.92 + Math.sin(a) * s * 0.3 * q, s * (0.025 + r() * 0.03), s * 0.022, 0, 0, 7); g.fill();
  }
  g.restore();
}

SCENES.amanita = (g, w, h) => {
  const r = seeded(29);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#0a1410"); sky.addColorStop(0.42, "#16281c"); sky.addColorStop(0.62, "#223a22"); sky.addColorStop(1, "#141f12");
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const light = g.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.6);
  light.addColorStop(0, "rgba(176,206,150,.26)"); light.addColorStop(0.5, "rgba(110,150,110,.08)"); light.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = light; g.fillRect(0, 0, w, h);
  for (let layer = 0; layer < 3; layer++) {
    const n = 16 - layer * 4;
    for (let i = 0; i < n; i++) {
      const x = r() * w, tw = (8 + layer * 12) * (0.7 + r() * 0.8), base = h * (0.5 + layer * 0.07);
      g.fillStyle = ["#1d3024", "#14231a", "#0b150f"][layer];
      g.beginPath(); g.moveTo(x - tw / 2, -10); g.lineTo(x + tw / 2, -10); g.lineTo(x + tw * 0.7, base); g.lineTo(x - tw * 0.7, base); g.fill();
      g.strokeStyle = g.fillStyle; g.lineWidth = 1.4;
      for (let b = 0; b < 8; b++) {
        const y = r() * base * 0.8, l = 26 + r() * 70 * (layer + 1), dir = r() < 0.5 ? -1 : 1;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + dir * l * 0.5, y + 8, x + dir * l, y + 22); g.stroke();
      }
    }
  }
  const ground = g.createLinearGradient(0, h * 0.52, 0, h);
  ground.addColorStop(0, "#1a2c16"); ground.addColorStop(0.5, "#27401f"); ground.addColorStop(1, "#14200f");
  g.fillStyle = ground; g.fillRect(0, h * 0.54, w, h * 0.46);
  for (let i = 0; i < 2400 * (w / 1400); i++) {
    const y = h * 0.54 + r() * h * 0.46;
    g.fillStyle = r() < 0.6 ? `rgba(70,110,50,${r() * 0.3})` : `rgba(80,48,28,${r() * 0.34})`;
    g.fillRect(r() * w, y, 1.5 + r() * 2.5, 1.2);
  }
  const mist = g.createLinearGradient(0, h * 0.4, 0, h * 0.72);
  mist.addColorStop(0, "rgba(190,214,180,0)"); mist.addColorStop(0.5, "rgba(190,214,180,.14)"); mist.addColorStop(1, "rgba(190,214,180,0)");
  g.fillStyle = mist; g.fillRect(0, h * 0.4, w, h * 0.32);
  const ring = [];
  const count = Math.round(44 * Math.min(1.4, w / 1100));
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + r() * 0.12;
    ring.push({ x: w * 0.5 + Math.cos(a) * w * 0.42 * (0.94 + r() * 0.12), y: h * 0.74 + Math.sin(a) * h * 0.16 * (0.94 + r() * 0.12) });
  }
  ring.sort((p, q) => p.y - q.y);
  for (const p of ring) {
    const t = (p.y - h * 0.58) / (h * 0.32), s = (12 + t * 44) * (0.75 + r() * 0.6);
    const glow = g.createRadialGradient(p.x, p.y - s, 0, p.x, p.y - s, s * 2.2);
    glow.addColorStop(0, "rgba(232,80,58,.22)"); glow.addColorStop(1, "rgba(232,80,58,0)");
    g.fillStyle = glow; g.fillRect(p.x - s * 2.4, p.y - s * 3.2, s * 4.8, s * 4.8);
    mushroom(g, p.x, p.y, s, r);
  }
  const still = g.getImageData(0, 0, g.canvas.width, g.canvas.height);
  const motes = Array.from({ length: 46 }, () => ({ x: r() * w, y: r() * h, v: 0.08 + r() * 0.22, s: 0.8 + r() * 1.8, p: r() * 7 }));
  const run = sceneRun;
  const frame = (t) => {
    if (run !== sceneRun) return;
    g.putImageData(still, 0, 0);
    for (const m of motes) {
      const y = ((m.y - t * 0.012 * m.v * 10) % h + h) % h, x = m.x + Math.sin(t / 2600 + m.p) * 16;
      const a = 0.26 + 0.34 * Math.sin(t / 1400 + m.p) ** 2;
      const glow = g.createRadialGradient(x, y, 0, x, y, m.s * 5);
      glow.addColorStop(0, `rgba(244,226,160,${a})`); glow.addColorStop(1, "rgba(244,226,160,0)");
      g.fillStyle = glow; g.fillRect(x - m.s * 5, y - m.s * 5, m.s * 10, m.s * 10);
    }
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) setTimeout(() => requestAnimationFrame(frame), 66);
  };
  frame(0);
};

// --- Dreamcore: an evening that's too clean. A sky, a suburb, a hole in the floor. -----------------
function cloud(g, x, y, s, r, tone) {
  g.fillStyle = tone;
  for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(x + (r() - 0.5) * s * 2, y + (r() - 0.5) * s * 0.5, s * (0.3 + r() * 0.5), s * (0.16 + r() * 0.26), 0, 0, 7); g.fill(); }
}

SCENES.dreamcore = (g, w, h) => {
  const r = seeded(41);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#6f90e4"); sky.addColorStop(0.5, "#a5b6f0"); sky.addColorStop(0.78, "#efc6cc"); sky.addColorStop(1, "#ffdcae");
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) cloud(g, r() * w, h * (0.06 + r() * 0.5), 50 + r() * 90, r, `rgba(255,${226 + r() * 20},${206 + r() * 30},${0.28 + r() * 0.3})`);
  // The street along the bottom: lawn, road, and houses in sherbet colours.
  const lawn = h - 62, houseBase = lawn + 4;
  const cols = ["#f2a7a0", "#a8e6a1", "#f6e08a", "#8fd3df", "#f0a8c8", "#b9a8ef"];
  let x = -30;
  let n = 0;
  while (x < w + 40) {
    const hw = 96 + r() * 60, hh = 34 + r() * 14, c = cols[n++ % cols.length];
    g.fillStyle = c; g.fillRect(x, houseBase - hh, hw, hh);
    g.fillStyle = "#8d7d92";
    g.beginPath(); g.moveTo(x - 8, houseBase - hh); g.lineTo(x + hw * 0.5, houseBase - hh - 24 - r() * 8); g.lineTo(x + hw + 8, houseBase - hh); g.fill();
    g.fillStyle = "rgba(255,255,255,.7)"; g.fillRect(x + hw * 0.16, houseBase - hh * 0.64, hw * 0.22, hh * 0.3);
    g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(x + hw * 0.6, houseBase - hh * 0.72, hw * 0.28, hh * 0.72);
    x += hw + 16 + r() * 34;
  }
  g.fillStyle = "#74d06e"; g.fillRect(0, lawn, w, 24);
  g.fillStyle = "#e7b9c6"; g.fillRect(0, lawn + 24, w, 8);
  g.fillStyle = "#a79fc9"; g.fillRect(0, lawn + 32, w, 30);
  for (let lx = 120; lx < w; lx += 420) {
    g.strokeStyle = "#e9e6ee"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(lx, lawn + 24); g.lineTo(lx, lawn - 120); g.quadraticCurveTo(lx, lawn - 134, lx + 22, lawn - 134); g.stroke();
    g.fillStyle = "#fffbe0"; g.beginPath(); g.ellipse(lx + 28, lawn - 133, 9, 4, 0, 0, 7); g.fill();
  }
  // The tile with a hole in it, floating in the upper right.
  const cx = w - Math.min(170, w * 0.24), cy = 150, tw = Math.min(150, w * 0.2);
  g.save();
  g.translate(cx, cy); g.transform(1, 0.34, -0.8, 0.5, 0, 0);
  g.fillStyle = "#b39a72"; g.fillRect(-tw, -tw, tw * 2, tw * 2);
  for (let i = 0; i < 1500; i++) { g.fillStyle = r() < 0.5 ? "rgba(70,56,34,.35)" : "rgba(236,222,190,.4)"; g.fillRect((r() - 0.5) * tw * 2, (r() - 0.5) * tw * 2, 1.6, 1.6); }
  g.strokeStyle = "rgba(60,48,30,.5)"; g.lineWidth = 1.5; g.strokeRect(-tw, -tw, tw, tw); g.strokeRect(0, 0, tw, tw);
  const hole = g.createLinearGradient(0, -tw * 0.6, 0, tw * 0.6);
  hole.addColorStop(0, "#3d6fe0"); hole.addColorStop(1, "#7fa2f2");
  g.fillStyle = hole; g.fillRect(-tw * 0.6, -tw * 0.6, tw * 1.2, tw * 1.2);
  g.beginPath(); g.rect(-tw * 0.6, -tw * 0.6, tw * 1.2, tw * 1.2); g.clip();
  for (let i = 0; i < 5; i++) cloud(g, (r() - 0.5) * tw, (r() - 0.5) * tw, tw * 0.3, r, "rgba(255,226,178,.75)");
  g.restore();
  g.font = '700 58px "Quicksand", sans-serif'; g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 0; i < 12; i++) {
    const qx = r() * w, qy = r() * h * 0.8, s = 18 + r() * 46;
    g.font = `700 ${s}px "Quicksand", sans-serif`;
    g.fillStyle = `rgba(226,48,62,${0.34 + r() * 0.4})`;
    g.save(); g.translate(qx, qy); g.rotate((r() - 0.5) * 0.5); g.fillText("?", 0, 0); g.restore();
  }
  g.font = '700 15px "Quicksand", sans-serif'; g.textAlign = "left";
  const words = g.createLinearGradient(16, 0, 106, 0);
  for (const [o, c] of [[0, "#ff5fa2"], [0.33, "#ffd24d"], [0.66, "#59e0c5"], [1, "#7a7cff"]]) words.addColorStop(o, c);
  for (let i = 0; i < 5; i++) { g.fillStyle = words; g.fillText("im sorry", 18, h - 196 + i * 22); }
  // A worn tape: every other line a touch darker.
  g.fillStyle = "rgba(60,50,110,.045)";
  for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
};

addEventListener("resize", () => { clearTimeout(paintBackdrop.wait); paintBackdrop.wait = setTimeout(paintBackdrop, 200); });
addEventListener("themechange", paintBackdrop);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintBackdrop);
paintBackdrop();
