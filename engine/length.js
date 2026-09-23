// length.ts (JS port, P1) — simultaneous length measurement, pure functions.
// L0: rest length in S'. S measures both ends at equal S-time t1==t2 (c=1).
// Result L = L0/gamma. Non-simultaneous pairs are refused, not corrected.
import { gamma } from "./lorentz.js";

export const L0_MIN = 0;
export const L0_MAX = 10;

export function validateL0(L0) {
  if (!Number.isFinite(L0)) return { ok: false, reason: "막대 길이에 숫자를 입력하세요." };
  if (L0 <= L0_MIN || L0 > L0_MAX)
    return { ok: false, reason: `막대 길이 L₀ 허용 범위는 0 초과~${L0_MAX}광초입니다.` };
  return { ok: true };
}

// |t1-t2|<=eps (측정계 시각)일 때만 길이로 인정한다.
export function checkSimultaneous(t1, t2, eps = 1e-9) {
  if (!Number.isFinite(t1) || !Number.isFinite(t2)) return { ok: false, reason: "측정 시각에 숫자를 입력하세요." };
  if (Math.abs(t1 - t2) > eps) return { ok: false, reason: "동시 측정이 아닙니다. 같은 시각에 잰 두 끝만 길이로 인정합니다." };
  return { ok: true };
}

export function measureSimultaneousLength(L0, beta) {
  const vL = validateL0(L0);
  if (!vL.ok) throw new RangeError(vL.reason);
  const g = gamma(beta); // gamma가 beta 범위도 검사한다
  return { L: L0 / g, gamma: g };
}
