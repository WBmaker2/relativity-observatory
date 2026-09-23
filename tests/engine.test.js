import { test } from "node:test";
import assert from "node:assert/strict";
import { forward, inverse, gamma } from "../engine/lorentz.js";
import { intervalSquared, classify } from "../engine/intervals.js";
import { receptionTime } from "../engine/receptions.js";

const EPS = 1e-10;
const approx = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test("beta=0 is identity", () => {
  const p = forward(1.2, -3.1, 0);
  assert.ok(approx(p.t, 1.2) && approx(p.x, -3.1));
});

test("spec example beta=0.6: four numbers", () => {
  // S A:(0,-1) B:(0,1) -> A' (0.75,-1.25), B' (-0.75,1.25)
  const a = forward(0, -1, 0.6);
  const b = forward(0, 1, 0.6);
  assert.ok(approx(a.t, 0.75), `a.t=${a.t}`);
  assert.ok(approx(a.x, -1.25), `a.x=${a.x}`);
  assert.ok(approx(b.t, -0.75), `b.t=${b.t}`);
  assert.ok(approx(b.x, 1.25), `b.x=${b.x}`);
  assert.equal(gamma(0.6), 1.25);
});

test("beta then -beta round-trips within 1e-10", () => {
  for (const [t, x, b] of [[1, 2, 0.6], [-2.5, 1.5, -0.3], [0.7, -4.2, 0.9]]) {
    const p = forward(t, x, b);
    const q = forward(p.t, p.x, -b);
    assert.ok(Math.abs(q.t - t) < EPS && Math.abs(q.x - x) < EPS, JSON.stringify({ t, x, b, q }));
    const inv = inverse(p.t, p.x, b);
    assert.ok(Math.abs(inv.t - t) < EPS && Math.abs(inv.x - x) < EPS);
  }
});

test("interval preserved + light slope +-1 preserved", () => {
  const A = { t: 0, x: -1 }, B = { t: 0, x: 1 };
  const ds2 = intervalSquared(B.t - A.t, B.x - A.x);
  const Ap = forward(A.t, A.x, 0.6), Bp = forward(B.t, B.x, 0.6);
  const ds2p = intervalSquared(Bp.t - Ap.t, Bp.x - Ap.x);
  assert.ok(approx(ds2, ds2p, 1e-9), `${ds2} vs ${ds2p}`);
  assert.equal(classify(ds2), "spacelike");
  // lightlike pair stays lightlike
  const C = { t: 0, x: 0 }, D = { t: 2, x: 2 };
  const Cp = forward(C.t, C.x, 0.6), Dp = forward(D.t, D.x, 0.6);
  assert.equal(classify(intervalSquared(D.t - C.t, D.x - C.x)), "lightlike");
  assert.ok(approx(intervalSquared(Dp.t - Cp.t, Dp.x - Cp.x), 0, 1e-9));
});

test("proper time: 1s moving clock at 0.6 -> 1.25s in S", () => {
  // Two events on moving clock: (0,0) and proper (1,0) in S' -> S times differ by gamma
  const e1 = inverse(0, 0, 0.6), e2 = inverse(1, 0, 0.6);
  assert.ok(approx(e2.t - e1.t, 1.25), `${e2.t - e1.t}`);
});

test("timelike/lightlike order never reverses in beta range", () => {
  const pairs = [
    [{ t: 0, x: 0 }, { t: 2, x: 0.5 }], // timelike
    [{ t: 0, x: 0 }, { t: 1, x: 1 }], // lightlike
  ];
  for (const [P, Q] of pairs) {
    for (const b of [-0.9, -0.3, 0, 0.3, 0.6, 0.9]) {
      const Pp = forward(P.t, P.x, b), Qp = forward(Q.t, Q.x, b);
      assert.ok(Qp.t > Pp.t, `order flipped at beta=${b}`);
    }
  }
});

test("reception is future + consistent across frames", () => {
  // Train observer worldline x=0.6t receives B (0,1) at t=0.625, A (0,-1) at 2.5
  const rB = receptionTime({ t: 0, x: 1 }, { x0: 0, v: 0.6 });
  const rA = receptionTime({ t: 0, x: -1 }, { x0: 0, v: 0.6 });
  assert.ok(rB && approx(rB.t, 0.625), JSON.stringify(rB));
  assert.ok(rA && approx(rA.t, 2.5), JSON.stringify(rA));
  // Transform reception to S' and solve directly in S' — must match
  for (const [e, r] of [[{ t: 0, x: 1 }, rB], [{ t: 0, x: -1 }, rA]]) {
    const ep = forward(e.t, e.x, 0.6);
    const rp = forward(r.t, r.x, 0.6);
    // In S', train observer is at x'=0 stationary: receiver x0'=0,v'=0
    const direct = receptionTime({ t: ep.t, x: ep.x }, { x0: 0, v: 0 });
    assert.ok(direct && approx(direct.t, rp.t, 1e-9), `frame consistency ${JSON.stringify({ direct, rp })}`);
  }
});
