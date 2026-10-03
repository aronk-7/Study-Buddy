// Runs in Electron's Node runtime, matching the native SQLite ABI.
const assert = require("node:assert/strict");
const DB = require("../main/db.cjs");
const Engine = require("../main/engine.cjs");
const db = new DB(":memory:");
class Store {
  constructor() {
    this.data = {};
  }
  get(k, f) {
    return structuredClone(this.data[k] ?? f);
  }
  set(k, v) {
    this.data[k] = structuredClone(v);
  }
}
let now = new Date("2026-10-02T09:00:00").getTime();
const store = new Store(),
  e = new Engine(db, store, () => now);
const subject = db.addSubject({ name: "Math", color_hex: "#6b8970" });
assert.throws(() => db.addSubject({ name: "Math" }));
const task = db.addTask(
  {
    subject_id: subject,
    description: "Practice proofs",
    estimated_pomodoros: 2,
  },
  "2026-10-02",
);
e.pet.current_mood = 40;
e.toggleTask(task);
assert.equal(e.pet.current_mood, 60);
e.toggleTask(task);
e.toggleTask(task);
assert.equal(e.pet.current_mood, 60);
assert.throws(() =>
  db.addTask({
    subject_id: subject,
    description: "Invalid",
    estimated_pomodoros: 1.5,
  }),
);
e.start(subject);
now += 5 * 60000;
e.pause();
now += 30 * 60000;
e.start(subject);
now += 20 * 60000;
e.tick();
assert.equal(
  db.todaySessions("2026-10-02").filter((s) => s.completed).length,
  1,
);
assert.equal(db.todaySessions("2026-10-02")[0].duration_minutes, 25);
assert.equal(e.pet.current_streak, 1);
e.pet.evolution_stage = 2;
db.db
  .prepare("INSERT INTO mood_history(timestamp,mood,reason) VALUES(?,?,?)")
  .run(now, 10, "legacy record");
db.db
  .prepare(
    "INSERT INTO activity(date,application,seconds,distracted) VALUES(?,?,?,?)",
  )
  .run("2026-10-01", "legacy app", 60, 1);
db.addTask(
  { subject_id: subject, description: "Tomorrow task", estimated_pomodoros: 1 },
  "2026-10-03",
);
const mood = e.pet.current_mood;
now = new Date("2026-10-04T00:00:01").getTime();
e.tick();
assert.equal(e.pet.current_streak, 0);
assert.equal(db.tasks("2026-10-03")[0].missed, 1);
assert.equal(e.pet.current_mood, mood);
assert.equal(e.pet.evolution_stage, 2);
const restored = new Engine(db, store, () => now);
assert.equal(restored.pet.current_mood, mood);
assert.equal(restored.pet.evolution_stage, 2);
assert.equal(
  db.db.prepare("SELECT COUNT(*) AS n FROM mood_history").get().n,
  1,
);
assert.equal(db.db.prepare("SELECT COUNT(*) AS n FROM activity").get().n, 1);
assert.equal(db.db.pragma("integrity_check", { simple: true }), "ok");
assert.equal(db.db.pragma("foreign_key_check").length, 0);
db.close();
console.log(
  "PASS: SQLite constraints, once-only rewards, pause/resume duration, completion, gentle rollover, legacy rows, and persistence.",
);
