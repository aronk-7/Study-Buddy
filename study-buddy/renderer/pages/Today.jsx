import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import PomodoroTimer from "../components/PomodoroTimer";
import TaskList from "../components/TaskList";
import PetSprite, { buddyStates } from "../components/PetSprite";

export default function Today({ state, act, setPage }) {
  const [subject, setSubject] = useState(
    state.timer.subject_id || state.subjects[0]?.id || "",
  );
  const focus = useRef(null);
  const ready = state.timer.status === "idle" && state.timer.phase === "work";
  const next = state.nextStudy;
  const minutes = Math.round(
    state.sessions.reduce((sum, session) => sum + session.duration_minutes, 0),
  );

  useEffect(() => {
    if (!ready && state.timer.subject_id) setSubject(state.timer.subject_id);
    else if (!state.subjects.some((course) => course.id === Number(subject)))
      setSubject(state.subjects[0]?.id || "");
  }, [ready, state.timer.subject_id, state.subjects, subject]);

  async function studyNext() {
    if (!ready || !next || !(await act("study:planNext"))) return;
    setSubject(next.subject_id);
    focus.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    focus.current?.focus({ preventScroll: true });
  }

  return (
    <>
      <div className="welcome">
        <div>
          <h1>Today</h1>
        </div>
        <div className="date-pill">
          {new Date(`${state.day}T12:00:00`).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>
      <section className="next-study">
        <div>
          <span className="section-label">Up next</span>
          <h2>{next ? next.title : "Choose your next piece of work."}</h2>
          <p className="muted small">
            {next
              ? `${next.code || next.course} · ${next.assessment} · ${next.reason} · ${next.estimated_pomodoros} Pomodoro${next.estimated_pomodoros === 1 ? "" : "s"}`
              : "Add an assessment in Courses to get a study suggestion."}
          </p>
          {next && !ready && (
            <p className="small muted">
              Finish or reset the timer to choose a new focus.
            </p>
          )}
        </div>
        <div className="next-study-actions">
          {next && (
            <button className="primary" disabled={!ready} onClick={studyNext}>
              Study this next
            </button>
          )}
          <button className="text-button" onClick={() => setPage("Courses")}>
            Courses & assessments <ArrowUpRight size={14} />
          </button>
        </div>
      </section>
      <div className="today-grid">
        <div className="focus-column">
          <div ref={focus} id="focus-panel" tabIndex={-1}>
            <PomodoroTimer
              state={state}
              act={act}
              subject={subject}
              setSubject={setSubject}
            />
          </div>
          <TaskList state={state} act={act} />
        </div>
        <section className="buddy-card">
          <div className="card-heading">
            <h2>{state.pet.name}</h2>
            <span className="buddy-state">{buddyStates[state.animation]}</span>
          </div>
          <div className="pet-garden">
            <PetSprite
              type={state.pet.pet_type}
              state={state.animation}
              stage={state.pet.evolution_stage}
              size={210}
            />
          </div>
          {state.notice && (
            <p className="buddy-quote">{state.notice.message}</p>
          )}
          <button className="text-button" onClick={() => setPage("Buddy")}>
            Buddy controls <ArrowUpRight size={14} />
          </button>
          <div className="today-progress">
            <span>{minutes} min studied today</span>
            <span>{state.pet.current_streak} day streak</span>
          </div>
        </section>
      </div>
    </>
  );
}
