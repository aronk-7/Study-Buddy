const { test } = require("node:test");
const assert = require("node:assert/strict");
const Engine = require("../main/engine.cjs");
const D = require("../main/domain.cjs");
class Store {
  constructor(initial = {}) {
    this.data = structuredClone(initial);
  }
  get(k, f) {
    return structuredClone(this.data[k] ?? f);
  }
  set(k, v) {
    this.data[k] = structuredClone(v);
  }
}
class DB {
  constructor() {
    this.rows = [];
    this.missed = {};
    this.settlements = [];
    this.taskReward = false;
  }
  subject(id) {
    if (id !== 1) throw new Error("Missing subject");
    return id;
  }
  subjects() {
    return [{ id: 1, name: "Math" }];
  }
  assessments() {
    return [];
  }
  nextStudy() {
    return null;
  }
  tasks() {
    return [];
  }
  todaySessions() {
    return this.rows;
  }
  logSession(row) {
    this.rows.push(row);
  }
  studied(day) {
    return this.rows.some((r) => r.day === day && r.completed);
  }
  settle(day) {
    this.settlements.push(day);
    const n = this.missed[day] || 0;
    this.missed[day] = 0;
    return n;
  }
  toggleTask() {
    const reward = !this.taskReward;
    this.taskReward = true;
    return { reward, allReward: reward };
  }
}
function setup(initial = {}) {
  let now = new Date("2026-10-02T09:00:00").getTime();
  const db = new DB(),
    store = new Store(initial),
    e = new Engine(db, store, () => now);
  return {
    e,
    db,
    store,
    advance: (ms) => {
      now += ms;
      e.tick();
    },
    set: (date) => {
      now = new Date(date).getTime();
      e.tick();
    },
  };
}
test("pause and resume preserve remaining time and actual study duration", () => {
  const { e, db, advance } = setup();
  e.start(1);
  advance(600000);
  e.pause();
  assert.equal(e.timer.remaining, 900);
  advance(600000);
  assert.equal(e.timer.remaining, 900);
  e.start(1);
  advance(900000);
  assert.equal(db.rows.length, 1);
  assert.equal(db.rows[0].minutes, 25);
  assert.equal(e.timer.phase, "shortBreak");
  assert.equal(e.pet.current_streak, 1);
  assert.equal(e.pet.current_mood, 90);
});
test("four completed work sessions produce a 20-minute long break", () => {
  const { e, db, advance } = setup();
  for (let i = 0; i < 4; i++) {
    e.start(1);
    advance(1500000);
    assert.equal(e.timer.phase, i === 3 ? "longBreak" : "shortBreak");
    advance(e.timer.remaining * 1000);
  }
  assert.equal(db.rows.filter((r) => r.completed).length, 4);
  assert.equal(e.timer.cycle, 4);
  assert.equal(e.pet.current_streak, 1);
});
test("skipping and resetting log partial study without awarding a streak", () => {
  const { e, db, advance } = setup();
  e.start(1);
  advance(60000);
  e.advance(false);
  assert.equal(db.rows[0].minutes, 1);
  assert.equal(db.rows[0].completed, false);
  assert.equal(e.pet.current_streak, 0);
  e.advance(false);
  e.start(1);
  advance(120000);
  e.reset();
  assert.equal(db.rows.length, 2);
  assert.equal(e.timer.status, "idle");
});
test("restart restores a running session as paused", () => {
  const { e, db, store, advance } = setup();
  e.start(1);
  advance(300000);
  e.pause();
  e.start(1);
  const next = new Engine(db, store, e.now);
  assert.equal(next.timer.status, "paused");
  assert.equal(next.timer.remaining, 1200);
  next.start(1);
  assert.equal(next.timer.status, "running");
});
test("task completion rewards are awarded only once", () => {
  const { e } = setup();
  e.pet.current_mood = 40;
  e.toggleTask(1);
  assert.equal(e.pet.current_mood, 60);
  e.toggleTask(1);
  assert.equal(e.pet.current_mood, 60);
});
test("missed days reset streak without losing mood or evolution, including after restart and another session", () => {
  const { e, db, store, set, advance } = setup({
    pet: {
      ...D.defaultPet,
      current_mood: 90,
      current_streak: 30,
      evolution_stage: 2,
      last_study_date: "2026-10-01",
    },
  });
  db.missed["2026-10-02"] = 2;
  set("2026-10-03T00:00:01");
  assert.equal(e.pet.current_mood, 90);
  assert.equal(e.pet.current_streak, 0);
  assert.equal(e.pet.evolution_stage, 2);
  const restored = new Engine(db, store, e.now);
  assert.equal(restored.pet.evolution_stage, 2);
  assert.deepEqual(db.settlements, ["2026-10-02"]);
  e.start(1);
  advance(1500000);
  assert.equal(e.pet.current_streak, 1);
  assert.equal(e.pet.evolution_stage, 2);
});
test("calendar rollover permits today before deciding the streak is broken", () => {
  const { e, set } = setup({
    pet: { ...D.defaultPet, current_streak: 6, last_study_date: "2026-10-01" },
  });
  assert.equal(e.pet.current_streak, 6);
  e.start(1);
  set("2026-10-02T09:25:00");
  assert.equal(e.pet.current_streak, 7);
  assert.equal(e.pet.evolution_stage, 1);
});
test("focus is studying; completion celebrates for four seconds, then rests", () => {
  const { e, advance } = setup();
  e.start(1);
  assert.equal(e.snapshot().animation, "studying");
  advance(1500000);
  assert.equal(e.snapshot().animation, "celebrating");
  advance(3000);
  assert.equal(e.snapshot().animation, "celebrating");
  advance(1000);
  assert.equal(e.snapshot().animation, "resting");
});
test("hello is contextual, silent, and never awards mood, streak, sessions or evolution", () => {
  const { e, db, advance } = setup();
  let notifications = 0;
  e.on("notice", () => notifications++);
  const before = {
    mood: e.pet.current_mood,
    streak: e.pet.current_streak,
    stage: e.pet.evolution_stage,
  };
  for (let i = 0; i < 20; i++) {
    e.interact();
    advance(700);
  }
  assert.deepEqual(
    {
      mood: e.pet.current_mood,
      streak: e.pet.current_streak,
      stage: e.pet.evolution_stage,
    },
    before,
  );
  assert.equal(db.rows.length, 0);
  assert.equal(notifications, 0);
  e.start(1);
  e.interact();
  assert.match(e.notice.message, /studying together/);
  assert.equal(e.snapshot().animation, "studying");
});
test("name is persisted and old settings remain stored but do not appear in the active model", () => {
  const { e, db, store } = setup({
    settings: {
      ...D.defaultSettings,
      blocklist: ["Steam"],
      startAtLogin: true,
    },
    schedule: [{ old: true }],
    pet: { ...D.defaultPet, neglected_until: 9999999999999 },
  });
  e.rename("  Sunny  ");
  assert.equal(new Engine(db, store, e.now).pet.name, "Sunny");
  assert.throws(() => e.rename(" "));
  assert.throws(() => e.rename("x".repeat(33)));
  e.setSettings({ ...D.defaultSettings, work: 30 });
  assert.equal(e.timer.remaining, 1800);
  assert.equal(e.settings.blocklist, undefined);
  assert.equal(store.get("settings").startAtLogin, true);
  assert.equal(store.get("schedule").length, 1);
  assert.equal(e.snapshot().animation, "idle");
});

test("switching buddy persists the choice without changing name, progress, or timer", () => {
  const { e, db, store, advance } = setup();
  e.rename("Sunny");
  e.pet.evolution_stage = 2;
  e.start(1);
  advance(60000);
  const petBefore = structuredClone(e.pet),
    timerBefore = structuredClone(e.timer);
  e.setPet("penguin");
  assert.deepEqual(e.pet, { ...petBefore, pet_type: "penguin" });
  assert.deepEqual(e.timer, timerBefore);
  assert.equal(new Engine(db, store, e.now).pet.pet_type, "penguin");
  assert.throws(() => e.setPet("red_panda"));
  assert.equal(e.pet.pet_type, "penguin");
  e.setPet("duckling");
  assert.deepEqual(e.pet, petBefore);
});
