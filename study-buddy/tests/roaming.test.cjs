const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  WIDTH,
  HEIGHT,
  clampPosition,
  chooseTarget,
  stepToward,
} = require("../main/roaming.cjs");
test("roaming stays inside work area, including monitors with negative origins", () => {
  for (const area of [
    { x: 0, y: 0, width: 1920, height: 1040 },
    { x: -1280, y: -300, width: 1280, height: 720 },
    { x: 0, y: 0, width: 100, height: 100 },
  ]) {
    const p = clampPosition({ x: 10000, y: -10000 }, area);
    assert.ok(p.x >= area.x && p.x <= area.x + Math.max(0, area.width - WIDTH));
    assert.ok(
      p.y >= area.y && p.y <= area.y + Math.max(0, area.height - HEIGHT),
    );
    const t = chooseTarget(
      area,
      { x: area.x + 100, y: area.y + 100 },
      () => 0.5,
    );
    assert.deepEqual(clampPosition(t, area), t);
  }
});
test("movement has bounded speed, reaches its target, and never overshoots", () => {
  let p = { x: 0, y: 0 };
  const t = { x: 3, y: 4 };
  p = stepToward(p, t, 2);
  assert.ok(Math.abs(Math.hypot(p.x, p.y) - 2) < 1e-9);
  assert.deepEqual(stepToward(p, t, 10), t);
  assert.deepEqual(stepToward(t, t, 2), t);
});
test("edge destination avoids the pointer", () => {
  const a = { x: 0, y: 0, width: 1920, height: 1080 },
    cursor = { x: 1900, y: 1000 };
  const t = chooseTarget(a, cursor, () => 0.5);
  assert.equal(t.x, 8);
});

test("transparent padding passes through; buddy and visible speech can be clicked", () => {
  const { interactionArea, WIDTH, HEIGHT } = require("../main/roaming.cjs");
  const p = { x: 100, y: 200 };
  assert.equal(interactionArea(p, { x: 101, y: 201 }, false), false);
  assert.equal(
    interactionArea(p, { x: 100 + WIDTH / 2, y: 200 + HEIGHT - 50 }, false),
    true,
  );
  assert.equal(interactionArea(p, { x: 150, y: 230 }, false), false);
  assert.equal(interactionArea(p, { x: 150, y: 230 }, true), true);
});
