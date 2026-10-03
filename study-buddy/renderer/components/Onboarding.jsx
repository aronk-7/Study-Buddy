import { useState } from "react";
import { ArrowRight } from "lucide-react";
import PetSprite from "./PetSprite";

export default function Onboarding({ state, act }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(state.pet.name);
  const [course, setCourse] = useState({
    name: "",
    code: "",
    semester: "",
    color_hex: "#81987c",
  });

  async function meet(event) {
    event.preventDefault();
    if (await act("pet:rename", { name })) setStep(1);
  }

  async function finish(event) {
    event.preventDefault();
    if (course.name.trim()) {
      if (!(await act("subject:add", course))) return;
    } else if (!state.subjects.length) {
      return;
    }
    await act("onboard:finish");
  }

  function updateCourse(key, value) {
    setCourse((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="onboarding">
      <div className="onboard-brand">study buddy</div>
      <div className="step-dots" aria-label={`Step ${step + 1} of 2`}>
        {[0, 1].map((index) => (
          <span key={index} className={index <= step ? "active" : ""} />
        ))}
      </div>
      {step === 0 ? (
        <form onSubmit={meet} className="meet-buddy">
          <div className="onboard-mascot">
            <PetSprite state="happy" size={220} />
          </div>
          <h1>Meet your buddy.</h1>
          <p className="muted">Your desktop study companion.</p>
          <label className="name-field">
            Buddy name
            <input
              required
              maxLength={32}
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label="Buddy name"
            />
          </label>
          <button className="primary" type="submit">
            Continue <ArrowRight size={16} />
          </button>
        </form>
      ) : (
        <>
          <h1>Add your first course.</h1>
          <p className="muted">Start with one. Add the rest later.</p>
          <form
            className="card onboard-content university-form"
            onSubmit={finish}
          >
            {state.subjects.length > 0 && (
              <p className="small muted">
                Your course is ready:{" "}
                {state.subjects.map((subject) => subject.name).join(", ")}.
              </p>
            )}
            <label>
              Course name
              <input
                required={!state.subjects.length}
                maxLength={60}
                placeholder="Networking"
                value={course.name}
                onChange={(event) => updateCourse("name", event.target.value)}
              />
            </label>
            <div className="form-row">
              <label>
                Course code (optional)
                <input
                  maxLength={20}
                  placeholder="COSC1111"
                  value={course.code}
                  onChange={(event) => updateCourse("code", event.target.value)}
                />
              </label>
              <label>
                Semester (optional)
                <input
                  maxLength={40}
                  placeholder="Semester 2"
                  value={course.semester}
                  onChange={(event) =>
                    updateCourse("semester", event.target.value)
                  }
                />
              </label>
            </div>
            <div className="onboard-actions">
              <input
                type="color"
                aria-label="Course colour"
                value={course.color_hex}
                onChange={(event) =>
                  updateCourse("color_hex", event.target.value)
                }
              />
              <button
                className="quiet"
                type="button"
                onClick={() => setStep(0)}
              >
                Back
              </button>
              <button className="primary" type="submit">
                Open Today <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </>
      )}
      <p className="small muted onboarding-footnote">Saved on this computer.</p>
    </div>
  );
}
