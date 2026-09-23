// segments.ts (JS port, P1) — piecewise inertial journey, pure functions.
// 각 구간은 등속이며 원점 (0,0)에서 사슬처럼 잇는다. 속도 전환점은 순간 전환
// 이상화이므로 물리 해석(쌍둥이 결론)은 다루지 않고 수치 합만 제공한다.
import { properTime } from "./propertime.js";
import { isValidBeta, BETA_MIN, BETA_MAX } from "./lorentz.js";

export const SEG_MAX = 3;

export function validateSegment(seg) {
  if (!Number.isFinite(seg?.dt) || seg.dt < 0)
    return { ok: false, reason: "구간 좌표시에 0 이상 숫자를 입력하세요." };
  if (!isValidBeta(seg?.beta))
    return { ok: false, reason: `구간 β 허용 범위는 ${BETA_MIN}~${BETA_MAX}입니다.` };
  return { ok: true };
}

// segments: [{beta, dt}]. 반환: junctions [{t,x}], coordSum, properSum.
export function journeySummary(segments) {
  if (!Array.isArray(segments) || segments.length < 2 || segments.length > SEG_MAX)
    throw new RangeError(`구간은 2~${SEG_MAX}개여야 합니다.`);
  let t = 0, x = 0, properSum = 0;
  const junctions = [{ t, x }];
  for (const seg of segments) {
    const v = validateSegment(seg);
    if (!v.ok) throw new RangeError(v.reason);
    t += seg.dt;
    x += seg.beta * seg.dt; // c=1
    properSum += properTime(seg.dt, seg.beta);
    junctions.push({ t, x });
  }
  return { junctions, coordSum: t, properSum };
}
