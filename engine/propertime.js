// propertime.ts (JS port, P1) — proper time on one moving clock, pure functions.
// Δτ = Δt·√(1-β²). 같은 시계의 두 사건에만 쓴다.
import { gamma, isValidBeta, BETA_MIN, BETA_MAX } from "./lorentz.js";

export function properTime(dtCoordinate, beta) {
  if (!Number.isFinite(dtCoordinate) || dtCoordinate < 0)
    throw new RangeError("좌표시 경과에 0 이상 숫자를 입력하세요.");
  if (!isValidBeta(beta))
    throw new RangeError(`β 허용 범위는 ${BETA_MIN}~${BETA_MAX}입니다.`);
  return dtCoordinate * Math.sqrt(1 - beta * beta);
}

export function dilatedTime(dtau, beta) {
  if (!Number.isFinite(dtau) || dtau < 0)
    throw new RangeError("고유시간 경과에 0 이상 숫자를 입력하세요.");
  return dtau * gamma(beta);
}
