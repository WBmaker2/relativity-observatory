// lorentz.ts (JS port, P0) — pure functions, no DOM/Three.js dependency.
// Convention: c = 1 light-second/second. S' moves at +x with velocity v = beta*c relative to S.
// Origins coincide at t = t' = 0.

export const BETA_MIN = -0.9;
export const BETA_MAX = 0.9;
export const X_MIN = -5;
export const X_MAX = 5;
export const T_MIN = -5;
export const T_MAX = 5;

export function isValidBeta(beta) {
  return Number.isFinite(beta) && beta >= BETA_MIN && beta <= BETA_MAX;
}

export function gamma(beta) {
  if (!isValidBeta(beta)) throw new RangeError(`beta out of range [${BETA_MIN}, ${BETA_MAX}]: ${beta}`);
  return 1 / Math.sqrt(1 - beta * beta);
}

// Forward: S -> S'. x' = gamma*(x - beta*ct), ct' = gamma*(ct - beta*x), c=1.
export function forward(t, x, beta) {
  const g = gamma(beta);
  return { t: g * (t - beta * x), x: g * (x - beta * t) };
}

// Inverse: S' -> S (flip beta sign).
export function inverse(tp, xp, beta) {
  const g = gamma(beta);
  return { t: g * (tp + beta * xp), x: g * (xp + beta * tp) };
}

export function transformEvents(events, beta) {
  return events.map((e) => {
    const p = forward(e.tSeconds, e.xLightSeconds, beta);
    return { ...e, tPrime: p.t, xPrime: p.x };
  });
}
