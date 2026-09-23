import { forward, gamma, BETA_MIN, BETA_MAX } from "./engine/lorentz.js";
import { intervalSquared, classify, KIND_LABEL } from "./engine/intervals.js";
import { receptionTime } from "./engine/receptions.js";
import { defaultScenario, validateBeta, validateEvent, ENGINE_VERSION, SCENARIO_ID } from "./engine/scenarios.js";

// WCAG: semantic structure lives in index.html; here we keep DOM updates + engine wiring.
// Reduced motion: pulse becomes static border via CSS; play steps discretely.
const $ = (id) => document.getElementById(id);
const SVGNS = "http://www.w3.org/2000/svg";

const scenario = defaultScenario();
const state = {
  beta: scenario.beta,
  events: structuredClone(scenario.events),
  prediction: null,
  phase: "setup", // setup -> predicted -> playing -> comparing -> report
  frame: "S",
  cursorT: 0,
  playing: false,
  lastValidBeta: scenario.beta,
  lastValidEvents: structuredClone(scenario.events),
};

const els = {
  form: $("setup-form"), beta: $("beta"), betaQuick: $("beta-quick"),
  aT: $("a-t"), aX: $("a-x"), bT: $("b-t"), bX: $("b-x"),
  betaError: $("beta-error"), eventError: $("event-error"), setupStatus: $("setup-status"),
  frame: $("frame-select"), cursor: $("time-cursor"), cursorReadout: $("cursor-readout"),
  cursorFrame: $("cursor-frame-label"), play: $("play-btn"), stop: $("stop-btn"),
  eventBody: document.querySelector("#event-table tbody"),
  arrivalBody: document.querySelector("#arrival-table tbody"),
  intervalBadge: $("interval-badge"), intervalValue: $("interval-value"),
  plot: $("plot-svg"), plotCaption: $("plot-caption"), scene: $("scene-svg"),
  compare: $("compare-btn"), compareOut: $("compare-output"),
  explanation: $("explanation"), save: $("save-btn"), exportBtn: $("export-btn"),
  saveStatus: $("save-status"), recordList: $("record-list"),
  stepper: $("stepper"), start: $("start-btn"),
  logDialog: $("log-dialog"), logBody: $("log-body"),
};

function setPhase(p) {
  state.phase = p;
  els.stepper.querySelectorAll("li").forEach((li) => {
    if (li.dataset.step === p) li.setAttribute("aria-current", "step");
    else li.removeAttribute("aria-current");
  });
  // gi-pulse: exactly one primary action carries .is-pulse
  for (const b of [$("predict-btn"), els.compare, els.save]) b.classList.remove("is-pulse");
  if (p === "setup") $("predict-btn").classList.add("is-pulse");
  if (p === "predicted" || p === "playing") els.compare.classList.add("is-pulse");
  if (p === "comparing") els.save.classList.add("is-pulse");
}

function readInputs() {
  // 빈 칸은 Number("")===0이 되어 조용히 0으로 바뀌므로, 비어 있으면 NaN으로 돌려 검증에서 막는다.
  const toNum = (el) => (el.value.trim() === "" ? NaN : Number(el.value));
  const beta = toNum(els.beta);
  const a = { id: "A", tSeconds: toNum(els.aT), xLightSeconds: toNum(els.aX), sourceId: "platform-left" };
  const b = { id: "B", tSeconds: toNum(els.bT), xLightSeconds: toNum(els.bX), sourceId: "platform-right" };
  return { beta, events: [a, b] };
}

function applyInputs(beta, events, { fromQuick = false } = {}) {
  const vb = validateBeta(beta);
  if (!vb.ok) {
    els.betaError.textContent = vb.reason + " 이전 유효값 " + state.lastValidBeta + " 유지.";
    els.betaError.hidden = false;
    els.beta.setAttribute("aria-invalid", "true");
    return false;
  }
  for (const e of events) {
    const v = validateEvent(e.tSeconds, e.xLightSeconds);
    if (!v.ok) {
      els.eventError.textContent = `사건 ${e.id}: ${v.reason} 이전 유효값 유지.`;
      els.eventError.hidden = false;
      return false;
    }
  }
  els.betaError.hidden = true;
  els.eventError.hidden = true;
  els.beta.removeAttribute("aria-invalid");
  state.beta = beta;
  state.events = events;
  state.lastValidBeta = beta;
  state.lastValidEvents = structuredClone(events);
  if (!fromQuick) els.betaQuick.value = String(beta);
  else els.beta.value = String(beta);
  // Train receiver moves with beta
  scenario.receivers[1].v = beta;
  return true;
}

function transformed() {
  return state.events.map((e) => {
    const p = forward(e.tSeconds, e.xLightSeconds, state.beta);
    return { ...e, tp: p.t, xp: p.x };
  });
}

function arrivals() {
  // Receivers defined in S; for arrival times physics is frame-independent — solve in S.
  const recs = [
    { id: "platform-mid", x0: 0, v: 0, label: "플랫폼 중앙" },
    { id: "train-mid", x0: 0, v: state.beta, label: "이동 관찰자" },
  ];
  return recs.map((r) => {
    const hits = state.events.map((e) => receptionTime({ t: e.tSeconds, x: e.xLightSeconds }, r));
    return { receiver: r, hits };
  });
}

function fmt(n, d = 2) {
  if (n == null || !Number.isFinite(n)) return "—";
  const v = Math.abs(n) < 0.0005 ? 0 : n;
  return v.toFixed(d);
}

function renderTables() {
  const rows = transformed();
  els.eventBody.innerHTML = rows.map((e) =>
    `<tr><th scope="row">${e.id}</th><td class="num">${fmt(e.tSeconds)}</td><td class="num">${fmt(e.xLightSeconds)}</td><td class="num">${fmt(e.tp)}</td><td class="num">${fmt(e.xp)}</td></tr>`
  ).join("");
  const arr = arrivals();
  els.arrivalBody.innerHTML = arr.map(({ receiver, hits }) => {
    const [ha, hb] = hits;
    const first = ha && hb ? (Math.abs(ha.t - hb.t) < 1e-9 ? "동시" : ha.t < hb.t ? "A" : "B") : "—";
    return `<tr><th scope="row">${receiver.label}</th><td class="num">${ha ? fmt(ha.t) + "초" : "도착 없음"}</td><td class="num">${hb ? fmt(hb.t) + "초" : "도착 없음"}</td><td>${first}</td></tr>`;
  }).join("");
  const [A, B] = state.events;
  const ds2 = intervalSquared(B.tSeconds - A.tSeconds, B.xLightSeconds - A.xLightSeconds);
  const kind = classify(ds2);
  els.intervalBadge.dataset.kind = kind;
  els.intervalBadge.textContent = KIND_LABEL[kind];
  els.intervalValue.textContent = `Δs² = ${fmt(ds2)} (Δt=${fmt(B.tSeconds - A.tSeconds)}, Δx=${fmt(B.xLightSeconds - A.xLightSeconds)})`;
  // Compare sentence: event-time simultaneity in S'
  const [TA, TB] = [rows[0].tp, rows[1].tp];
  const g = gamma(state.beta);
  els.compareOut.textContent = `β=${fmt(state.beta)} (γ=${fmt(g)}) · S′(t′ A=${fmt(TA)}, B=${fmt(TB)}) — ` +
    (Math.abs(TA - TB) < 1e-9 ? "S′에서도 동시" : TA < TB ? `S′에서는 A가 ${fmt(TB - TA)}초 먼저` : `S′에서는 B가 ${fmt(TA - TB)}초 먼저`);
}

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function renderPlot() {
  const svg = els.plot;
  svg.innerHTML = "";
  const W = 560, H = 480, pad = 48;
  // Points in selected frame
  const rows = transformed();
  const pts = rows.map((e) => state.frame === "S" ? { id: e.id, t: e.tSeconds, x: e.xLightSeconds } : { id: e.id, t: e.tp, x: e.xp });
  let xs = pts.map((p) => p.x), ts = pts.map((p) => p.t);
  // Include light-cone corners for context
  let xMin = Math.min(-3, ...xs) - 1, xMax = Math.max(3, ...xs) + 1;
  let tMin = Math.min(-3, ...ts) - 1, tMax = Math.max(3, ...ts) + 1;
  const X = (x) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad);
  const Y = (t) => H - pad - ((t - tMin) / (tMax - tMin)) * (H - 2 * pad);
  // Grid hairlines
  for (let gx = Math.ceil(xMin); gx <= xMax; gx++) {
    svg.appendChild(svgEl("line", { x1: X(gx), y1: pad, x2: X(gx), y2: H - pad, stroke: "#e2e2e4", "stroke-width": 1 }));
    const lab = svgEl("text", { x: X(gx), y: H - pad + 18, "text-anchor": "middle", "font-size": 11, fill: "#555" });
    lab.textContent = gx; svg.appendChild(lab);
  }
  for (let gt = Math.ceil(tMin); gt <= tMax; gt++) {
    svg.appendChild(svgEl("line", { x1: pad, y1: Y(gt), x2: W - pad, y2: Y(gt), stroke: "#e2e2e4", "stroke-width": 1 }));
    const lab = svgEl("text", { x: pad - 8, y: Y(gt) + 4, "text-anchor": "end", "font-size": 11, fill: "#555" });
    lab.textContent = gt; svg.appendChild(lab);
  }
  // Axes
  svg.appendChild(svgEl("line", { x1: pad, y1: Y(0), x2: W - pad, y2: Y(0), stroke: "#111", "stroke-width": 1.5 }));
  svg.appendChild(svgEl("line", { x1: X(0), y1: pad, x2: X(0), y2: H - pad, stroke: "#111", "stroke-width": 1.5 }));
  const xl = svgEl("text", { x: W - pad, y: Y(0) - 8, "font-size": 12, fill: "#111" }); xl.textContent = "x (광초)"; svg.appendChild(xl);
  const yl = svgEl("text", { x: X(0) + 8, y: pad - 6, "font-size": 12, fill: "#111" }); yl.textContent = "ct (광초)"; svg.appendChild(yl);
  // Light lines slope ±1 through each event (dashed)
  for (const p of pts) {
    for (const s of [1, -1]) {
      const t0 = tMin, t1 = tMax;
      svg.appendChild(svgEl("line", { x1: X(p.x + s * (t0 - p.t)), y1: Y(t0), x2: X(p.x + s * (t1 - p.t)), y2: Y(t1), stroke: "#111", "stroke-width": 1, "stroke-dasharray": "5 4", opacity: 0.55 }));
    }
  }
  // Events: S black squares, S' blue circles — distinguished by shape + label, not color alone
  pts.forEach((p, i) => {
    const isA = p.id === "A";
    const cx = X(p.x), cy = Y(p.t);
    if (state.frame === "S") svg.appendChild(svgEl("rect", { x: cx - 7, y: cy - 7, width: 14, height: 14, fill: "#111" }));
    else svg.appendChild(svgEl("circle", { cx, cy, r: 8, fill: "#002fa7" }));
    const lab = svgEl("text", { x: cx + 12, y: cy - 10, "font-size": 13, "font-weight": 700, fill: state.frame === "S" ? "#111" : "#002fa7" });
    lab.textContent = `${p.id} (${fmt(p.t)}, ${fmt(p.x)})`;
    svg.appendChild(lab);
    void i;
  });
  els.plotCaption.textContent = `${state.frame}계 기준 도표 · 세로 ct(광초), 가로 x(광초) · 범위 x ${fmt(xMin, 0)}~${fmt(xMax, 0)}, ct ${fmt(tMin, 0)}~${fmt(tMax, 0)} · 빛 기울기 ±1`;
}

function renderScene() {
  const svg = els.scene;
  svg.innerHTML = "";
  const W = 640, y = 90;
  const X = (x) => 40 + ((x + 5) / 10) * (W - 80);
  // Platform line + ticks
  svg.appendChild(svgEl("line", { x1: X(-5), y1: y, x2: X(5), y2: y, stroke: "#111", "stroke-width": 3 }));
  for (let gx = -5; gx <= 5; gx++) {
    svg.appendChild(svgEl("line", { x1: X(gx), y1: y - 8, x2: X(gx), y2: y + 8, stroke: "#111", "stroke-width": 1 }));
  }
  // Event markers
  for (const e of state.events) {
    const m = svgEl("rect", { x: X(e.xLightSeconds) - 5, y: y - 26, width: 10, height: 10, fill: "#111" });
    svg.appendChild(m);
    const lab = svgEl("text", { x: X(e.xLightSeconds), y: y - 30, "text-anchor": "middle", "font-size": 12, fill: "#111" });
    lab.textContent = e.id; svg.appendChild(lab);
  }
  // Receivers in selected frame at cursor time
  const t = state.cursorT;
  let platX = 0, trainX;
  if (state.frame === "S") { platX = 0; trainX = state.beta * t; }
  else { trainX = 0; platX = -state.beta * t; }
  const cx = (wx) => X(Math.max(-5.2, Math.min(5.2, wx)));
  svg.appendChild(svgEl("rect", { x: cx(platX) - 9, y: y - 9, width: 18, height: 18, fill: "none", stroke: "#111", "stroke-width": 2 }));
  const tp = svgEl("rect", { x: cx(trainX) - 22, y: y + 18, width: 44, height: 20, fill: "#002fa7" });
  svg.appendChild(tp);
  const ttl = svgEl("text", { x: cx(trainX), y: y + 33, "text-anchor": "middle", "font-size": 11, fill: "#fff" });
  ttl.textContent = "이동"; svg.appendChild(ttl);
  // Light fronts: dots for each emission where t >= te
  for (const e of state.events) {
    if (t < e.tSeconds) continue;
    for (const s of [1, -1]) {
      const lx = e.xLightSeconds + s * (t - e.tSeconds);
      if (lx < -5 || lx > 5) continue;
      svg.appendChild(svgEl("circle", { cx: X(lx), cy: y, r: 4, fill: "#fff", stroke: "#111", "stroke-width": 1.5, "stroke-dasharray": "2 2" }));
    }
  }
  svg.setAttribute("aria-label", `${state.frame}계 장면, 시간 ${fmt(t)}초, 이동 관찰자 위치 ${fmt(trainX)}광초`);
}

function renderAll() {
  renderTables(); renderPlot(); renderScene();
  els.cursorReadout.textContent = `t = ${fmt(state.cursorT)}초 · 키보드 ←/→ 로 0.05초씩 이동`;
  els.cursorFrame.textContent = `현재 시간 커서는 ${state.frame}계 시각`;
}

function loadRecords() {
  try { return JSON.parse(localStorage.getItem("relativity-observatory.records") || "[]"); }
  catch { return []; }
}
function renderRecords() {
  const recs = loadRecords();
  els.saveStatus.textContent = recs.length === 0
    ? "저장된 기록 없음 (이 브라우저에만 저장, 개인 식별 정보 없음)"
    : `${recs.length}개 기록 저장됨 (이 브라우저에만 저장)`;
  // 손상 기록이 섞여 있어도 화면이 깨지지 않게 형태를 검사하고, 아니면 건너뛴다.
  els.recordList.innerHTML = recs.slice(-5).reverse().map((r) => {
    const date = typeof r?.createdAt === "string" ? r.createdAt.slice(0, 10) : "날짜 없음";
    const beta = Number.isFinite(r?.parameters?.beta) ? r.parameters.beta : "—";
    const pred = typeof r?.prediction === "string" && r.prediction ? r.prediction : "—";
    const expl = typeof r?.explanation === "string" ? r.explanation.slice(0, 80) : "";
    return `<div class="record-item"><strong>${escapeHtml(date)}</strong> · β=${escapeHtml(String(beta))} · 예측 ${escapeHtml(pred)} · ${escapeHtml(expl)}</div>`;
  }).join("");
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Events
els.form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const { beta, events } = readInputs();
  if (!applyInputs(beta, events)) { els.setupStatus.textContent = "입력 오류 — 이유를 확인하고 이전 유효값 유지"; return; }
  const pred = new FormData(els.form).get("prediction");
  if (!pred) { els.setupStatus.textContent = "예측을 하나 선택하세요 (A가 먼저 / B가 먼저 / 동시)"; return; }
  state.prediction = String(pred);
  setPhase("predicted");
  els.setupStatus.textContent = `예측 저장됨 (${state.prediction}) — 장면을 관찰하고 비교하세요`;
  renderAll();
});
$("reset-btn").addEventListener("click", () => {
  const d = defaultScenario();
  els.beta.value = String(d.beta); els.betaQuick.value = String(d.beta);
  els.aT.value = "0"; els.aX.value = "-1"; els.bT.value = "0"; els.bX.value = "1";
  applyInputs(d.beta, structuredClone(d.events)); renderAll();
});
els.betaQuick.addEventListener("input", () => {
  const { events } = readInputs();
  if (applyInputs(Number(els.betaQuick.value), events, { fromQuick: true })) renderAll();
});
els.frame.addEventListener("change", () => { state.frame = els.frame.value === "Sp" ? "S′" : "S"; renderAll(); });
els.cursor.addEventListener("input", () => {
  state.cursorT = Number(els.cursor.value);
  if (state.phase === "predicted") setPhase("playing");
  renderAll();
});
let timer = null;
els.play.addEventListener("click", () => {
  if (timer) return;
  setPhase("playing");
  timer = setInterval(() => {
    state.cursorT = Number((state.cursorT + 0.2).toFixed(2));
    if (state.cursorT > 4) { clearInterval(timer); timer = null; return; }
    els.cursor.value = String(state.cursorT);
    renderAll();
  }, 300);
});
els.stop.addEventListener("click", () => { if (timer) { clearInterval(timer); timer = null; } });
// 탭이 숨겨지면 계산(재생)을 멈추고, 돌아오면 멈춘 자리에서 직접 다시 시작한다. 수치 상태는 그대로 둔다.
document.addEventListener("visibilitychange", () => {
  if (document.hidden && timer) { clearInterval(timer); timer = null; }
});
els.compare.addEventListener("click", () => {
  const { beta, events } = readInputs();
  if (!applyInputs(beta, events)) return;
  renderAll(); setPhase("comparing");
});
els.save.addEventListener("click", () => {
  const recs = loadRecords();
  const [A, B] = state.events;
  const rec = {
    schemaVersion: 1, appId: "relativity-observatory", createdAt: new Date().toISOString(),
    scenarioId: SCENARIO_ID, parameters: { beta: state.beta, events: state.events, frame: state.frame },
    seed: null, observations: { arrivals: arrivals(), intervalSquared: intervalSquared(B.tSeconds - A.tSeconds, B.xLightSeconds - A.xLightSeconds) },
    prediction: state.prediction, explanation: els.explanation.value.trim(), engineVersion: ENGINE_VERSION,
  };
  recs.push(rec);
  try { localStorage.setItem("relativity-observatory.records", JSON.stringify(recs)); }
  catch { els.saveStatus.textContent = "저장 공간을 쓸 수 없어 현재 세션에만 유지됩니다. JSON 내보내기를 쓰세요."; return; }
  setPhase("report"); renderRecords();
});
els.exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(loadRecords(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "relativity-records.json"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
els.start.addEventListener("click", () => { $("h-setup").scrollIntoView({ behavior: "smooth", block: "start" }); els.beta.focus(); });

// Update log dialog (WCAG: native dialog, Esc closes, focus returns automatically)
const LOG_ENTRIES = [
  { date: "2026-09-23", text: "P0 첫 화면 공개: 사건 설정·장면·좌표·도표·기록 흐름, β=0.6 예제와 불변량 검증 포함." },
];
async function openLog() {
  // WCAG: open dialog synchronously so focus moves immediately; fill content after.
  if (!els.logDialog.open) els.logDialog.showModal();
  els.logBody.innerHTML = "<p>불러오는 중…</p>";
  try {
    const res = await fetch("./docs/UPDATELOG.md");
    if (!res.ok) throw new Error("nope");
    const md = await res.text();
    els.logBody.innerHTML = `<pre style="white-space:pre-wrap;font:inherit">${escapeHtml(md.slice(0, 2000))}</pre>`;
  } catch { els.logBody.innerHTML = LOG_ENTRIES.map((e) => `<p><strong>${e.date}</strong> — ${e.text}</p>`).join(""); }
}
$("open-log").addEventListener("click", openLog);
$("close-log").addEventListener("click", () => els.logDialog.close());

// Init
setPhase("setup");
applyInputs(state.beta, state.events);
renderAll(); renderRecords();
