// intervals.ts (JS port, P0) — spacetime interval, pure functions.
export function intervalSquared(dt, dx) {
  return dt * dt - dx * dx;
}

// eps guards floating noise near light cone.
export function classify(ds2, eps = 1e-9) {
  if (ds2 > eps) return "timelike";
  if (ds2 < -eps) return "spacelike";
  return "lightlike";
}

export const KIND_LABEL = {
  timelike: "시간꼴",
  lightlike: "빛꼴",
  spacelike: "공간꼴",
};

export function describePair(a, b) {
  const dt = b.tSeconds - a.tSeconds;
  const dx = b.xLightSeconds - a.xLightSeconds;
  const ds2 = intervalSquared(dt, dx);
  const kind = classify(ds2);
  return { dt, dx, ds2, kind, label: KIND_LABEL[kind] };
}
