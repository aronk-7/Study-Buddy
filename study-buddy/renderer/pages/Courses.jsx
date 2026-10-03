import { useState } from "react";
import { Plus, Check, Pencil } from "lucide-react";
const blankCourse = { name: "", code: "", semester: "", color_hex: "#6b8970" };
const blankAssessment = { subject_id: "", title: "", due_date: "", weight: 20 };
function Assessment({ assessment: a, state, act, edit }) {
  const [title, setTitle] = useState(""),
    [estimate, setEstimate] = useState(2);
  const left = Math.round(
      (Date.parse(a.due_date + "T12:00:00Z") -
        Date.parse(state.day + "T12:00:00Z")) /
        86400000,
    ),
    done = a.milestones.filter((m) => m.completed).length;
  async function add(e) {
    e.preventDefault();
    if (
      await act("milestone:add", {
        assessment_id: a.id,
        title,
        estimated_pomodoros: Number(estimate),
      })
    )
      setTitle("");
  }
  return (
    <section
      className={`card assessment-card ${a.completed ? "submitted" : ""}`}
    >
      <div className="card-heading">
        <div>
          <span className="section-label">
            {a.code || a.course}
            {a.semester ? " · " + a.semester : ""}
          </span>
          <h2>{a.title}</h2>
        </div>
        <span
          className={`due-badge ${!a.completed && left <= 3 ? "urgent" : ""}`}
        >
          {a.completed
            ? "Submitted"
            : left < 0
              ? `${-left} days overdue`
              : left === 0
                ? "Due today"
                : `Due in ${left} days`}
        </span>
      </div>
      <div className="assessment-info">
        <span>
          {new Date(a.due_date + "T12:00:00").toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        <span>{a.weight}% of course grade</span>
        <span>
          {done}/{a.milestones.length} milestones
        </span>
      </div>
      <div className="milestones">
        {a.milestones.map((m) => (
          <div className={`task ${m.completed ? "completed" : ""}`} key={m.id}>
            <button
              className="check-box"
              disabled={Boolean(a.completed)}
              aria-label={`${m.completed ? "Uncheck" : "Complete"} milestone ${m.title}`}
              aria-pressed={Boolean(m.completed)}
              onClick={() => act("milestone:toggle", { id: m.id })}
            >
              {Boolean(m.completed) && <Check size={14} />}
            </button>
            <div className="task-copy">
              <span>{m.title}</span>
              <div className="small muted">
                {m.estimated_pomodoros} Pomodoro
                {m.estimated_pomodoros === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        ))}
      </div>
      {!a.completed && (
        <form className="milestone-form" onSubmit={add}>
          <input
            required
            maxLength={160}
            aria-label={`New milestone for ${a.title}`}
            placeholder="Milestone, e.g. Write an outline"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label className="small muted">
            Pomodoros
            <input
              type="number"
              min="1"
              max="20"
              aria-label={`Milestone Pomodoros for ${a.title}`}
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
            />
          </label>
          <button className="secondary">
            <Plus size={14} />
            Add step
          </button>
        </form>
      )}
      <div className="assessment-actions">
        <button className="text-button" onClick={() => edit(a)}>
          <Pencil size={13} />
          Edit assessment
        </button>
        <button
          className="secondary"
          onClick={() => act("assessment:toggle", { id: a.id })}
        >
          {a.completed ? "Reopen assessment" : "Mark submitted"}
        </button>
      </div>
    </section>
  );
}
export default function Courses({ state, act }) {
  const [course, setCourse] = useState(blankCourse),
    [courseId, setCourseId] = useState(null),
    [assessment, setAssessment] = useState(blankAssessment),
    [assessmentId, setAssessmentId] = useState(null);
  function changeCourse(key, value) {
    setCourse((c) => ({ ...c, [key]: value }));
  }
  function changeAssessment(key, value) {
    setAssessment((a) => ({ ...a, [key]: value }));
  }
  async function saveCourse(e) {
    e.preventDefault();
    if (
      await act(courseId ? "course:update" : "subject:add", {
        ...course,
        id: courseId,
      })
    ) {
      setCourse(blankCourse);
      setCourseId(null);
    }
  }
  async function saveAssessment(e) {
    e.preventDefault();
    if (
      await act(assessmentId ? "assessment:update" : "assessment:add", {
        ...assessment,
        id: assessmentId,
        subject_id: Number(assessment.subject_id),
        weight: Number(assessment.weight),
      })
    ) {
      setAssessment(blankAssessment);
      setAssessmentId(null);
    }
  }
  function editAssessment(a) {
    setAssessment({
      subject_id: a.subject_id,
      title: a.title,
      due_date: a.due_date,
      weight: a.weight,
    });
    setAssessmentId(a.id);
    document
      .getElementById("assessment-editor")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  return (
    <>
      <div className="welcome">
        <div>
          <h1>Courses</h1>
          <p className="muted">Assessments, deadlines and milestones.</p>
        </div>
      </div>
      <div className="two-col university-forms">
        <section className="card">
          <h2>{courseId ? "Edit course" : "Courses"}</h2>
          <div className="course-list">
            {state.subjects.map((s) => (
              <button
                className="course-chip"
                key={s.id}
                onClick={() => {
                  setCourse({
                    name: s.name,
                    code: s.code || "",
                    semester: s.semester || "",
                    color_hex: s.color_hex,
                  });
                  setCourseId(s.id);
                }}
              >
                <i
                  className="subject-dot"
                  style={{ background: s.color_hex }}
                />
                <span>
                  <strong>
                    {s.code ? s.code + " · " : ""}
                    {s.name}
                  </strong>
                  <small>{s.semester || "Add semester details"}</small>
                </span>
                <Pencil size={12} />
              </button>
            ))}
          </div>
          <form onSubmit={saveCourse} className="university-form">
            <label>
              Course name
              <input
                required
                maxLength={60}
                value={course.name}
                onChange={(e) => changeCourse("name", e.target.value)}
                placeholder="Introduction to Psychology"
              />
            </label>
            <div className="form-row">
              <label>
                Course code (optional)
                <input
                  maxLength={20}
                  value={course.code}
                  onChange={(e) => changeCourse("code", e.target.value)}
                  placeholder="PSYC1001"
                />
              </label>
              <label>
                Semester (optional)
                <input
                  maxLength={40}
                  value={course.semester}
                  onChange={(e) => changeCourse("semester", e.target.value)}
                  placeholder="Semester 2, 2026"
                />
              </label>
            </div>
            <div className="form-row">
              <input
                type="color"
                aria-label="Course color"
                value={course.color_hex}
                onChange={(e) => changeCourse("color_hex", e.target.value)}
              />
              <button className="primary">
                {courseId ? "Save course" : "Add course"}
              </button>
              {courseId && (
                <button
                  className="quiet"
                  type="button"
                  onClick={() => {
                    setCourse(blankCourse);
                    setCourseId(null);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
        <section className="card" id="assessment-editor">
          <h2>{assessmentId ? "Edit assessment" : "Plan an assessment"}</h2>
          <form onSubmit={saveAssessment} className="university-form">
            <label>
              Course
              <select
                required
                value={assessment.subject_id}
                onChange={(e) => changeAssessment("subject_id", e.target.value)}
              >
                <option value="">Choose a course</option>
                {state.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code ? s.code + " · " : ""}
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assessment title
              <input
                required
                maxLength={160}
                value={assessment.title}
                onChange={(e) => changeAssessment("title", e.target.value)}
                placeholder="Research essay, final exam, group project…"
              />
            </label>
            <div className="form-row">
              <label>
                Due date
                <input
                  type="date"
                  required
                  value={assessment.due_date}
                  onChange={(e) => changeAssessment("due_date", e.target.value)}
                />
              </label>
              <label>
                Grade weighting (%)
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.1"
                  value={assessment.weight}
                  onChange={(e) => changeAssessment("weight", e.target.value)}
                />
              </label>
            </div>
            <div className="form-row">
              <button className="primary" disabled={!state.subjects.length}>
                {assessmentId ? "Save changes" : "Add assessment"}
              </button>
              {assessmentId && (
                <button
                  className="quiet"
                  type="button"
                  onClick={() => {
                    setAssessment(blankAssessment);
                    setAssessmentId(null);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
      <div className="assessment-list">
        {state.assessments?.length ? (
          state.assessments.map((a) => (
            <Assessment
              key={a.id}
              assessment={a}
              state={state}
              act={act}
              edit={editAssessment}
            />
          ))
        ) : (
          <section className="empty">
            Add an assessment to get a suggestion on Today.
          </section>
        )}
      </div>
      <p className="footer-note">
        Next step: earliest deadline, then grade weighting.
      </p>
    </>
  );
}
