// scenarios.ts (JS port, P0) — default scenario + validation, pure data.
import { BETA_MIN, BETA_MAX, X_MIN, X_MAX, T_MIN, T_MAX } from "./lorentz.js";

export const ENGINE_VERSION = "p0-1";
export const SCENARIO_ID = "platform-flashes";

export function defaultScenario() {
  return {
    id: SCENARIO_ID,
    beta: 0.6,
    events: [
      { id: "A", tSeconds: 0, xLightSeconds: -1, sourceId: "platform-left" },
      { id: "B", tSeconds: 0, xLightSeconds: 1, sourceId: "platform-right" },
    ],
    receivers: [
      { id: "platform-mid", x0: 0, v: 0, label: "플랫폼 중앙 관찰자 (S에 정지)" },
      // Train midpoint: at t=0 at x=0, moves with S'. Worldline x = beta*t.
      { id: "train-mid", x0: 0, v: 0.6, label: "이동 관찰자 (S′ 원점)" },
    ],
  };
}

export function validateBeta(beta) {
  if (!Number.isFinite(beta)) return { ok: false, reason: "숫자를 입력하세요." };
  if (beta < BETA_MIN || beta > BETA_MAX)
    return { ok: false, reason: `β 허용 범위는 ${BETA_MIN}~${BETA_MAX}입니다.` };
  return { ok: true };
}

export function validateEvent(t, x) {
  if (!Number.isFinite(t) || !Number.isFinite(x)) return { ok: false, reason: "시간과 위치에 숫자를 입력하세요." };
  if (t < T_MIN || t > T_MAX) return { ok: false, reason: `시간 t 허용 범위는 ${T_MIN}~${T_MAX}초입니다.` };
  if (x < X_MIN || x > X_MAX) return { ok: false, reason: `위치 x 허용 범위는 ${X_MIN}~${X_MAX}광초입니다.` };
  return { ok: true };
}
