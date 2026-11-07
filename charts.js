// The drawn-in-SVG charts: a night's stages, lines over time, timing and the typical night.

function stageRuns(stages) {
  const runs = [];
  for (let i = 0; i < stages.length; i++) {
    const last = runs[runs.length - 1];
    if (last && last.c === stages[i]) last.end = i + 1;
    else runs.push({ c: stages[i], start: i, end: i + 1 });
  }
  return runs;
}

const hourTicks = (from, to, every = 60) => {
  const out = [];
  for (let m = Math.ceil(from / every) * every; m <= to; m += every) out.push(m);
  return out;
};

// The night as five lanes, deepest at the bottom. Position carries the stage as well as colour.
function hypnogram(box, n) {
  const LANES = ["W", "R", "1", "2", "3"];
  const LABEL = { W: "Awake", R: "REM", 1: "N1", 2: "N2", 3: "N3" };
  const draw = (w) => {
    const H = w < 560 ? 170 : 208, L = 50, R = 12, T = 12, B = 26;
    const lane = (H - T - B) / LANES.length;
    const end = n.bed_min + n.stages.length / 2;
    const x = (m) => L + ((m - n.bed_min) / (end - n.bed_min)) * (w - L - R);
    const y = (c) => T + LANES.indexOf(c) * lane;
    const runs = stageRuns(n.stages).filter((r) => LANES.includes(r.c));
    const svg = s("svg", { viewBox: `0 0 ${w} ${H}`, height: H, role: "img", "aria-label": `Sleep stages for the night of ${n.label}` });
    LANES.forEach((c) => {
      svg.append(s("line", { x1: L, x2: w - R, y1: y(c) + lane / 2, y2: y(c) + lane / 2, stroke: "var(--plate-line)" }));
      const t = s("text", { x: 12, y: y(c) + lane / 2 + 4, fill: "var(--plate-muted)", "font-size": 11 }); t.textContent = LABEL[c]; svg.append(t);
    });
    const step = Math.max(60, Math.ceil((end - n.bed_min) / (w < 560 ? 4 : 9) / 60) * 60);
    hourTicks(n.bed_min, end, step).forEach((m) => {
      const t = s("text", { x: x(m), y: H - 8, fill: "var(--plate-muted)", "font-size": 11, "text-anchor": "middle" }); t.textContent = clock(m); svg.append(t);
    });
    let prev = null;
    for (const r of runs) {
      const a = x(n.bed_min + r.start / 2), b = x(n.bed_min + r.end / 2);
      if (prev) svg.append(s("line", { x1: a, x2: a, y1: y(prev.c) + lane / 2, y2: y(r.c) + lane / 2, stroke: "var(--plate-line)" }));
      svg.append(s("rect", { x: a, y: y(r.c) + lane * 0.2, width: Math.max(b - a, 1), height: lane * 0.6, rx: 2, fill: stageColor(r.c) }));
      prev = r;
    }
    const hit = s("rect", { x: L, y: 0, width: w - L - R, height: H - B, fill: "transparent" });
    hit.addEventListener("mousemove", (e) => {
      const px = e.clientX - svg.getBoundingClientRect().left;
      const i = Math.max(0, Math.min(n.stages.length - 1, Math.floor(((px - L) / (w - L - R)) * n.stages.length)));
      const c = n.stages[i];
      tip.show(e.clientX, e.clientY, `<b>${clock(n.bed_min + i / 2)}</b><br>${STAGE[c] ? swatch(c) + STAGE[c].name : "No data"}`);
    });
    hit.addEventListener("mouseleave", () => tip.hide());
    svg.append(hit);
    box.replaceChildren(svg);
  };
  onSize(box, draw);
}

const niceSteps = (lo, hi, n = 3) => {
  const raw = (hi - lo) / n || 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => k >= raw);
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
};

// A measure over time. Skipped nights leave a gap in the axis, not a false neighbour.
function lineChart(box, o) {
  const day = (d) => Math.round(new Date(`${d}T12:00:00Z`).getTime() / 864e5);
  const draw = (w) => {
    const H = o.height || 150, L = 34, R = o.endLabel === false ? 10 : 42, T = 10, B = 22;
    const pts = o.dates.map((d, i) => ({ d, x: day(d), y: o.values[i], r: o.rolling ? o.rolling[i] : null, i }));
    const have = pts.filter((p) => p.y != null);
    const svg = s("svg", { viewBox: `0 0 ${w} ${H}`, height: H, role: "img", "aria-label": o.label });
    if (!have.length) { box.replaceChildren(svg); return; }
    const x0 = Math.min(...pts.map((p) => p.x)), x1 = Math.max(...pts.map((p) => p.x));
    const X = (v) => (x1 === x0 ? (L + w - R) / 2 : L + ((v - x0) / (x1 - x0)) * (w - L - R));
    const all = [...have.map((p) => p.y)];
    let lo = Math.min(...all), hi = Math.max(...all);
    if (o.good) {
      lo = Math.min(lo, Math.max(o.good[0], lo - (hi - lo || 1) * 2));
      if (o.good[1] != null) hi = Math.max(hi, Math.min(o.good[1], hi + (hi - lo || 1) * 2));
    }
    if (o.floor != null) lo = Math.min(lo, o.floor);
    const pad = (hi - lo || Math.abs(hi) * 0.1 || 1) * 0.14;
    lo -= pad; hi += pad;
    if (o.domain) { lo = o.domain[0]; hi = Math.max(o.domain[1], hi); }
    const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    niceSteps(lo, hi).forEach((v) => {
      svg.append(s("line", { x1: L, x2: w - R, y1: Y(v), y2: Y(v), stroke: "var(--line)" }));
      const t = s("text", { x: L - 7, y: Y(v) + 4, fill: "var(--muted)", "font-size": 11, "text-anchor": "end" }); t.textContent = +v.toFixed(2); svg.append(t);
    });
    const band = (r, fill) => {
      const a = Y(Math.min(r[1] ?? hi, hi)), b = Y(Math.max(r[0], lo));
      if (b > a) svg.append(s("rect", { x: L, y: a, width: w - L - R, height: b - a, fill }));
    };
    if (o.good) band(o.good, "color-mix(in srgb, var(--good) 12%, transparent)");
    if (o.normal) band(o.normal, "color-mix(in srgb, var(--ink) 7%, transparent)");
    if (o.mean != null) svg.append(s("line", { x1: L, x2: w - R, y1: Y(o.mean), y2: Y(o.mean), stroke: "var(--muted)" }));
    const line = (key, attrs) => {
      let dPath = "", pen = false;
      for (const p of pts) {
        if (p[key] == null) { pen = false; continue; }
        dPath += `${pen ? "L" : "M"}${X(p.x).toFixed(1)} ${Y(p[key]).toFixed(1)}`; pen = true;
      }
      svg.append(s("path", { d: dPath, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", ...attrs }));
    };
    const rolled = pts.some((p) => p.r != null);
    line("y", { stroke: "var(--accent)", "stroke-width": rolled ? 1 : 2, opacity: rolled ? 0.4 : 1 });
    if (rolled) line("r", { stroke: "var(--accent)", "stroke-width": 2.5 });
    if (have.length <= 40) have.forEach((p) => svg.append(s("circle", { cx: X(p.x), cy: Y(p.y), r: 4, fill: "var(--accent)", stroke: "var(--surface)", "stroke-width": 2 })));
    const end = have[have.length - 1];
    if (o.endLabel !== false) {
      const t = s("text", { x: X(end.x) + 9, y: Y(end.y) + 4, fill: "var(--ink)", "font-size": 12 }); t.textContent = fmt(end.y, o.nd); svg.append(t);
    }
    const shown = [have[0], end].filter((p, i, a) => i === 0 || p !== a[0]);
    shown.forEach((p, i) => {
      const t = s("text", { x: X(p.x), y: H - 6, fill: "var(--muted)", "font-size": 11, "text-anchor": have.length === 1 ? "middle" : i ? "end" : "start" });
      t.textContent = o.labels[p.i]; svg.append(t);
    });
    const hair = s("line", { y1: T, y2: H - B, stroke: "var(--line-strong)", opacity: 0 });
    svg.append(hair);
    const hit = s("rect", { x: 0, y: 0, width: w, height: H, fill: "transparent" });
    hit.addEventListener("mousemove", (e) => {
      const px = e.clientX - svg.getBoundingClientRect().left;
      const p = have.reduce((a, b) => (Math.abs(X(b.x) - px) < Math.abs(X(a.x) - px) ? b : a));
      hair.setAttribute("x1", X(p.x)); hair.setAttribute("x2", X(p.x)); hair.setAttribute("opacity", 1);
      tip.show(e.clientX, e.clientY, `<b>${o.labels[p.i]}</b><br>${fmt(p.y, o.nd)} ${o.unit || ""}${p.r != null ? `<br>7-night average ${fmt(p.r, o.nd)}` : ""}`);
    });
    hit.addEventListener("mouseleave", () => { hair.setAttribute("opacity", 0); tip.hide(); });
    svg.append(hit);
    box.replaceChildren(svg);
  };
  onSize(box, draw);
}

// When each night was slept: one bar a night from falling asleep to the last sleep, time running
// down the page. Bars that line up are a regular schedule.
function timingChart(box, nights, usualMid) {
  const draw = (w) => {
    const H = 250, L = 46, R = 12, T = 12, B = 24;
    const lo = Math.floor(Math.min(...nights.map((n) => n.on_min)) / 60) * 60 - 30;
    const hi = Math.ceil(Math.max(...nights.map((n) => n.off_min)) / 60) * 60 + 30;
    const Y = (m) => T + ((m - lo) / (hi - lo)) * (H - T - B);
    const slot = (w - L - R) / nights.length;
    const bw = Math.min(24, slot * 0.6);
    const svg = s("svg", { viewBox: `0 0 ${w} ${H}`, height: H, role: "img", "aria-label": "Sleep times of every night" });
    hourTicks(lo, hi, 120).forEach((m) => {
      svg.append(s("line", { x1: L, x2: w - R, y1: Y(m), y2: Y(m), stroke: "var(--line)" }));
      const t = s("text", { x: L - 8, y: Y(m) + 4, fill: "var(--muted)", "font-size": 11, "text-anchor": "end" }); t.textContent = clock(m); svg.append(t);
    });
    if (usualMid != null) svg.append(s("line", { x1: L, x2: w - R, y1: Y(usualMid), y2: Y(usualMid), stroke: "var(--accent)", "stroke-width": 1, opacity: 0.6 }));
    nights.forEach((n, i) => {
      const cx = L + slot * (i + 0.5);
      const bar = s("rect", { x: cx - bw / 2, y: Y(n.on_min), width: bw, height: Y(n.off_min) - Y(n.on_min), rx: 4, fill: "var(--n2)" });
      bar.addEventListener("mousemove", (e) => tip.show(e.clientX, e.clientY, `<b>${n.label}</b><br>Asleep ${clock(n.on_min)}<br>Awake ${clock(n.off_min)}<br>Middle ${clock(n.mid_min)}`));
      bar.addEventListener("mouseleave", () => tip.hide());
      svg.append(bar, s("circle", { cx, cy: Y(n.mid_min), r: 4, fill: "var(--accent)", stroke: "var(--surface)", "stroke-width": 2, "pointer-events": "none" }));
      if (nights.length <= 12 || i === 0 || i === nights.length - 1) {
        const t = s("text", { x: cx, y: H - 6, fill: "var(--muted)", "font-size": 11, "text-anchor": "middle" }); t.textContent = n.label.split(" ")[0]; svg.append(t);
      }
    });
    box.replaceChildren(svg);
  };
  onSize(box, draw);
}

// The share of nights in each stage through the night, deepest at the bottom.
function streamChart(box, typ) {
  const ORDER = ["3", "2", "1", "R", "W"];
  const draw = (w) => {
    const H = w < 560 ? 220 : 260, L = 12, R = 12, T = 12, B = 28;
    const used = typ.nights.map((k) => k > 0);
    const last = used.lastIndexOf(true);
    const n = last + 1;
    const X = (i) => L + (i / Math.max(n - 1, 1)) * (w - L - R);
    const Y = (v) => T + (1 - v) * (H - T - B);
    const svg = s("svg", { viewBox: `0 0 ${w} ${H}`, height: H, role: "img", "aria-label": "Sleep stages through a typical night" });
    const base = new Array(n).fill(0);
    ORDER.forEach((c) => {
      const top = base.map((b, i) => b + (typ.shares[c][i] || 0));
      let d = `M${X(0)} ${Y(top[0])}`;
      for (let i = 1; i < n; i++) d += `L${X(i).toFixed(1)} ${Y(top[i]).toFixed(1)}`;
      for (let i = n - 1; i >= 0; i--) d += `L${X(i).toFixed(1)} ${Y(base[i]).toFixed(1)}`;
      svg.append(s("path", { d: `${d}Z`, fill: stageColor(c), stroke: "var(--plate)", "stroke-width": 1 }));
      top.forEach((v, i) => { base[i] = v; });
    });
    for (let hr = 0; hr * 4 <= n - 1; hr++) {
      const t = s("text", { x: X(hr * 4), y: H - 9, fill: "var(--plate-muted)", "font-size": 11, "text-anchor": hr ? "middle" : "start" });
      t.textContent = hr ? `${hr} h` : "Asleep"; svg.append(t);
    }
    const hair = s("line", { y1: T, y2: H - B, stroke: "var(--plate-ink)", opacity: 0 });
    svg.append(hair);
    const hit = s("rect", { x: 0, y: 0, width: w, height: H, fill: "transparent" });
    hit.addEventListener("mousemove", (e) => {
      const px = e.clientX - svg.getBoundingClientRect().left;
      const i = Math.max(0, Math.min(n - 1, Math.round(((px - L) / (w - L - R)) * (n - 1))));
      hair.setAttribute("x1", X(i)); hair.setAttribute("x2", X(i)); hair.setAttribute("opacity", 0.5);
      const rows = [...ORDER].reverse().map((c) => `${swatch(c)}${STAGE[c].name} ${Math.round((typ.shares[c][i] || 0) * 100)} %`).join("<br>");
      tip.show(e.clientX, e.clientY, `<b>${hm(i * typ.minutes_per_bin)} after falling asleep</b><br>${rows}`);
    });
    hit.addEventListener("mouseleave", () => { hair.setAttribute("opacity", 0); tip.hide(); });
    svg.append(hit);
    box.replaceChildren(svg);
  };
  onSize(box, draw);
}

// Heart rate through the night, each stretch in its stage's colour.
function heartLine(box, n, d) {
  const draw = (w) => {
    const H = 210, L = 38, R = 12, T = 14, B = 26;
    const hr = d.hr.map((_, i) => {
      const v = d.hr.slice(Math.max(0, i - 3), i + 4).filter((x) => x != null);
      return v.length >= 3 ? v.reduce((a, b) => a + b) / v.length : null;
    });
    const got = hr.filter((v) => v != null);
    const svg = s("svg", { viewBox: `0 0 ${w} ${H}`, height: H, role: "img", "aria-label": "Heart rate through the night" });
    if (!got.length) { box.replaceChildren(svg); return; }
    const lo = Math.floor(Math.min(...got) / 5) * 5 - 2, hi = Math.ceil(Math.max(...got) / 5) * 5 + 2;
    const X = (i) => L + (i / (hr.length - 1)) * (w - L - R);
    const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    niceSteps(lo, hi, 4).forEach((v) => {
      svg.append(s("line", { x1: L, x2: w - R, y1: Y(v), y2: Y(v), stroke: "var(--plate-line)" }));
      const t = s("text", { x: L - 7, y: Y(v) + 4, fill: "var(--plate-muted)", "font-size": 11, "text-anchor": "end" }); t.textContent = v; svg.append(t);
    });
    for (const r of stageRuns(d.stages)) {
      let path = "", pen = false;
      for (let i = r.start; i <= Math.min(r.end, hr.length - 1); i++) {
        if (hr[i] == null) { pen = false; continue; }
        path += `${pen ? "L" : "M"}${X(i).toFixed(1)} ${Y(hr[i]).toFixed(1)}`; pen = true;
      }
      if (path) svg.append(s("path", { d: path, fill: "none", stroke: stageColor(r.c), "stroke-width": 2, "stroke-linecap": "round" }));
    }
    const end = n.bed_min + hr.length / 2;
    hourTicks(n.bed_min, end, w < 560 ? 120 : 60).forEach((m) => {
      const t = s("text", { x: X((m - n.bed_min) * 2), y: H - 8, fill: "var(--plate-muted)", "font-size": 11, "text-anchor": "middle" }); t.textContent = clock(m); svg.append(t);
    });
    const hit = s("rect", { x: L, y: 0, width: w - L - R, height: H, fill: "transparent" });
    hit.addEventListener("mousemove", (e) => {
      const px = e.clientX - svg.getBoundingClientRect().left;
      const i = Math.max(0, Math.min(hr.length - 1, Math.round(((px - L) / (w - L - R)) * (hr.length - 1))));
      const c = d.stages[i];
      tip.show(e.clientX, e.clientY, `<b>${clock(n.bed_min + i / 2)}</b> ${hr[i] == null ? "no reading" : `${Math.round(hr[i])} bpm`}<br>${STAGE[c] ? swatch(c) + STAGE[c].name : ""}`);
    });
    hit.addEventListener("mouseleave", () => tip.hide());
    svg.append(hit);
    box.replaceChildren(svg);
  };
  onSize(box, draw);
}
