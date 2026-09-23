import { test } from "node:test";
import assert from "node:assert/strict";
import { measureSimultaneousLength, checkSimultaneous, validateL0 } from "../engine/length.js";
import { properTime, dilatedTime } from "../engine/propertime.js";
import { journeySummary } from "../engine/segments.js";

const approx = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test("P1 길이: L0=2, β=0.6 → 1.6", () => {
  const { L, gamma } = measureSimultaneousLength(2, 0.6);
  assert.ok(approx(L, 1.6), `L=${L}`);
  assert.equal(gamma, 1.25);
});

test("P1 길이: β=0이면 L′=L0, 범위 밖 거부", () => {
  assert.ok(approx(measureSimultaneousLength(2, 0).L, 2));
  assert.equal(validateL0(0).ok, false);
  assert.equal(validateL0(11).ok, false);
  assert.throws(() => measureSimultaneousLength(2, 0.95), RangeError);
});

test("P1 동시 조건 위반은 길이로 인정하지 않음", () => {
  assert.equal(checkSimultaneous(1.0, 1.0).ok, true);
  assert.equal(checkSimultaneous(1.0, 1.5).ok, false);
});

test("P1 고유시간: S 1.25초 ↔ 시계 1초 (β=0.6)", () => {
  assert.ok(approx(properTime(1.25, 0.6), 1), `${properTime(1.25, 0.6)}`);
  assert.ok(approx(dilatedTime(1, 0.6), 1.25));
  assert.ok(approx(properTime(2, 0), 2));
});

test("P1 왕복 여정: 좌표시 합 2.5초, 고유시간 합 2초", () => {
  const { junctions, coordSum, properSum } = journeySummary([
    { beta: 0.6, dt: 1.25 },
    { beta: -0.6, dt: 1.25 },
  ]);
  assert.ok(approx(coordSum, 2.5), `${coordSum}`);
  assert.ok(approx(properSum, 2.0), `${properSum}`);
  // 이음매 연속: 출발(0,0) → 전환점 → 복귀(0)
  assert.ok(approx(junctions[0].x, 0) && approx(junctions[0].t, 0));
  assert.ok(approx(junctions[1].x, 0.75) && approx(junctions[1].t, 1.25));
  assert.ok(approx(junctions[2].x, 0), `x=${junctions[2].x}`);
});

test("P1 구간 수·범위 위반 거부", () => {
  assert.throws(() => journeySummary([{ beta: 0, dt: 1 }]), RangeError);
  assert.throws(() => journeySummary([{ beta: 0.6, dt: 1 }, { beta: 0.95, dt: 1 }]), RangeError);
});
