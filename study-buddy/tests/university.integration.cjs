const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const Database = require("better-sqlite3"),
  DB = require("../main/db.cjs");
const file = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "study-buddy-upgrade-")),
  "old.sqlite",
);
const old = new Database(file);
old.exec(
  "CREATE TABLE subjects(id INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE,color_hex TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);INSERT INTO subjects(name,color_hex) VALUES('Math','#6b8970');",
);
old.close();
const db = new DB(file);
assert.equal(db.subjects()[0].name, "Math");
assert.equal(db.subjects()[0].code, "");
const subject = db.subjects()[0].id;
db.updateCourse({
  id: subject,
  name: "Math",
  code: "MATH1001",
  semester: "Semester 2, 2026",
  color_hex: "#6b8970",
});
assert.equal(db.subjects()[0].code, "MATH1001");
const later = db.addAssessment({
  subject_id: subject,
  title: "Exam",
  due_date: "2026-11-01",
  weight: 50,
});
const early = db.addAssessment({
  subject_id: subject,
  title: "Essay",
  due_date: "2026-10-05",
  weight: 20,
});
const high = db.addAssessment({
  subject_id: subject,
  title: "Project",
  due_date: "2026-10-05",
  weight: 40,
});
assert.equal(db.nextStudy("2026-10-03").assessment_id, high);
assert.equal(db.nextStudy("2026-10-03").daysLeft, 2);
const first = db.addMilestone({
  assessment_id: high,
  title: "Research",
  estimated_pomodoros: 2,
});
const second = db.addMilestone({
  assessment_id: high,
  title: "Draft",
  estimated_pomodoros: 3,
});
assert.equal(db.nextStudy("2026-10-03").milestone_id, first);
const task = db.planNext("2026-10-03");
assert.equal(db.planNext("2026-10-03"), task);
assert.equal(db.tasks("2026-10-03").length, 1);
assert.equal(db.toggleTask(task, "2026-10-03").reward, true);
assert.equal(db.nextStudy("2026-10-03").milestone_id, second);
db.toggleTask(task, "2026-10-03");
assert.equal(db.nextStudy("2026-10-03").milestone_id, first);
assert.equal(db.toggleTask(task, "2026-10-03").reward, false);
db.toggleMilestone(second);
assert.match(db.nextStudy("2026-10-03").title, /Review and submit/);
db.toggleAssessment(high);
assert.equal(db.nextStudy("2026-10-03").assessment_id, early);
db.updateAssessment({
  id: early,
  subject_id: subject,
  title: "Revised essay",
  due_date: "2026-10-02",
  weight: 25,
});
assert.equal(db.nextStudy("2026-10-03").daysLeft, -1);
assert.throws(() =>
  db.addAssessment({
    subject_id: subject,
    title: "Bad date",
    due_date: "2026-02-30",
    weight: 20,
  }),
);
assert.throws(() =>
  db.addAssessment({
    subject_id: subject,
    title: "Bad weighting",
    due_date: "2026-10-05",
    weight: 101,
  }),
);
assert.throws(() => db.addMilestone({ assessment_id: 999, title: "Missing" }));
assert.throws(() =>
  db.addMilestone({ assessment_id: high, title: "Submitted" }),
);
db.toggleAssessment(early);
db.toggleAssessment(later);
assert.equal(db.nextStudy("2026-10-03"), null);
assert.throws(() => db.planNext("2026-10-03"));
assert.equal(db.db.pragma("foreign_key_check").length, 0);
db.close();
const reopened = new DB(file);
assert.equal(reopened.assessments().length, 3);
assert.equal(reopened.subjects()[0].semester, "Semester 2, 2026");
reopened.close();
console.log(
  "PASS: university schema upgrade, course details, deadline/weight ordering, milestone task deduplication, completion sync, assessment editing, validation, submission, and persistence.",
);
