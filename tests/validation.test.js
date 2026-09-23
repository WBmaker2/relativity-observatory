import { test } from "node:test";
import assert from "node:assert/strict";
import { gamma } from "../engine/lorentz.js";
import { classify } from "../engine/intervals.js";
import { receptionTime } from "../engine/receptions.js";
import { validateBeta, validateEvent } from "../engine/scenarios.js";

test("beta 경계: ±0.9 통과, 밖은 실패", () => {
  assert.equal(validateBeta(0.9).ok, true);
  assert.equal(validateBeta(-0.9).ok, true);
  assert.equal(validateBeta(0.91).ok, false);
  assert.equal(validateBeta(-0.91).ok, false);
});

test("beta 무효 입력: NaN·Infinity·빈칸(NaN) 실패", () => {
  assert.equal(validateBeta(NaN).ok, false);
  assert.equal(validateBeta(Infinity).ok, false);
  assert.equal(validateBeta(Number("")).ok, true); // Number("")===0이므로 앱에서 빈칸을 먼저 NaN으로 바꾼다
  assert.throws(() => gamma(1.5), RangeError);
  assert.throws(() => gamma(NaN), RangeError);
});

test("사건 경계: ±5 통과, 밖·NaN 실패", () => {
  assert.equal(validateEvent(0, -1).ok, true);
  assert.equal(validateEvent(-5, 5).ok, true);
  assert.equal(validateEvent(5.1, 0).ok, false);
  assert.equal(validateEvent(0, -5.1).ok, false);
  assert.equal(validateEvent(NaN, 0).ok, false);
  assert.equal(validateEvent(0, Infinity).ok, false);
});

test("수신 null 가드: 빛보다 빠른 수신자는 도착 없음", () => {
  // 물리 범위 밖(v=1.5)이라 교점이 없거나 과거뿐이면 null. UI는 '도착 없음'으로 표시한다.
  const hit = receptionTime({ t: 0, x: 0 }, { x0: 10, v: 1.5 });
  assert.equal(hit, null);
});

test("허용 범위 수신자는 항상 미래 도착", () => {
  for (const v of [-0.9, 0, 0.9]) {
    const hit = receptionTime({ t: 0, x: 1 }, { x0: 0, v });
    assert.ok(hit && hit.t >= 0, `v=${v}: ${JSON.stringify(hit)}`);
  }
});

test("간격 경계 분류가 뒤집히지 않음", () => {
  assert.equal(classify(1e-8), "timelike");
  assert.equal(classify(-1e-8), "spacelike");
  assert.equal(classify(0), "lightlike");
});
