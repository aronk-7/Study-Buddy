import { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
export default function TaskList({ state, act, initialOpen = false }) {
  const [open, setOpen] = useState(initialOpen),
    [description, setDescription] = useState(""),
    [subject, setSubject] = useState(state.subjects[0]?.id || ""),
    [estimate, setEstimate] = useState(1);
  const done = state.tasks.filter((t) => t.completed).length;
  async function add(e) {
    e.preventDefault();
    const ok = await act("task:add", {
      description,
      subject_id: Number(subject || state.subjects[0]?.id),
      estimated_pomodoros: Number(estimate),
    });
    if (ok) {
      setDescription("");
      setOpen(false);
    }
  }
  return (
    <section className="card task-card">
      <div className="card-heading">
        <div>
          <h2>Tasks</h2>
        </div>
        <span className="count">
          {done}/{state.tasks.length}
        </span>
      </div>
      <div className="tasks">
        {state.tasks.length ? (
          state.tasks.map((t) => (
            <div
              className={`task ${t.completed ? "completed" : ""}`}
              key={t.id}
            >
              <button
                className="check-box"
                aria-label={`${t.completed ? "Uncheck" : "Complete"} ${t.description}`}
                aria-pressed={Boolean(t.completed)}
                onClick={() => act("task:toggle", { id: t.id })}
              >
                {Boolean(t.completed) && <Check size={14} />}
              </button>
              <div className="task-copy">
                <span>{t.description}</span>
                <div className="small muted">
                  <i
                    className="subject-dot"
                    style={{ background: t.color_hex }}
                  />
                  {t.subject}
                  <span className="task-estimate">
                    {t.estimated_pomodoros} pomodoro
                    {t.estimated_pomodoros > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              {!t.rewarded && (
                <button
                  className="delete"
                  aria-label={`Delete ${t.description}`}
                  onClick={() => act("task:delete", { id: t.id })}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="empty">
            <span>No tasks yet.</span>
            <p className="small muted">
              Add a task or use the suggestion above.
            </p>
          </div>
        )}
      </div>
      {open ? (
        <form onSubmit={add} className="inline-form">
          <input
            autoFocus
            placeholder="Task description"
            aria-label="Task description"
            maxLength={250}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="form-row">
            <select
              aria-label="Task subject"
              value={subject || state.subjects[0]?.id || ""}
              onChange={(e) => setSubject(e.target.value)}
              required
            >
              {state.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              className="estimate"
              aria-label="Estimated pomodoros"
              type="number"
              min="1"
              max="20"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
            />
            <button className="primary" type="submit">
              Add
            </button>
            <button
              type="button"
              className="quiet"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          className="add-task"
          disabled={!state.subjects.length}
          onClick={() => setOpen(true)}
        >
          <Plus size={16} />
          Add a task
        </button>
      )}
    </section>
  );
}
