const { test } = require("node:test");
const assert = require("node:assert/strict");
const D = require("../main/domain.cjs");
test("animation prioritizes focus and celebration and never reads legacy negative states", () => {
  const pet = {
      current_mood: 0,
      neglected_until: 999999999,
      last_active_at: 1,
    },
    timer = { status: "idle", phase: "work" };
  assert.equal(D.animation(pet, timer, 100), "idle");
  assert.equal(D.animation(pet, timer, 180001), "sleeping");
  assert.equal(
    D.animation(pet, { status: "running", phase: "work" }, 180001),
    "studying",
  );
  assert.equal(
    D.animation(pet, { status: "running", phase: "shortBreak" }, 180001),
    "resting",
  );
  assert.equal(
    D.animation(pet, { status: "running", phase: "shortBreak" }, 100, {
      state: "celebrating",
      until: 200,
    }),
    "celebrating",
  );
  assert.equal(
    D.animation(pet, timer, 100, { state: "happy", until: 200 }),
    "happy",
  );
  assert.equal(
    D.animation(pet, timer, 200, { state: "happy", until: 200 }),
    "idle",
  );
});
test("local calendar arithmetic handles leap years and year boundaries", () => {
  assert.equal(D.addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(D.addDays("2025-12-31", 1), "2026-01-01");
  assert.equal(D.dayDistance("2026-10-03", "2026-10-05"), 2);
});
test("growth follows streak milestones", () => {
  for (const [n, s] of [
    [0, 0],
    [6, 0],
    [7, 1],
    [29, 1],
    [30, 2],
    [99, 2],
    [100, 3],
  ])
    assert.equal(D.evolution(n), s);
});
test("settings validate durations and omit removed features", () => {
  assert.equal(D.defaultSettings.work, 25);
  assert.throws(() => D.validateSettings({ ...D.defaultSettings, work: 0 }));
  assert.throws(() =>
    D.validateSettings({ ...D.defaultSettings, shortBreak: 61 }),
  );
  assert.deepEqual(
    D.validateSettings({
      ...D.defaultSettings,
      blocklist: [""],
      startAtLogin: true,
    }),
    D.defaultSettings,
  );
});
