import { useEffect, useState } from "react";
import { Sun, Heart, Settings as SettingsIcon, BookOpen } from "lucide-react";
import Courses from "./pages/Courses";
import Today from "./pages/Today";
import Buddy from "./pages/Buddy";
import Settings from "./pages/Settings";
import Onboarding from "./components/Onboarding";
import DesktopBuddy from "./components/DesktopBuddy";

const api = window.studyBuddy;
const nav = [
  ["Today", Sun],
  ["Courses", BookOpen],
  ["Buddy", Heart],
  ["Settings", SettingsIcon],
];
const isOverlay =
  new URLSearchParams(location.search).get("view") === "overlay";

export default function App() {
  const [state, setState] = useState(null);
  const [page, setPage] = useState("Today");
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("overlay-root", isOverlay);
    if (!api) return;
    api
      .getState()
      .then(setState)
      .catch((e) => setError(e.message));
    const unsubscribe = api.subscribe(setState);
    const unsubscribeOverlay = api.subscribeOverlay((activity) => {
      setState((previous) =>
        previous ? { ...previous, ...activity } : previous,
      );
    });
    return () => {
      unsubscribe();
      unsubscribeOverlay();
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (nav.some(([name]) => name === e.detail)) setPage(e.detail);
    };
    window.addEventListener("buddy:page", handler);
    return () => window.removeEventListener("buddy:page", handler);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  async function act(action, payload) {
    try {
      setState(await api.act(action, payload));
      setError("");
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  if (!api)
    return (
      <div className="loading">
        Open the desktop app with <code>pnpm dev</code>.
      </div>
    );
  if (!state)
    return isOverlay ? null : (
      <div className="loading">{error || "Waking up your buddy…"}</div>
    );
  if (isOverlay) return <DesktopBuddy state={state} act={act} />;

  const pages = {
    Today: <Today state={state} act={act} setPage={setPage} />,
    Courses: <Courses state={state} act={act} />,
    Buddy: <Buddy state={state} act={act} />,
    Settings: <Settings state={state} act={act} />,
  };

  return (
    <>
      {error && (
        <div className="error-toast" role="alert">
          <span>{error}</span>
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}
      {!state.onboarded ? (
        <Onboarding state={state} act={act} />
      ) : (
        <div className="app-shell">
          <aside className="sidebar">
            <div className="brand">
              <span>
                study buddy<small>Study, at your pace.</small>
              </span>
            </div>
            <nav>
              {nav.map(([name, Icon]) => (
                <button
                  key={name}
                  className={page === name ? "active" : ""}
                  onClick={() => setPage(name)}
                >
                  <Icon size={18} />
                  {name}
                  {page === name && <span className="nav-dot" />}
                </button>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <span className="privacy">Saved on this computer.</span>
            </div>
          </aside>
          <main className="main-area">
            <div className="page-content">{pages[page]}</div>
          </main>
        </div>
      )}
    </>
  );
}
