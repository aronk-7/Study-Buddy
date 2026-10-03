const { dateKey, text, number, dayDistance } = require("./domain.cjs");
function optional(value, max) {
  return value == null || value === "" ? "" : text(value, max);
}
function dueDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    dateKey(new Date(`${value}T12:00:00`)) !== value
  )
    throw new Error("Choose a valid due date.");
  return value;
}
function courseFields(input) {
  const color = input.color_hex || "#6b8970";
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("Invalid course color.");
  return [
    text(input.name, 60),
    color,
    optional(input.code, 20),
    optional(input.semester, 40),
  ];
}
function migrate(db) {
  const add = (table, column, definition) => {
    if (
      !db
        .prepare(`PRAGMA table_info(${table})`)
        .all()
        .some((c) => c.name === column)
    )
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  };
  add("subjects", "code", "TEXT NOT NULL DEFAULT ''");
  add("subjects", "semester", "TEXT NOT NULL DEFAULT ''");
  db.exec(`CREATE TABLE IF NOT EXISTS assessments(id INTEGER PRIMARY KEY,subject_id INTEGER NOT NULL REFERENCES subjects(id),title TEXT NOT NULL,due_date TEXT NOT NULL,weight REAL NOT NULL DEFAULT 0,completed INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS milestones(id INTEGER PRIMARY KEY,assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,title TEXT NOT NULL,estimated_pomodoros INTEGER NOT NULL DEFAULT 2,completed INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  add("tasks", "assessment_id", "INTEGER REFERENCES assessments(id)");
  add("tasks", "milestone_id", "INTEGER REFERENCES milestones(id)");
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS daily_milestone ON tasks(date,milestone_id) WHERE milestone_id IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS daily_assessment ON tasks(date,assessment_id) WHERE assessment_id IS NOT NULL AND milestone_id IS NULL;`);
}
const methods = {
  updateCourse(input) {
    const id = this.subject(Number(input.id));
    try {
      this.db
        .prepare(
          "UPDATE subjects SET name=?,color_hex=?,code=?,semester=? WHERE id=?",
        )
        .run(...courseFields(input), id);
    } catch (e) {
      if (e.code === "SQLITE_CONSTRAINT_UNIQUE")
        throw new Error("That course name already exists.");
      throw e;
    }
  },
  assessments() {
    const rows = this.db
      .prepare(
        "SELECT a.*,s.name course,s.code,s.semester,s.color_hex FROM assessments a JOIN subjects s ON s.id=a.subject_id ORDER BY a.completed,a.due_date,a.weight DESC,a.id",
      )
      .all();
    const steps = this.db.prepare("SELECT * FROM milestones ORDER BY id").all();
    return rows.map((a) => ({
      ...a,
      milestones: steps.filter((m) => m.assessment_id === a.id),
    }));
  },
  assessment(id) {
    const a = this.db
      .prepare("SELECT * FROM assessments WHERE id=?")
      .get(Number(id));
    if (!a) throw new Error("Choose an existing assessment.");
    return a;
  },
  addAssessment(input) {
    return this.db
      .prepare(
        "INSERT INTO assessments(subject_id,title,due_date,weight) VALUES(?,?,?,?)",
      )
      .run(
        this.subject(Number(input.subject_id)),
        text(input.title, 160),
        dueDate(input.due_date),
        number(Number(input.weight ?? 0), 0, 100),
      ).lastInsertRowid;
  },
  updateAssessment(input) {
    const a = this.assessment(input.id);
    this.db
      .prepare(
        "UPDATE assessments SET subject_id=?,title=?,due_date=?,weight=? WHERE id=?",
      )
      .run(
        this.subject(Number(input.subject_id)),
        text(input.title, 160),
        dueDate(input.due_date),
        number(Number(input.weight ?? 0), 0, 100),
        a.id,
      );
  },
  toggleAssessment(id) {
    const a = this.assessment(id);
    this.db
      .prepare("UPDATE assessments SET completed=? WHERE id=?")
      .run(a.completed ? 0 : 1, a.id);
  },
  addMilestone(input) {
    const a = this.assessment(input.assessment_id);
    if (a.completed)
      throw new Error("Reopen this assessment before adding a milestone.");
    const estimate = Number(input.estimated_pomodoros ?? 2);
    if (!Number.isInteger(estimate))
      throw new Error("Use a whole number of Pomodoros.");
    return this.db
      .prepare(
        "INSERT INTO milestones(assessment_id,title,estimated_pomodoros) VALUES(?,?,?)",
      )
      .run(a.id, text(input.title, 160), number(estimate, 1, 20))
      .lastInsertRowid;
  },
  toggleMilestone(id) {
    const m = this.db
      .prepare("SELECT * FROM milestones WHERE id=?")
      .get(Number(id));
    if (!m) throw new Error("Choose an existing milestone.");
    this.db
      .prepare("UPDATE milestones SET completed=? WHERE id=?")
      .run(m.completed ? 0 : 1, m.id);
  },
  nextStudy(day = dateKey()) {
    const a = this.assessments().find((a) => !a.completed);
    if (!a) return null;
    const m = a.milestones.find((m) => !m.completed),
      left = dayDistance(day, a.due_date);
    return {
      assessment_id: a.id,
      milestone_id: m?.id || null,
      subject_id: a.subject_id,
      title:
        m?.title ||
        (a.milestones.length
          ? "Review and submit " + a.title
          : "Start " + a.title),
      assessment: a.title,
      course: a.course,
      code: a.code,
      due_date: a.due_date,
      daysLeft: left,
      weight: a.weight,
      estimated_pomodoros: m?.estimated_pomodoros || 1,
      reason:
        left < 0
          ? "This assessment is overdue."
          : left === 0
            ? "Due today."
            : `Due in ${left} day${left === 1 ? "" : "s"}.`,
    };
  },
  planNext(day = dateKey()) {
    return this.db.transaction(() => {
      const next = this.nextStudy(day);
      if (!next) throw new Error("Add an assessment to plan a next step.");
      const existing = next.milestone_id
        ? this.db
            .prepare("SELECT id FROM tasks WHERE date=? AND milestone_id=?")
            .get(day, next.milestone_id)
        : this.db
            .prepare(
              "SELECT id FROM tasks WHERE date=? AND assessment_id=? AND milestone_id IS NULL",
            )
            .get(day, next.assessment_id);
      if (existing) return existing.id;
      return this.db
        .prepare(
          "INSERT INTO tasks(date,subject_id,description,estimated_pomodoros,assessment_id,milestone_id) VALUES(?,?,?,?,?,?)",
        )
        .run(
          day,
          next.subject_id,
          next.title,
          next.estimated_pomodoros,
          next.assessment_id,
          next.milestone_id,
        ).lastInsertRowid;
    })();
  },
};
module.exports = { migrate, methods, courseFields };
