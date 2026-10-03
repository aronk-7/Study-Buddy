import { useState } from "react";
import { Move, Flame } from "lucide-react";
import PetSprite, { buddyStates } from "../components/PetSprite";
import MoodBar from "../components/MoodBar";

export default function Buddy({ state, act }) {
  const [name, setName] = useState(state.pet.name);
  const [saved, setSaved] = useState(false);

  async function rename(event) {
    event.preventDefault();
    setSaved(await act("pet:rename", { name }));
  }

  return (
    <>
      <div className="welcome">
        <div>
          <h1>{state.pet.name}</h1>
        </div>
      </div>
      <section className="buddy-profile">
        <div className="buddy-portrait">
          <PetSprite
            type={state.pet.pet_type}
            state={state.animation}
            stage={state.pet.evolution_stage}
            size={260}
            reaction={state.notice?.state === "happy"}
          />
          <span className="tag">{buddyStates[state.animation]}</span>
        </div>
        <div className="buddy-details">
          {state.notice && (
            <p className="buddy-quote">{state.notice.message}</p>
          )}
          <div
            className="buddy-choice"
            role="group"
            aria-label="Buddy appearance"
          >
            {[
              ["duckling", "Duck"],
              ["penguin", "Penguin"],
            ].map(([type, label]) => (
              <button
                key={type}
                className="secondary"
                data-buddy={type}
                aria-pressed={state.pet.pet_type === type}
                onClick={() => act("pet:choose", { type })}
              >
                {label}
              </button>
            ))}
          </div>
          <form className="rename-form" onSubmit={rename}>
            <label>
              Buddy name
              <input
                required
                maxLength={32}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved(false);
                }}
              />
            </label>
            <button className="secondary" type="submit">
              Save name
            </button>
          </form>
          {saved && (
            <p className="small muted" role="status">
              Name saved.
            </p>
          )}
          <MoodBar pet={state.pet} />
          <div className="buddy-streak">
            <Flame size={19} />
            <strong>{state.pet.current_streak} day streak</strong>
          </div>
          <p className="small muted">
            Growth ·{" "}
            {
              ["Baby", "Growing", "Mature", "Fully grown"][
                state.pet.evolution_stage
              ]
            }
          </p>
          <div className="desktop-buddy-actions">
            <button
              className="primary"
              onClick={() => act("overlay:roam", { enabled: !state.roaming })}
            >
              {state.roaming ? "Pause roaming" : "Let buddy roam"}
            </button>
            <button className="secondary" onClick={() => act("overlay:move")}>
              <Move size={16} />
              Move buddy
            </button>
          </div>
          <p className="small muted">
            Click the desktop buddy to say hello. Roaming pauses during focus.
          </p>
        </div>
      </section>
    </>
  );
}
