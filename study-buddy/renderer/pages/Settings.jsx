import { useState } from "react";
import { Save } from "lucide-react";

export default function Settings({ state, act }) {
  const [draft, setDraft] = useState({ ...state.settings });
  const [saved, setSaved] = useState(false);

  function update(key, value) {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaved(await act("settings:save", draft));
  }

  return (
    <>
      <div className="welcome">
        <div>
          <h1>Settings</h1>
        </div>
      </div>
      <form className="card settings-card" onSubmit={save}>
        <h2>Focus & rest</h2>
        <div className="duration-fields">
          {[
            ["work", "Focus session", 180],
            ["shortBreak", "Short break", 60],
            ["longBreak", "Long break", 120],
          ].map(([key, label, max]) => (
            <label key={key}>
              {label}
              <div>
                <input
                  required
                  type="number"
                  min="1"
                  max={max}
                  step="1"
                  value={draft[key]}
                  onChange={(event) => update(key, Number(event.target.value))}
                />
                <span>minutes</span>
              </div>
            </label>
          ))}
        </div>
        <p className="small muted">Changes apply to the next session.</p>
        <div className="setting-row">
          <div>
            <strong>Quiet notifications</strong>
            <p className="small muted">Notify when a focus session ends.</p>
          </div>
          <input
            type="checkbox"
            aria-label="Quiet notifications"
            checked={draft.notifications}
            onChange={(event) => update("notifications", event.target.checked)}
          />
        </div>
        <div className="save-row">
          <span className="small muted" role="status">
            {saved ? "Preferences saved." : ""}
          </span>
          <button className="primary" type="submit">
            <Save size={16} />
            Save preferences
          </button>
        </div>
      </form>
    </>
  );
}
