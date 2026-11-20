// The canvas pictures: rings, the aurora, the terrain and the heart cloud.

// Colour by power, night to fire: a heat scale, so a legend always sits beside it.
const HEAT = (() => {
  const stops = [[0, 6, 8, 20], [0.18, 28, 16, 78], [0.4, 88, 24, 138], [0.6, 188, 40, 122], [0.78, 243, 112, 74], [0.92, 253, 196, 118], [1, 255, 244, 214]];
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const k = stops.findIndex((p) => p[0] >= t);
    const a = stops[Math.max(0, k - 1)], b = stops[Math.max(k, 0)];
    const f = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]);
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * f;
  }
  return lut;
})();

function specImage(bytes, rows, bins, outRows, logF) {
  // One column per epoch; output rows run high frequency to low, on a log axis if asked.
  const c = document.createElement("canvas");
  c.width = rows; c.height = outRows;
  const g = c.getContext("2d");
  const img = g.createImageData(rows, outRows);
  for (let y = 0; y < outRows; y++) {
    const t = 1 - y / (outRows - 1);
    const pos = logF ? logF(t) : t * (bins - 1);
    const b0 = Math.min(bins - 1, Math.floor(pos)), b1 = Math.min(bins - 1, b0 + 1), f = pos - b0;
    for (let x = 0; x < rows; x++) {
      const v0 = bytes[x * bins + b0], v1 = bytes[x * bins + b1];
      const o = (y * rows + x) * 4;
      if (!v0) { img.data[o + 3] = 0; continue; }
      const v = Math.round(v0 + (v1 - v0) * f);
      img.data[o] = HEAT[v * 3]; img.data[o + 1] = HEAT[v * 3 + 1]; img.data[o + 2] = HEAT[v * 3 + 2]; img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Every night as a ring on a dial of the hours you sleep, newest outermost. Rings that line up are
// a regular life, and the colours show where the REM and deep sleep fall. The dial widens to fit
// the nights, so the rings keep filling it.
function rings(box, nights, onPick) {
  const c = box.querySelector("canvas");
  const lo = Math.floor((Math.min(...nights.map((n) => n.bed_min)) - 30) / 60) * 60;
  const hi = Math.ceil((Math.max(...nights.map((n) => n.bed_min + n.stages.length / 2)) + 30) / 60) * 60;
  const SWEEP = (320 / 360) * Math.PI * 2;
  const A0 = -Math.PI / 2 - SWEEP / 2;
  const ang = (m) => A0 + ((m - lo) / (hi - lo)) * SWEEP;
  let geo = null;
  const runsOf = nights.map((n) => stageRuns(n.stages).filter((r) => STAGE[r.c]));
  const draw = () => {
    const { g, w, h: H } = canvasFor(c, c.clientWidth);
    const cx = w / 2, cy = H / 2 + w * 0.012, Rm = Math.min(w, H) / 2;
    const line = cssVar("--plate-line"), muted = cssVar("--plate-muted");
    g.clearRect(0, 0, w, H);
    const outer = Rm * 0.85, inner = Rm * 0.36;
    const gap = Math.min(3, ((outer - inner) / nights.length) * 0.12);
    const th = Math.min(Rm * 0.13, (outer - inner) / nights.length - gap);
    geo = { cx, cy, outer, th, gap };
    g.lineCap = "butt";
    const every = (hi - lo) / 60 > 16 ? 3 : 2;
    for (let m = lo; m <= hi; m += 60) {
      const a = ang(m);
      const hour = ((m / 60 + 12) % 24 + 24) % 24;
      const major = hour % every === 0;
      g.strokeStyle = major ? muted : line;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * Rm * 0.875, cy + Math.sin(a) * Rm * 0.875);
      g.lineTo(cx + Math.cos(a) * Rm * (major ? 0.905 : 0.89), cy + Math.sin(a) * Rm * (major ? 0.905 : 0.89));
      g.stroke();
      if (major) {
        g.fillStyle = muted;
        g.font = `${Math.max(10, Rm * 0.036)}px ${cssVar("--body")}`;
        g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(String(hour).padStart(2, "0"), cx + Math.cos(a) * Rm * 0.95, cy + Math.sin(a) * Rm * 0.95);
      }
    }
    nights.forEach((n, i) => {
      const r = outer - (nights.length - 1 - i) * (th + gap) - th / 2;
      g.strokeStyle = line; g.lineWidth = th;
      g.beginPath(); g.arc(cx, cy, r, A0, A0 + SWEEP); g.stroke();
      for (const run of runsOf[i]) {
        g.strokeStyle = stageColor(run.c); g.lineWidth = th;
        g.beginPath();
        g.arc(cx, cy, r, ang(n.bed_min + run.start / 2), ang(n.bed_min + run.end / 2) + 0.002);
        g.stroke();
      }
    });
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = muted;
    g.font = `${Math.max(11, Rm * 0.045)}px ${cssVar("--body")}`;
    g.fillText(`${nights.length} ${nights.length === 1 ? "night" : "nights"}`, cx, cy);
  };
  const locate = (e) => {
    const b = c.getBoundingClientRect();
    const dx = e.clientX - b.left - geo.cx, dy = e.clientY - b.top - geo.cy;
    const r = Math.hypot(dx, dy);
    const i = nights.length - 1 - Math.floor((geo.outer - r) / (geo.th + geo.gap));
    if (r > geo.outer || i < 0 || i >= nights.length) return null;
    const n = nights[i];
    const turn = (((Math.atan2(dy, dx) - A0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const m = lo + (turn / SWEEP) * (hi - lo);
    return { n, epoch: Math.floor((m - n.bed_min) * 2) };
  };
  c.addEventListener("mousemove", (e) => {
    const p = locate(e);
    if (!p) { tip.hide(); c.style.cursor = "default"; return; }
    c.style.cursor = "pointer";
    const st = p.n.stages[p.epoch];
    tip.show(e.clientX, e.clientY, `<b>${p.n.label}</b>${st ? `<br>${clock(p.n.bed_min + p.epoch / 2)} ${STAGE[st] ? swatch(st) + STAGE[st].name : ""}` : ""}`);
  });
  c.addEventListener("mouseleave", () => tip.hide());
  c.addEventListener("click", (e) => { const p = locate(e); if (p) onPick(p.n.id); });
  onSize(box, draw);
}

// Every night's spectrogram on one clock, newest at the top.
function specWall(box, nights, onPick) {
  const c = box.querySelector("canvas");
  const rows = [...nights].reverse().filter((n) => n.mini_spec);
  const images = rows.map((n) => specImage(b64bytes(n.mini_spec[0]), n.mini_spec[1], n.mini_spec[2], 52));
  let geo = null;
  const draw = () => {
    const rowH = Math.max(26, Math.min(64, 300 / rows.length)), gap = 6, L = 66, R = 12, T = 28, B = 8;
    const H = T + rows.length * (rowH + gap) + B;
    const { g, w } = canvasFor(c, H);
    g.clearRect(0, 0, w, H);
    const lo = Math.floor(Math.min(...rows.map((n) => n.bed_min)) / 60) * 60;
    const hi = Math.ceil(Math.max(...rows.map((n) => n.bed_min + n.stages.length / 2)) / 60) * 60;
    const X = (m) => L + ((m - lo) / (hi - lo)) * (w - L - R);
    geo = { T, rowH, gap };
    g.font = `11.5px ${cssVar("--body")}`; g.textBaseline = "middle";
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    hourTicks(lo, hi, w < 560 ? 180 : 120).forEach((m) => {
      g.strokeStyle = cssVar("--plate-line"); g.beginPath(); g.moveTo(X(m), T - 6); g.lineTo(X(m), H - B); g.stroke();
      g.fillStyle = cssVar("--plate-muted"); g.textAlign = "center"; g.fillText(clock(m), X(m), 13);
    });
    rows.forEach((n, i) => {
      const y = T + i * (rowH + gap);
      g.textAlign = "left"; g.fillStyle = cssVar("--plate-muted"); g.fillText(n.label, 12, y + rowH / 2);
      g.drawImage(images[i], X(n.bed_min), y, X(n.bed_min + n.stages.length / 2) - X(n.bed_min), rowH);
    });
  };
  const rowAt = (e) => rows[Math.floor((e.clientY - c.getBoundingClientRect().top - geo.T) / (geo.rowH + geo.gap))];
  c.addEventListener("mousemove", (e) => {
    const n = rowAt(e);
    if (!n) { tip.hide(); return; }
    c.style.cursor = "pointer";
    tip.show(e.clientX, e.clientY, `<b>${n.label}</b> · open this night`);
  });
  c.addEventListener("mouseleave", () => tip.hide());
  c.addEventListener("click", (e) => { const n = rowAt(e); if (n) onPick(n.id); });
  onSize(box, draw);
}

const BANDS = [["δ", "slow waves", 0.5, 4], ["θ", "drowsy", 4, 8], ["α", "relaxed", 8, 12], ["σ", "spindles", 12, 16], ["β", "alert", 16, 25]];

// One night's brain activity: time across, frequency up (log scale, so the slow waves of deep
// sleep get the room they deserve), brightness for power.
function aurora(box, n, d) {
  const c = box.querySelector("canvas");
  const [b64, rows, bins] = d.spec;
  const bytes = b64bytes(b64);
  const f0 = d.f[0], f1 = d.f[d.f.length - 1];
  const binOf = (t) => (f0 * (f1 / f0) ** t - f0) / ((f1 - f0) / (bins - 1));
  const img = specImage(bytes, rows, bins, 220, binOf);
  const draw = () => {
    const small = c.clientWidth < 560;
    const H = small ? 240 : 320, L = 12, R = 54, T = 30, B = 38;
    const { g, w } = canvasFor(c, H);
    g.clearRect(0, 0, w, H);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(img, L, T, w - L - R, H - T - B);
    const X = (m) => L + ((m - n.bed_min) / (rows / 2)) * (w - L - R);
    const Yf = (f) => T + (1 - Math.log(f / f0) / Math.log(f1 / f0)) * (H - T - B);
    g.font = `11px ${cssVar("--body")}`; g.textBaseline = "middle"; g.textAlign = "left";
    BANDS.forEach(([sym, , a, b]) => {
      g.strokeStyle = "rgba(255,255,255,.14)"; g.beginPath(); g.moveTo(L, Yf(a)); g.lineTo(w - R, Yf(a)); g.stroke();
      g.fillStyle = cssVar("--plate-muted"); g.fillText(`${sym} ${b} Hz`, w - R + 7, (Yf(a) + Yf(b)) / 2);
    });
    const runs = stageRuns(d.stages);
    for (const r of runs) {
      if (!STAGE[r.c]) continue;
      g.fillStyle = stageColor(r.c);
      g.fillRect(X(n.bed_min + r.start / 2), H - B + 5, Math.max(X(n.bed_min + r.end / 2) - X(n.bed_min + r.start / 2), 0.6), 6);
    }
    g.fillStyle = cssVar("--plate-muted"); g.textAlign = "center";
    hourTicks(n.bed_min, n.bed_min + rows / 2, small ? 120 : 60).forEach((m) => g.fillText(clock(m), X(m), H - 13));
    box._geo = { L, R, T, B, w, H };
  };
  c.onmousemove = (e) => {
    const b = c.getBoundingClientRect(), G = box._geo;
    const t = (e.clientX - b.left - G.L) / (G.w - G.L - G.R);
    const v = 1 - (e.clientY - b.top - G.T) / (G.H - G.T - G.B);
    if (t < 0 || t > 1 || v < 0 || v > 1) { tip.hide(); return; }
    const i = Math.min(rows - 1, Math.floor(t * rows));
    const f = f0 * (f1 / f0) ** v;
    const band = BANDS.find(([, , a, z]) => f >= a && f < z) || BANDS[4];
    const st = d.stages[i];
    tip.show(e.clientX, e.clientY, `<b>${clock(n.bed_min + i / 2)}</b> · ${f.toFixed(1)} Hz<br>${band[0]} ${band[1]}<br>${STAGE[st] ? swatch(st) + STAGE[st].name : ""}`);
  };
  c.onmouseleave = () => tip.hide();
  onSize(box, draw);
}

// The same spectra as a landscape: a ridge every 15 minutes, falling asleep at the back, morning at
// the front, each in the colour of the stage it mostly was. A ridge shows what's above the night's
// own average at each frequency, so deep sleep rears up on the left and spindles rise around 13 Hz.
function terrain(box, n, d) {
  const c = box.querySelector("canvas");
  const [b64, rows, bins] = d.spec;
  const bytes = b64bytes(b64);
  const mean = new Float32Array(bins), seen = new Uint32Array(bins);
  for (let k = 0; k < rows; k++) for (let b = 0; b < bins; b++) { const x = bytes[k * bins + b]; if (x) { mean[b] += x; seen[b]++; } }
  for (let b = 0; b < bins; b++) mean[b] = seen[b] ? mean[b] / seen[b] : 0;
  const per = 30;
  const ridges = [];
  for (let i = 0; i + per <= rows; i += per) {
    const v = new Float32Array(bins), got = new Uint16Array(bins);
    const count = {};
    for (let k = i; k < i + per; k++) {
      count[d.stages[k]] = (count[d.stages[k]] || 0) + 1;
      for (let b = 0; b < bins; b++) { const x = bytes[k * bins + b]; if (x) { v[b] += x; got[b]++; } }
    }
    const raw = Array.from(v, (x, b) => (got[b] ? x / got[b] - mean[b] : 0));
    const smooth = raw.map((_, b) => (raw[Math.max(0, b - 1)] + 2 * raw[b] + raw[Math.min(bins - 1, b + 1)]) / 4);
    const stage = Object.entries(count).filter(([k]) => STAGE[k]).sort((a, z) => z[1] - a[1])[0];
    ridges.push({ v: smooth, c: stage ? stage[0] : "2", m: n.bed_min + i / 2 });
  }
  const f0 = d.f[0], f1 = d.f[d.f.length - 1];
  const draw = () => {
    const small = c.clientWidth < 560;
    const H = small ? 420 : 560, L = small ? 18 : 70, R = small ? 18 : 70, T = small ? 110 : 160, B = 40;
    const { g, w } = canvasFor(c, H);
    g.clearRect(0, 0, w, H);
    const plate = cssVar("--plate");
    const step = (H - T - B) / Math.max(ridges.length - 1, 1);
    // As tall as the plate allows: the highest ridge just clears the top.
    const amp = Math.min(small ? 2.4 : 3.6, ...ridges.map((r, i) => (T + i * step - 26) / Math.max(1, Math.max(...r.v) + 8)));
    const X = (b) => L + (Math.log(d.f[b] / f0) / Math.log(f1 / f0)) * (w - L - R);
    ridges.forEach((r, i) => {
      const y0 = T + i * step;
      const pts = Array.from({ length: bins }, (_, b) => {
        const edge = Math.min(1, b / 2, (bins - 1 - b) / 6);
        return [X(b), y0 - Math.max(0, r.v[b] + 8) * amp * edge];
      });
      const path = new Path2D();
      path.moveTo(L, y0);
      pts.forEach(([x, y], k) => {
        const [nx, ny] = pts[Math.min(k + 1, bins - 1)];
        path.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
      });
      path.lineTo(w - R, y0);
      const fill = new Path2D(path);
      fill.lineTo(w - R, y0 + 3); fill.lineTo(L, y0 + 3); fill.closePath();
      g.fillStyle = plate; g.fill(fill);
      g.strokeStyle = stageColor(r.c); g.lineWidth = small ? 1.1 : 1.5; g.lineJoin = "round"; g.stroke(path);
    });
    g.font = `11px ${cssVar("--body")}`; g.fillStyle = cssVar("--plate-muted"); g.textBaseline = "middle";
    if (!small) {
      g.textAlign = "right"; g.fillText(clock(ridges[0].m), L - 12, T);
      g.fillText(clock(ridges[ridges.length - 1].m), L - 12, T + (ridges.length - 1) * step);
    }
    g.textAlign = "center";
    [1, 2, 4, 8, 13, 24].forEach((f) => g.fillText(`${f} Hz`, L + (Math.log(f / f0) / Math.log(f1 / f0)) * (w - L - R), H - 16));
  };
  onSize(box, draw);
}

// Each heartbeat interval against the next. A wide cloud is a heart that keeps adjusting, the
// variation RMSSD measures; a tight one is steady. Stages sit in different parts of the cloud.
function heartCloud(box, d) {
  const c = box.querySelector("canvas");
  const draw = () => {
    const { g, w } = canvasFor(c, c.clientWidth);
    const L = 44, B = 40, T = 34, R = 16;
    const lo = 550, hi = 1450;
    const X = (v) => L + ((v - lo) / (hi - lo)) * (w - L - R);
    const Y = (v) => w - B - ((v - lo) / (hi - lo)) * (w - T - B);
    g.clearRect(0, 0, w, w);
    g.strokeStyle = cssVar("--plate-line"); g.beginPath(); g.moveTo(X(lo), Y(lo)); g.lineTo(X(hi), Y(hi)); g.stroke();
    g.font = `11px ${cssVar("--body")}`; g.fillStyle = cssVar("--plate-muted"); g.textBaseline = "middle"; g.textAlign = "center";
    [600, 800, 1000, 1200, 1400].forEach((v) => { g.fillText(v, X(v), w - B + 14); g.textAlign = "right"; g.fillText(v, L - 7, Y(v)); g.textAlign = "center"; });
    g.fillText("this beat's interval, ms", (L + w - R) / 2, w - 13);
    g.globalCompositeOperation = cssVar("--cloud-blend");
    for (const code of ["W", "1", "2", "3", "R"]) {
      const p = d.cloud && d.cloud[code];
      if (!p) continue;
      g.fillStyle = stageColor(code); g.globalAlpha = 0.4;
      for (let i = 0; i < p.a.length; i++) { g.beginPath(); g.arc(X(p.a[i]), Y(p.b[i]), 1.7, 0, 7); g.fill(); }
    }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  };
  onSize(box, draw);
}
