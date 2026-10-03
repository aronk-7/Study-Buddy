const Database = require("better-sqlite3");
const { dateKey, text, number } = require("./domain.cjs");
class StudyDB {
  constructor(path) {
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS subjects(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, color_hex TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY, date TEXT NOT NULL, subject_id INTEGER NOT NULL REFERENCES subjects(id), duration_minutes REAL NOT NULL, completed INTEGER NOT NULL, pomodoro_count INTEGER NOT NULL DEFAULT 0, started_at INTEGER NOT NULL, ended_at INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY, date TEXT NOT NULL, subject_id INTEGER NOT NULL REFERENCES subjects(id), description TEXT NOT NULL, estimated_pomodoros INTEGER NOT NULL, completed INTEGER NOT NULL DEFAULT 0, missed INTEGER NOT NULL DEFAULT 0, rewarded INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS streaks(id INTEGER PRIMARY KEY, date TEXT NOT NULL UNIQUE, pomodoro_count INTEGER NOT NULL DEFAULT 0, tasks_completed INTEGER NOT NULL DEFAULT 0, mood_end_of_day REAL);
      CREATE TABLE IF NOT EXISTS study_segments(id INTEGER PRIMARY KEY, subject_id INTEGER NOT NULL REFERENCES subjects(id), started_at INTEGER NOT NULL, ended_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS mood_history(id INTEGER PRIMARY KEY, timestamp INTEGER NOT NULL, mood REAL NOT NULL, reason TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS activity(id INTEGER PRIMARY KEY, date TEXT NOT NULL, application TEXT NOT NULL, seconds INTEGER NOT NULL, distracted INTEGER NOT NULL, UNIQUE(date,application,distracted));
      CREATE TABLE IF NOT EXISTS daily_rewards(date TEXT PRIMARY KEY);
      CREATE INDEX IF NOT EXISTS sessions_date ON sessions(date);
      CREATE INDEX IF NOT EXISTS tasks_date ON tasks(date);
    `);
    require("./university.cjs").migrate(this.db);
  }
  subjects() {
    return this.db.prepare("SELECT * FROM subjects ORDER BY id").all();
  }
  subject(id) {
    if (!this.db.prepare("SELECT id FROM subjects WHERE id=?").get(id))
      throw new Error("Choose an existing subject.");
    return id;
  }
  addSubject(input) {
    const [name, color, code, semester] =
      require("./university.cjs").courseFields(input);
    try {
      return this.db
        .prepare(
          "INSERT INTO subjects(name,color_hex,code,semester) VALUES(?,?,?,?)",
        )
        .run(name, color, code, semester).lastInsertRowid;
    } catch (e) {
      if (e.code === "SQLITE_CONSTRAINT_UNIQUE")
        throw new Error("That subject already exists.");
      throw e;
    }
  }
  tasks(day = dateKey()) {
    return this.db
      .prepare(
        "SELECT t.*, s.name subject, s.color_hex FROM tasks t JOIN subjects s ON s.id=t.subject_id WHERE date=? ORDER BY t.completed, t.id",
      )
      .all(day);
  }
  addTask(input, day = dateKey()) {
    if (!Number.isInteger(Number(input.estimated_pomodoros)))
      throw new Error("Estimated Pomodoros must be a whole number.");
    return this.db
      .prepare(
        "INSERT INTO tasks(date,subject_id,description,estimated_pomodoros) VALUES(?,?,?,?)",
      )
      .run(
        day,
        this.subject(Number(input.subject_id)),
        text(input.description, 250),
        number(Number(input.estimated_pomodoros), 1, 20),
      ).lastInsertRowid;
  }
  toggleTask(id, day = dateKey()) {
    return this.db.transaction(() => {
      const task = this.db
        .prepare("SELECT * FROM tasks WHERE id=? AND date=? AND missed=0")
        .get(id, day);
      if (!task) throw new Error("Task is no longer available.");
      const completed = !task.completed,
        reward = completed && !task.rewarded;
      this.db
        .prepare("UPDATE tasks SET completed=?, rewarded=? WHERE id=?")
        .run(+completed, +(task.rewarded || reward), id);
      if (task.milestone_id)
        this.db
          .prepare("UPDATE milestones SET completed=? WHERE id=?")
          .run(+completed, task.milestone_id);
      const tasks = this.tasks(day),
        all = tasks.length > 0 && tasks.every((t) => t.completed);
      const allReward =
        all &&
        this.db
          .prepare("INSERT OR IGNORE INTO daily_rewards(date) VALUES(?)")
          .run(day).changes > 0;
      return { reward, allReward };
    })();
  }
  deleteTask(id, day = dateKey()) {
    this.db
      .prepare("DELETE FROM tasks WHERE id=? AND date=? AND rewarded=0")
      .run(id, day);
  }
  logSession({ subject_id, minutes, completed, start, end, day }) {
    this.db.transaction(() => {
      this.db
        .prepare(
          "INSERT INTO sessions(date,subject_id,duration_minutes,completed,pomodoro_count,started_at,ended_at) VALUES(?,?,?,?,?,?,?)",
        )
        .run(
          day,
          this.subject(subject_id),
          minutes,
          +completed,
          +completed,
          start,
          end,
        );
      if (completed)
        this.db
          .prepare(
            "INSERT INTO streaks(date,pomodoro_count) VALUES(?,1) ON CONFLICT(date) DO UPDATE SET pomodoro_count=pomodoro_count+1",
          )
          .run(day);
    })();
  }
  studied(day) {
    return Boolean(
      this.db
        .prepare("SELECT 1 FROM sessions WHERE date=? AND completed=1 LIMIT 1")
        .get(day),
    );
  }
  settle(day, mood) {
    const tasks = this.tasks(day),
      missed = tasks.filter((t) => !t.completed && !t.missed).length;
    this.db
      .prepare("UPDATE tasks SET missed=1 WHERE date=? AND completed=0")
      .run(day);
    this.db
      .prepare(
        "INSERT INTO streaks(date,tasks_completed,mood_end_of_day) VALUES(?,?,?) ON CONFLICT(date) DO UPDATE SET tasks_completed=excluded.tasks_completed,mood_end_of_day=excluded.mood_end_of_day",
      )
      .run(day, tasks.filter((t) => t.completed).length, mood);
    return missed;
  }
  todaySessions(day = dateKey()) {
    return this.db
      .prepare(
        "SELECT x.*,s.name subject FROM sessions x JOIN subjects s ON s.id=x.subject_id WHERE date=? ORDER BY id DESC",
      )
      .all(day);
  }
  close() {
    this.db.close();
  }
}
Object.assign(StudyDB.prototype, require("./university.cjs").methods);
module.exports = StudyDB;
