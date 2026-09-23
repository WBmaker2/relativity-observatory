// receptions.ts (JS port, P0) — light reception intersections, pure functions.
// Light worldline: x = xe + s*(t - te), s = +1 | -1.
// Receiver worldline: x = x0 + v*t (v = beta, c = 1).
// Solve: t = (x0 - xe + s*te) / (s - v). Keep t >= te, pick earliest.

export function receptionTime(emission, receiver) {
  const { t: te, x: xe } = emission;
  const { x0, v } = receiver;
  const candidates = [];
  for (const s of [1, -1]) {
    const denom = s - v;
    if (Math.abs(denom) < 1e-12) continue;
    const t = (x0 - xe + s * te) / denom;
    if (!Number.isFinite(t)) continue;
    if (t + 1e-9 < te) continue;
    const x = x0 + v * t;
    candidates.push({ t, x, s });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.t - b.t);
  return candidates[0];
}

export function receptionEvent(sourceEventId, emission, receiver) {
  const hit = receptionTime(emission, receiver);
  if (!hit) return null;
  return { sourceEventId, observerId: receiver.id, t: hit.t, x: hit.x, direction: hit.s };
}
