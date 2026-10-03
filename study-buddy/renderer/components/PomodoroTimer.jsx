import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
export const clock = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.max(0, Math.floor(seconds % 60))).padStart(2, "0")}`;
export default function PomodoroTimer({ state, act, subject, setSubject }) {
  const { timer, subjects } = state,
    working = timer.phase === "work",
    running = timer.status === "running",
    progress = Math.min(1, Math.max(0, 1 - timer.remaining / timer.planned));
  return (
    <section className="card focus-card">
      <div className="card-heading">
        <h2>
          {working
            ? "Focus timer"
            : timer.phase === "longBreak"
              ? "Long break"
              : "Short break"}
        </h2>
      </div>
      <div className="timer-ring">
        <svg viewBox="0 0 240 240">
          <circle className="ring-track" cx="120" cy="120" r="106" />
          <circle
            className="ring-progress"
            cx="120"
            cy="120"
            r="106"
            style={{
              strokeDasharray: 666,
              strokeDashoffset: 666 * (1 - progress),
            }}
          />
        </svg>
        <div className="timer-center">
          <strong>{clock(timer.remaining)}</strong>
        </div>
      </div>
      <label className="subject-select">
        <span className="small muted">Course</span>
        <select
          value={subject}
          disabled={timer.status !== "idle" || !working}
          onChange={(e) => setSubject(Number(e.target.value))}
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <div className="timer-actions">
        <button
          className="icon-button"
          title="Reset timer"
          aria-label="Reset timer"
          onClick={() => act("timer:reset")}
        >
          <RotateCcw size={18} />
        </button>
        <button
          className="primary start"
          disabled={!subjects.length}
          onClick={() =>
            act(running ? "timer:pause" : "timer:start", {
              subject_id: subject,
            })
          }
        >
          {running ? (
            <Pause size={17} />
          ) : (
            <Play size={17} fill="currentColor" />
          )}
          {running
            ? "Pause session"
            : timer.status === "paused"
              ? "Resume session"
              : working
                ? "Start focus"
                : "Start break"}
        </button>
        <button
          className="icon-button"
          title="Skip phase"
          aria-label="Skip phase"
          onClick={() => act("timer:skip")}
        >
          <SkipForward size={19} />
        </button>
      </div>
      <div className="pomodoro-dots">
        {Array.from({ length: 4 }, (_, i) => (
          <span
            key={i}
            className={
              i < timer.cycle % 4 ||
              (timer.cycle > 0 &&
                timer.cycle % 4 === 0 &&
                timer.phase === "longBreak")
                ? "done"
                : ""
            }
          />
        ))}
        <span className="muted small">{timer.cycle} sessions this cycle</span>
      </div>
    </section>
  );
}
