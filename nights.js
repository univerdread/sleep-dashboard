// The Overview shows averages only; a night's detail opens when you click it (#/night/<id>).
let S, span = "all", nightsView = "list", showAll = false;
const details = {};
const PART = { duration: "Duration", continuity: "Continuity", stages: "Stages", regularity: "Regularity", heart: "Heart" };
const WORDS = { good: ["✓", "In range"], between: ["–", "Borderline"], poor: ["✕", "Outside"] };

const median = (v) => {
  const a = v.filter((x) => x != null).sort((x, y) => x - y);
  return a.length ? (a[(a.length - 1) >> 1] + a[a.length >> 1]) / 2 : null;
};
const inSpan = () => (span === "all" ? S.nights : S.nights.slice(-Number(span)));

// The promise is what's kept: heart and brain ask for the same file at the same moment.
const detail = (id) => (details[id] ||= LAB.load(S.files[id], S.files[id]));

const section = (title, ...body) => h("section", {}, h("div", { class: "head" }, h("h2", {}, title)), ...body);
const lede = (text) => h("p", { class: "lede" }, text);
const legend = () => h("div", { class: "legend" }, ["W", "R", "1", "2", "3"].map((c) => h("span", {}, h("i", { style: `background:${stageColor(c)}` }), STAGE[c].name)));
const fact = (label, value, unit) => h("div", { class: "fact" }, h("span", {}, label), h("b", {}, value, unit ? ` ${unit}` : ""));
const statusLine = (st) => (st ? h("div", { class: `state ${st}` }, h("i", {}, WORDS[st][0]), WORDS[st][1]) : h("div", { class: "state" }));

function spark(values) {
  const v = values.map((x, i) => [i, x]).filter(([, x]) => x != null);
  if (v.length < 2) return s("svg", { "aria-hidden": "true" });
  const ys = v.map(([, y]) => y), lo = Math.min(...ys), hi = Math.max(...ys);
  const X = (i) => (i / (values.length - 1)) * 100, Y = (y) => 22 - ((y - lo) / (hi - lo || 1)) * 20;
  return s("svg", { viewBox: "0 0 100 24", preserveAspectRatio: "none", "aria-hidden": "true" },
    s("polyline", { points: v.map(([i, y]) => `${X(i).toFixed(1)},${Y(y).toFixed(1)}`).join(" "), fill: "none", stroke: "var(--accent)", "stroke-width": 1.5, "vector-effect": "non-scaling-stroke" }));
}

function metric(label, value, unit, st, key) {
  return h("div", { class: "metric" }, h("div", { class: "label" }, label),
    h("div", { class: "value" }, value, unit ? h("small", {}, unit) : null), statusLine(st), key ? spark(inSpan().map((n) => n[key])) : null);
}

// --- healthy ranges, used for an average and for one night -----------------------------------------
function ranges(values, checks) {
  return h("div", { class: "ranges" }, Object.entries(S.ranges).map(([k, r]) => {
    const [a, b] = r.scale, pos = (v) => Math.max(0, Math.min(100, ((v - a) / (b - a)) * 100));
    const [lo, hi] = r.good, v = values[k], st = checks[k];
    const zone = (kind, from, to) => (to > from ? h("span", { class: `zone ${kind}`, style: `left:${from}%;width:${to - from}%` }) : null);
    const left = r.poor_below != null ? pos(r.poor_below) : 0, right = r.poor_above != null ? pos(r.poor_above) : 100;
    const good = hi == null ? `${lo} ${r.unit} or more` : `${lo}–${hi}${r.unit ? ` ${r.unit}` : ""}`;
    const shown = k === "tst_h" ? hm(v * 60) : `${fmt(v, k === "awakenings" ? 1 : 0)}${r.unit ? ` ${r.unit}` : ""}`;
    return h("div", { class: "range" },
      h("div", { class: "name" }, r.label, h("small", {}, `Healthy: ${good}${r.note ? `. ${r.note}` : ""}`)),
      h("div", { class: "track-r" }, zone("poor", 0, left), zone("mid", left, pos(lo)), zone("good", pos(lo), hi == null ? 100 : pos(hi)),
        hi == null ? null : zone("mid", pos(hi), right), hi == null ? null : zone("poor", right, 100),
        v == null ? null : h("span", { class: "you", style: `left:${pos(v)}%` })),
      v == null ? h("div", { class: "state" }, "Hidden") : h("div", { class: `state ${st}` }, h("i", {}, WORDS[st][0]), `${shown} · ${WORDS[st][1]}`));
  }));
}

// --- overview ---------------------------------------------------------------------------------------
function averagesBlock() {
  const A = S.averages[span], m = A.means, c = A.checks;
  return h("div", { class: "metrics" },
    metric("Sleep score", fmt(m.score), "", null, "score"),
    metric("Asleep", m.tst_h == null ? "–" : hm(m.tst_h * 60), "", c.tst_h, "tst_h"),
    metric("Efficiency", fmt(m.se), "%", c.se, "se"),
    metric("Fell asleep in", fmt(m.sol), "min", c.sol, "sol"),
    metric("Awake after", fmt(m.waso), "min", c.waso, "waso"),
    metric("REM", fmt(m.rem_pct), "%", c.rem_pct, "rem_pct"),
    metric("Deep sleep", fmt(m.n3_pct), "%", c.n3_pct, "n3_pct"),
    metric("Sleeping heart rate", fmt(m.hr_sleep), "bpm", null, "hr_sleep"),
    metric("RMSSD", fmt(m.rmssd), "ms", null, "rmssd"),
    metric("Lucid nights", `${A.lucid}`, `of ${A.nights}`, null, null));
}

function stageStrip(n, lo, hi) {
  const x = (m) => ((m - lo) / (hi - lo)) * 1000;
  return s("svg", { viewBox: "0 0 1000 14", preserveAspectRatio: "none", role: "img", "aria-label": `Stages, ${clock(n.bed_min)} onwards` },
    stageRuns(n.stages).filter((r) => STAGE[r.c]).map((r) => s("rect", {
      x: x(n.bed_min + r.start / 2), y: 0, width: Math.max(x(n.bed_min + r.end / 2) - x(n.bed_min + r.start / 2), 0.8), height: 14, fill: stageColor(r.c) })));
}

function nightList() {
  const lo = Math.min(...S.nights.map((n) => n.bed_min));
  const hi = Math.max(...S.nights.map((n) => n.bed_min + n.stages.length / 2));
  const all = [...S.nights].reverse();
  const rows = showAll ? all : all.slice(0, 7);
  return h("div", { class: "nights" },
    h("div", { class: "nrow headrow" }, ["Night", "Score", "Asleep"].map((t) => h("span", {}, t)),
      ["Efficiency", "REM", "Deep", "Heart"].map((t) => h("span", { class: "opt" }, t)), h("span", { class: "strip" }, `${clock(lo)} to ${clock(hi)}`), h("span", {})),
    rows.map((n) => h("a", { class: "nrow", href: `#/night/${n.id}` },
      h("span", {}, n.label, h("small", {}, n.weekday)), h("span", { class: "score" }, n.score ?? "–"), h("span", {}, hm(n.tst_h * 60)),
      h("span", { class: "opt" }, `${fmt(n.se)} %`), h("span", { class: "opt" }, `${fmt(n.rem_pct)} %`),
      h("span", { class: "opt" }, n.n3_pct == null ? "–" : `${fmt(n.n3_pct)} %`), h("span", { class: "opt" }, fmt(n.hr_sleep)),
      h("span", { class: "strip" }, stageStrip(n, lo, hi)), h("span", { class: "go", "aria-hidden": "true" }, "›"))),
    all.length > rows.length ? h("button", { class: "more", type: "button", onclick: () => { showAll = true; route(); } }, `Show all ${all.length} nights`) : null);
}

function nightsBlock() {
  const open = (id) => { location.hash = `#/night/${id}`; };
  const body = h("div");
  if (nightsView === "list") body.append(nightList());
  else {
    const plate = h("div", { class: "plate rings-plate" }, h("canvas", { role: "img", "aria-label": "Every night as a ring on a dial of the hours you sleep" }));
    body.append(plate);
    rings(plate, S.nights, open);
  }
  const seg = h("div", { class: "segment", role: "group", "aria-label": "How to show the nights" }, [["list", "List"], ["rings", "Rings"]].map(([v, t]) => h("button", {
    type: "button", "aria-pressed": String(nightsView === v), onclick: () => { nightsView = v; route(); } }, t)));
  return h("section", {}, h("div", { class: "head" }, h("h2", {}, "Nights"), seg),
    lede("Click a night to open it."), body, legend());
}

function trendWords(key) {
  const m = S.moves[key], t = S.trends[key];
  if (!m.ready) return `Trend in ${m.needs} more ${m.needs === 1 ? "night" : "nights"}`;
  const per = m.per_week, size = Math.abs(per);
  if (size < Math.abs(m.recent) * 0.005) return "Steady";
  const unit = t.unit ? ` ${t.unit}` : " points";
  const right = (t.better === "up" && per > 0) || (t.better === "down" && per < 0);
  const wrong = (t.better === "up" && per < 0) || (t.better === "down" && per > 0);
  return `${right ? "Improving, " : wrong ? "Slipping, " : ""}${per > 0 ? "up" : "down"} ${size.toFixed(size < 1 ? 2 : 1)}${unit} a week`;
}

function trendsBlock() {
  const take = span === "all" ? S.count : Number(span), from = Math.max(0, S.count - take);
  const dates = S.nights.map((n) => n.date).slice(from), labels = S.nights.map((n) => n.label).slice(from);
  const means = S.averages[span].means;
  const cards = Object.entries(S.trends).map(([k, t]) => {
    const chart = h("div");
    const nd = k === "tst_h" ? 1 : 0;
    lineChart(chart, { dates, labels, values: S.series[k].slice(from), rolling: S.rolling[k].slice(from), mean: means[k], good: S.ranges[k] && S.ranges[k].good,
      normal: S.normal && S.normal[k], unit: t.unit, label: t.label, nd, height: 130 });
    return h("article", { class: "panel chart" }, h("h3", {}, t.label), h("p", { class: "say" }, trendWords(k)), chart);
  });
  const lucidChart = h("div");
  const rate = S.nights.map((_, i) => { const w = S.nights.slice(Math.max(0, i - 29), i + 1); return (100 * w.filter((n) => n.lucid).length) / w.length; }).slice(from);
  lineChart(lucidChart, { dates, labels, values: rate, unit: "%", label: "Lucid nights, last 30", nd: 0, height: 130, domain: [0, 25] });
  cards.splice(1, 0, h("article", { class: "panel chart" }, h("h3", {}, "Lucid dream rate"),
    h("p", { class: "say" }, `${S.lucid.reported} of ${S.lucid.nights} nights · ${S.lucid.verified} confirmed by eye signal`), lucidChart));
  return section("Trends", lede("The grey line is the average, and the green band the healthy range. A thicker line, your 7-night average, starts at 7 nights."),
    h("div", { class: "charts" }, cards));
}

function typicalBlock() {
  const box = h("div");
  streamChart(box, S.typical);
  const col = (k) => S.nights.map((n) => n[k]);
  return section("A typical night", lede("Your nights averaged, from the moment you fall asleep. Deep sleep comes early and REM builds towards morning."),
    h("div", { class: "split" }, h("div", {}, h("div", { class: "plate" }, box), legend()), h("div", { class: "facts" },
      fact("REM periods a night", fmt(median(col("rem_count")))), fact("Between REM periods", fmt(median(col("cycle_min"))), "min"),
      fact("First REM after", fmt(median(col("rem_latency"))), "min"), fact("Deep sleep in the first third", fmt(median(col("n3_early"))), "%"),
      fact("Woke this long after REM", fmt(median(col("since_rem_min"))), "min"))));
}

function timingBlock() {
  const chart = h("div", { class: "panel" });
  timingChart(chart, S.nights, S.usual.mid_min);
  const R = S.regularity;
  return section("Timing", lede("One bar a night, from falling asleep to the last sleep. Bars that line up mean a regular schedule."),
    h("div", { class: "split" }, chart, h("div", {}, h("div", { class: "facts" },
      fact("Usual time asleep", clock(S.usual.on_min)), fact("Usual wake", clock(S.usual.off_min)), fact("Middle of your sleep", clock(S.usual.mid_min)),
      R.ready ? fact("Middle moves by", `±${R.mid_sd}`, "min") : null, R.ready ? fact("Bedtime moves by", `±${R.bed_sd}`, "min") : null,
      R.ready ? fact("Length moves by", `±${R.tst_sd}`, "min") : null),
    R.ready && R.early ? h("p", { class: "fine" }, `From ${R.nights} nights, so these will settle.`) : null)));
}

function lockedBox(what, needs) {
  return h("div", { class: "locked" }, h("b", {}, what), ` opens in ${needs} more ${needs === 1 ? "night" : "nights"}.`,
    h("div", { class: "track-p" }, h("i", { style: `width:${(100 * S.count) / (S.count + needs)}%` })));
}

function habitsBlock() {
  const H = S.habits;
  const body = H.state === "paused" ? h("div", { class: "locked" }, h("b", {}, "Paused while S2 runs."), " Comparing habits now would be an early look at that experiment.")
    : H.state === "locked" ? lockedBox("What goes with your better nights", H.needs)
      : h("div", {}, h("div", { class: "facts" }, H.rows.length ? H.rows.map((r) => fact(`${r.habit} (${r.with} against ${r.without} nights)`, `${r.difference > 0 ? "+" : "−"}${Math.abs(r.difference)}`, "points")) : fact("No habit has four nights on each side yet", "")),
        h("p", { class: "fine" }, "A link, not a cause: you chose those evenings."));
  const M = S.months;
  const months = M.state === "locked" ? lockedBox("Month against month", M.needs)
    : h("div", { class: "scroll-x panel" }, h("table", {}, h("thead", {}, h("tr", {}, ["Month", "Nights", "Score", "Asleep", "Heart", "RMSSD", "Lucid"].map((t) => h("th", { scope: "col" }, t)))),
      h("tbody", {}, M.rows.map((r) => h("tr", {}, h("td", {}, r.month), h("td", {}, r.nights), h("td", {}, fmt(r.score)), h("td", {}, hm(r.tst_h * 60)), h("td", {}, fmt(r.hr_sleep, 1)), h("td", {}, fmt(r.rmssd)), h("td", {}, r.lucid))))));
  return section("Patterns", h("div", { class: "split even" }, body, months));
}

function aboutBlock() {
  return section("About these numbers", h("div", { class: "split even" },
    h("div", { class: "panel" }, h("p", { style: "margin:0;font-size:14px;color:var(--ink2)" },
      "Stages are an estimate: the lab runs YASA on the headband's signals, and no night has been checked by hand yet. Compare nights with each other, and treat this as tracking, not diagnosis. First REM is timed from falling asleep, and REM counts only after 10 minutes of deeper sleep: drifting off can look like REM to a forehead headband. The score's weights are this lab's choice. Regularity and heart join it after three nights, and it settles at seven.")),
    h("div", { class: "panel" }, h("div", { style: "font-size:14px" }, "Ranges are for ages 18–25"), h("ul", { class: "sources" },
      h("li", {}, "Duration: Hirshkowitz et al. 2015, Sleep Health."),
      h("li", {}, "Everything else: Ohayon et al. 2017, Sleep Health."),
      h("li", {}, "REM is the adult (26–64) range, with no consensus at 18–25. Deep sleep has no upper limit at this age."),
      h("li", {}, "Regularity: Windred et al. 2024, Sleep. Older adults, observational.")))));
}

function percentilesBlock() {
  const A = S.averages[span];
  const show = (r, v) => (r.key === "tst_h" ? hm(v * 60) : `${fmt(v, r.key === "hr_sleep" ? 1 : 0)} ${r.unit}`);
  const rows = A.percentiles.map((r) => h("div", { class: "range" },
    h("div", { class: "name" }, r.label, h("small", {}, `You ${show(r, r.value)} · typical ${show(r, r.typical)}`)),
    h("div", { class: "track-r", title: r.source }, h("span", { class: "zone mid", style: "left:0;width:100%" }), h("span", { class: "mark", style: "left:50%" }),
      h("span", { class: "you", style: `left:${r.percentile}%` })),
    h("div", { class: "state" }, `${r.says} about ${r.percentile} %`)));
  return section("Percentiles", lede("Your average among 19-year-old men. The dot is where you'd stand, and the middle line is the typical man."),
    h("div", { class: "ranges pct" }, rows),
    h("p", { class: "fine" }, "Estimates, rounded to 5. Sleep rows are for a man of 19 on a second or later lab night, from the Ottawa calculator built on 169 studies (Boulos 2019). Heart rows are Fitbit data for men around 20 (Quer 2020, Natarajan 2019). Those were measured with different equipment, and a lab isn't home. Further along isn't always better for REM or deep sleep."));
}

function spectraBlock() {
  if (!S.nights.some((n) => n.mini_spec)) return null;
  const plate = h("div", { class: "plate" }, h("canvas", { role: "img", "aria-label": "Every night's spectrogram on one clock" }));
  specWall(plate, S.nights, (id) => { location.hash = `#/night/${id}`; });
  return section("Spectrograms", lede("Every night's brain activity on one clock: time across, frequency up from 0.5 to 25 Hz, brightness for power. The bright columns low down are deep sleep. Click one to open that night."), plate,
    h("div", { class: "legend" }, h("span", {}, h("i", { style: "width:120px;background:linear-gradient(90deg,#1c104e,#58188a,#bc287a,#f3704a,#fdc476,#fff4d6)" }), "Quiet to strong")));
}

function renderOverview() {
  const options = [["all", "All"], ["30", "30 nights"], ["7", "7 nights"]].filter(([v]) => v === "all" || S.count > Number(v));
  const seg = options.length > 1 ? h("div", { class: "segment", role: "group", "aria-label": "Nights to average" }, options.map(([v, t]) => h("button", {
    type: "button", "aria-pressed": String(span === v), onclick: () => { span = v; route(); } }, t))) : null;
  const A = S.averages[span];
  const dreams = S.nights.filter((n) => n.dreams).length;
  $("#app").replaceChildren(
    h("div", { class: "top" }, h("h1", {}, "Averages"), seg),
    h("p", { class: "fine", style: "margin:2px 0 12px" }, `${A.nights} ${A.nights === 1 ? "night" : "nights"} · ${dreams} with a dream saved`),
    averagesBlock(), nightsBlock(), trendsBlock(),
    section("Healthy ranges", lede(`Your average over ${A.nights} ${A.nights === 1 ? "night" : "nights"}, against published ranges for ages 18–25. Green is healthy and red is what the panels called not good. Between them they said neither.`),
      ranges(A.means, A.checks)),
    percentilesBlock(), typicalBlock(), timingBlock(), habitsBlock(), spectraBlock(), aboutBlock());
}

// --- one night --------------------------------------------------------------------------------------
function versus(n, value, key, unit = "", nd = 0, scale = 1) {
  const before = S.nights.slice(0, S.nights.indexOf(n)).slice(-30);
  const u = median(before.map((x) => x[key]));
  if (before.length < 3 || value == null || u == null) return "";
  const d = (value - u) * scale;
  if (Math.abs(d) < 10 ** -nd / 2) return "same as usual";
  return `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(nd)}${unit} vs usual`;
}

function heartBlock(n, d) {
  const line = h("div");
  const cloud = h("div", { class: "plate" }, h("span", { class: "cap" }, "Heartbeat intervals"), h("canvas", { "aria-label": "Each heartbeat interval against the next" }));
  const stage = n.hr_stage || {}, rm = n.rmssd_stage || {};
  heartLine(line, n, d);
  if (d.cloud) heartCloud(cloud, d);
  return section("Heart", h("div", { class: "split" },
    h("div", {}, h("div", { class: "plate" }, line), legend()),
    h("div", { class: "facts" }, fact("Lowest 5 minutes", fmt(n.hr_low, 1), "bpm"), fact("It came at", n.hr_low_min == null ? "–" : clock(n.hr_low_min)),
      ...["N3", "N2", "REM"].filter((k) => stage[k] != null).map((k) => fact(`Heart rate in ${k}`, fmt(stage[k], 1), "bpm")),
      ...["N2", "REM"].filter((k) => rm[k] != null).map((k) => fact(`RMSSD in ${k}`, fmt(rm[k]), "ms")),
      fact("Breathing in N2", fmt((n.breath_stage || {}).N2), "a minute"))),
  d.cloud ? h("div", { style: "max-width:460px;margin-top:10px" }, cloud, h("p", { class: "fine" }, "Each dot is one heartbeat interval against the next, coloured by stage. A wider cloud is a heart that keeps adjusting, which RMSSD measures.")) : null);
}

function brainBlock(n, d) {
  if (!d.spec) return section("Brain", h("p", { class: "fine" }, "Hidden until S1 is unsealed: these pictures could show which nights the clicks were real."));
  const a = h("div", { class: "plate" }, h("span", { class: "cap" }, "Spectrogram"), h("canvas", { "aria-label": "Spectrogram of the night" }));
  const t = h("div", { class: "plate" }, h("span", { class: "cap" }, "Terrain"), h("canvas", { "aria-label": "Ridgeline of the night's brain activity" }));
  aurora(a, n, d);
  terrain(t, n, d);
  return section("Brain", lede("Time across, frequency up, brightness for power. The terrain is the same night as a landscape: a ridge every 15 minutes, falling asleep at the back, showing what rose above the night's average."), a,
    h("div", { style: "margin-top:10px" }, t), legend(),
    h("div", { class: "facts", style: "margin-top:10px" }, fact("Spindles", fmt(n.spindles, 1), "a minute"), fact("Slow waves", fmt(n.slow_waves, 2), "a minute")));
}

function evening(n) {
  return h("div", { class: "facts" }, fact("Caffeine", n.caffeine_mg == null ? "–" : `${fmt(n.caffeine_mg)} mg${n.caffeine_min == null ? "" : ` by ${clock(n.caffeine_min)}`}`),
    fact("Exercise", n.exercise ? `${n.exercise}${n.exercise_min == null ? "" : ` at ${clock(n.exercise_min)}`}` : "–"), fact("Last meal", n.meal_min == null ? "–" : clock(n.meal_min)),
    fact("Screens", n.screens == null ? "–" : `${n.screens} min`), fact("Supplements", n.supplements || "–"), fact("You rated it", n.quality == null ? "–" : `${n.quality} of 5`));
}

function recording(n) {
  return h("div", { class: "facts" }, fact("Recorded", fmt(n.hours, 1), "h"), fact("Data present", fmt(n.present, 2), "%"), fact("Reconnects", fmt(n.reconnects)),
    fact("Battery", `${fmt(n.battery_first)} to ${fmt(n.battery_last)}`, "%"), fact("Staging confidence", fmt(n.confidence * 100), "%"), fact("Dreams saved", n.dreams));
}

async function renderNight(n) {
  const i = S.nights.indexOf(n), prev = S.nights[i - 1], next = S.nights[i + 1];
  const link = (x, t) => (x ? h("a", { href: `#/night/${x.id}` }, t) : h("span", {}, t));
  const parts = Object.keys(PART).map((k) => {
    const p = n.score_parts[k];
    return h("div", { class: "part" }, h("span", {}, PART[k]), h("span", { class: "bar-p" }, h("i", { style: `width:${p ? (100 * p.points) / p.max : 0}%` })),
      h("span", { class: "pts" }, p ? `${Math.round(p.points)}/${p.max}` : "soon"));
  });
  const box = h("div");
  hypnogram(box, n);
  const heart = h("div"), brain = h("div");
  $("#app").replaceChildren(
    h("a", { class: "crumb", href: "#/" }, "‹ All nights"),
    h("div", { class: "top", style: "margin-top:6px" }, h("h1", {}, `Night of ${n.label}`), h("div", { class: "pager" }, link(prev, "‹ Earlier"), link(next, "Later ›"))),
    h("div", { class: "summary" }, h("div", { class: "big-score" }, n.score ?? "–", h("small", {}, `${n.band || ""} · sleep score`)),
      h("div", { class: "parts" }, parts), n.notes.length ? h("ul", { class: "notes" }, n.notes.map((t) => h("li", {}, t))) : h("div")),
    section("Stages", h("div", { class: "plate" }, box), legend()),
    h("div", { class: "metrics", style: "margin-top:14px" },
      metric("Asleep", hm(n.tst_h * 60), "", n.checks.tst_h), metric("Efficiency", fmt(n.se), "%", n.checks.se), metric("Fell asleep in", fmt(n.sol), "min", n.checks.sol),
      metric("Awake after", fmt(n.waso), "min", n.checks.waso), metric("REM", fmt(n.rem), "min", n.checks.rem_pct),
      metric("Deep sleep", n.n3 == null ? "hidden" : fmt(n.n3), n.n3 == null ? "" : "min", n.checks.n3_pct), metric("N1", fmt(n.n1), "min", n.checks.n1_pct),
      metric("Sleeping heart rate", fmt(n.hr_sleep), "bpm"), metric("RMSSD", fmt(n.rmssd), "ms"), metric("First REM after", fmt(n.rem_latency), "min")),
    section("Healthy ranges", ranges(n, n.checks)), heart, brain,
    h("section", {}, h("div", { class: "split even" }, h("div", {}, h("div", { class: "head" }, h("h2", {}, "The evening before")), evening(n)),
      h("div", {}, h("div", { class: "head" }, h("h2", {}, "Recording")), recording(n)))),
    n.report ? h("p", { class: "fine" }, h("a", { href: n.report }, "Open the full night report")) : null);
  const d = await detail(n.id);
  if (location.hash === `#/night/${n.id}`) { heart.replaceChildren(heartBlock(n, d)); brain.replaceChildren(brainBlock(n, d)); }
}

function route() {
  const m = location.hash.match(/^#\/night\/(.+)$/);
  const n = m && S.nights.find((x) => x.id === m[1]);
  return n ? renderNight(n) : renderOverview();
}

async function render() {
  S = await LAB.load("summary");
  $("#stamp").textContent = S.count ? `Updated ${S.built}` : "";
  if (!S.count) { $("#app").replaceChildren(h("p", { class: "empty" }, "No nights yet. Your first recorded night will appear here.")); return; }
  addEventListener("hashchange", () => { scrollTo(0, 0); route(); });
  addEventListener("themechange", async () => { const y = scrollY; await route(); scrollTo(0, y); });
  await route();
}

theme();
unlock(render);
