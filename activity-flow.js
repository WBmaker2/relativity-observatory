export function predictionLabel(value) {
  return ({ "A-first": "A 먼저", "B-first": "B 먼저", simultaneous: "동시" })[value] || "예측 없음";
}

export function updatePhaseUI(phase, state, els, byId, arrivalOrder) {
  state.phase = phase;
  els.stepper.querySelectorAll("li").forEach((li) => {
    if (li.dataset.step === phase) li.setAttribute("aria-current", "step");
    else li.removeAttribute("aria-current");
  });
  for (const button of [byId("predict-btn"), els.play, els.compare, els.save, byId("restart-btn")]) button.classList.remove("is-pulse");
  if (phase === "setup") byId("predict-btn").classList.add("is-pulse");
  if (phase === "predicted") els.play.classList.add("is-pulse");
  if (phase === "playing") els.compare.classList.add("is-pulse");
  if (phase === "comparing") els.save.classList.add("is-pulse");
  if (phase === "report") byId("restart-btn").classList.add("is-pulse");

  const compared = phase === "comparing" || phase === "report";
  els.analysis.hidden = !compared;
  els.compareResult.hidden = !compared;
  els.recordSection.hidden = !compared;
  els.savedTakeaway.hidden = phase !== "report";
  els.advancedSection.hidden = phase !== "report";
  els.compare.disabled = !state.observed || phase === "report";
  byId("predict-btn").disabled = phase !== "setup";
  els.cursor.disabled = phase === "setup";
  els.play.disabled = phase === "setup" || phase === "report";
  els.save.disabled = phase === "report";
  els.betaQuick.disabled = !["setup", "comparing"].includes(phase);
  els.stop.disabled = ["setup", "comparing", "report"].includes(phase);
  for (const control of els.form.elements) {
    if (control.id !== "reset-btn" && control.id !== "frame-select") control.disabled = phase !== "setup";
  }
  els.compareNext.textContent = phase === "setup"
    ? "먼저 A와 B의 도착 순서를 예측해 보세요."
    : phase === "predicted"
      ? "예측을 저장했어요. 시간 커서를 움직이거나 재생해 장면을 관찰하세요."
      : phase === "playing"
        ? "장면을 관찰했어요. 이제 기준계 비교를 확인하세요."
        : compared
          ? `내 예측: ${predictionLabel(state.prediction)}. 이동 관찰자는 ${arrivalOrder} 받았어요. 표에서 두 순서와 사건 시간을 비교해 보세요. β를 바꾸면 새 예측부터 다시 시작합니다.`
          : "";
  els.setupStatus.textContent = phase === "setup"
    ? "조건을 확인하고 A와 B의 도착 순서를 예측하세요."
    : phase === "predicted"
      ? `${predictionLabel(state.prediction)}라고 예측했어요. 장면을 관찰하세요.`
      : phase === "playing"
        ? "장면을 관찰했어요. 기준계 비교를 확인하세요."
        : phase === "comparing"
          ? `내 예측: ${predictionLabel(state.prediction)} · 이동 관찰자: ${arrivalOrder} 받음. 이제 설명을 적고 기록을 저장하세요.`
          : "기록을 저장했어요. 다른 β로 다시 예측하거나 고등학교 심화를 열어 보세요.";
}
