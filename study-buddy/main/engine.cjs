const { EventEmitter } = require("node:events");
const D = require("./domain.cjs");

class Engine extends EventEmitter {
  constructor(db, store, now = () => Date.now()) {
    super();
    this.db = db;
    this.store = store;
    this.now = now;
    this.settings = D.validateSettings({
      ...D.defaultSettings,
      ...store.get("settings", {}),
    });
    // Retain persisted legacy fields, but they no longer control behavior.
    this.pet = { ...D.defaultPet, ...store.get("pet", {}) };
    if (!["duckling", "penguin"].includes(this.pet.pet_type))
      this.pet.pet_type = "duckling";
    this.pet.name =
      typeof this.pet.name === "string" && this.pet.name.trim()
        ? this.pet.name.trim().slice(0, 32)
        : "Buddy";
    this.pet.current_mood = Math.max(40, Math.min(100, this.pet.current_mood));
    this.pet.evolution_stage = Math.max(
      this.pet.evolution_stage,
      D.evolution(this.pet.current_streak),
    );
    this.pet.last_active_at = this.now();
    this.pet.hearts = D.hearts(this.pet.current_mood);
    const saved = store.get("timer");
    this.timer = saved
      ? {
          ...saved,
          status: saved.status === "running" ? "paused" : saved.status,
          deadline: 0,
        }
      : this.freshTimer();
    this.notice = null;
    this.rollover();
    this.persist();
  }

  freshTimer(cycle = 0, subject_id = null) {
    return {
      phase: "work",
      status: "idle",
      remaining: this.settings.work * 60,
      planned: this.settings.work * 60,
      elapsed: 0,
      cycle,
      subject_id,
      startedAt: 0,
      deadline: 0,
    };
  }

  persist() {
    this.store.set("pet", this.pet);
    this.store.set("timer", this.timer);
  }

  changed() {
    this.persist();
    this.emit("change");
  }

  mood(delta) {
    this.pet.current_mood = Math.min(
      100,
      this.pet.current_mood + Math.max(0, delta),
    );
    this.pet.hearts = D.hearts(this.pet.current_mood);
  }

  popup(message, state = "happy", seconds = 4, notify = true) {
    this.notice = { message, state, until: this.now() + seconds * 1000 };
    if (notify) this.emit("notice", { message, state });
  }

  snapshot() {
    const day = D.dateKey(new Date(this.now()));
    const notice = this.notice?.until > this.now() ? this.notice : null;
    return {
      day,
      pet: this.pet,
      settings: this.settings,
      timer: { ...this.timer, remaining: this.remaining() },
      assessments: this.db.assessments(),
      nextStudy: this.db.nextStudy(day),
      subjects: this.db.subjects(),
      tasks: this.db.tasks(day),
      sessions: this.db.todaySessions(day),
      onboarded: this.store.get("onboarded", false),
      notice,
      animation: D.animation(this.pet, this.timer, this.now(), notice),
    };
  }

  remaining() {
    return this.timer.status === "running"
      ? Math.max(0, Math.ceil((this.timer.deadline - this.now()) / 1000))
      : this.timer.remaining;
  }

  accrue() {
    if (this.timer.status !== "running") return;
    const remaining = this.remaining();
    this.timer.elapsed += Math.max(0, this.timer.remaining - remaining);
    this.timer.remaining = remaining;
  }

  start(subject_id) {
    this.rollover();
    if (this.timer.status === "running") return;
    if (this.timer.phase === "work") {
      if (this.timer.status === "idle") {
        this.timer.subject_id = this.db.subject(
          Number(subject_id || this.timer.subject_id),
        );
        this.timer.startedAt = this.now();
      } else {
        this.db.subject(this.timer.subject_id);
      }
    }
    this.notice = null;
    this.pet.last_active_at = this.now();
    this.timer.status = "running";
    this.timer.deadline = this.now() + this.timer.remaining * 1000;
    this.changed();
  }

  pause() {
    if (this.timer.status !== "running") return;
    this.accrue();
    this.timer.status = "paused";
    this.timer.deadline = 0;
    this.pet.last_active_at = this.now();
    this.changed();
  }

  record(completed) {
    this.accrue();
    if (
      this.timer.phase !== "work" ||
      !this.timer.subject_id ||
      !this.timer.startedAt
    )
      return;
    const minutes = this.timer.elapsed / 60;
    if (!completed && minutes <= 0) return;
    const day = D.dateKey(new Date(this.now()));
    this.db.logSession({
      subject_id: this.timer.subject_id,
      minutes,
      completed,
      start: this.timer.startedAt,
      end: this.now(),
      day,
    });
    if (!completed) return;
    this.mood(10);
    if (this.pet.last_study_date !== day) {
      this.pet.current_streak =
        this.pet.last_study_date === D.addDays(day, -1)
          ? this.pet.current_streak + 1
          : 1;
      this.pet.last_study_date = day;
      this.pet.evolution_stage = Math.max(
        this.pet.evolution_stage,
        D.evolution(this.pet.current_streak),
      );
    }
    this.pet.last_active_at = this.now();
    this.popup("Session complete. Time for a break.", "celebrating", 4);
  }

  advance(completed = false) {
    const wasWork = this.timer.phase === "work";
    this.record(completed && wasWork);
    const cycle = this.timer.cycle + (completed && wasWork ? 1 : 0);
    const subject = this.timer.subject_id;
    if (wasWork) {
      const phase =
        cycle > 0 && cycle % 4 === 0 && completed ? "longBreak" : "shortBreak";
      const duration = this.settings[phase] * 60;
      this.timer = {
        ...this.freshTimer(cycle, subject),
        phase,
        planned: duration,
        remaining: duration,
        status: completed ? "running" : "idle",
        deadline: completed ? this.now() + duration * 1000 : 0,
      };
    } else {
      this.timer = this.freshTimer(cycle, subject);
      this.notice = null;
    }
    this.pet.last_active_at = this.now();
    this.changed();
  }

  reset() {
    this.record(false);
    this.timer = this.freshTimer(0, this.timer.subject_id);
    this.notice = null;
    this.pet.last_active_at = this.now();
    this.changed();
  }

  toggleTask(id) {
    this.rollover();
    const { reward, allReward } = this.db.toggleTask(
      Number(id),
      D.dateKey(new Date(this.now())),
    );
    if (reward) {
      this.mood(5);
      this.popup("That one’s done.", "happy");
    }
    if (allReward) {
      this.mood(15);
      this.popup("All tasks complete. Nicely done.", "celebrating");
    }
    this.pet.last_active_at = this.now();
    this.changed();
  }

  interact() {
    if (this.lastInteraction && this.now() - this.lastInteraction < 600) return;
    this.lastInteraction = this.now();
    this.pet.last_active_at = this.now();
    const active = this.timer.status === "running";
    const message = active
      ? this.timer.phase === "work"
        ? "We’re studying together."
        : "Taking a breather."
      : [
          "Ready when you are.",
          "Hi there.",
          "One task at a time.",
          "Shall we start?",
        ][Math.floor(Math.random() * 4)];
    this.popup(message, "happy", 4, false);
    this.changed();
  }

  setPet(type) {
    if (!["duckling", "penguin"].includes(type))
      throw new Error("Choose Duck or Penguin.");
    this.pet.pet_type = type;
    this.changed();
  }

  rename(name) {
    this.pet.name = D.text(name, 32);
    this.changed();
  }

  rollover() {
    const today = D.dateKey(new Date(this.now()));
    let last = this.store.get("processedDay", today);
    if (last === today) {
      if (!this.store.get("processedDay"))
        this.store.set("processedDay", today);
      return;
    }
    if (last > today) {
      this.store.set("processedDay", today);
      return;
    }
    while (last < today) {
      this.db.settle(last, this.pet.current_mood);
      if (this.pet.current_streak > 0 && !this.db.studied(last))
        this.pet.current_streak = 0;
      last = D.addDays(last, 1);
    }
    this.store.set("processedDay", today);
    this.persist();
  }

  setSettings(input) {
    this.settings = D.validateSettings(input);
    this.store.set("settings", {
      ...this.store.get("settings", {}),
      ...this.settings,
    });
    if (this.timer.status === "idle") {
      this.timer.remaining = this.settings[this.timer.phase] * 60;
      this.timer.planned = this.timer.remaining;
    }
    this.changed();
  }

  tick() {
    this.rollover();
    if (this.timer.status === "running" && this.remaining() === 0)
      this.advance(true);
    if (this.now() - (this.lastCheckpoint || 0) >= 10_000) {
      this.accrue();
      if (this.timer.status === "running") this.pet.last_active_at = this.now();
      this.persist();
      this.lastCheckpoint = this.now();
    }
    this.emit("change");
  }
}

module.exports = Engine;
