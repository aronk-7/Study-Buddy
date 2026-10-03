import { useRef } from "react";
import PetSprite from "./PetSprite";

export default function DesktopBuddy({ state, act }) {
  const drag = useRef(null);
  const dragged = useRef(false);
  const [nativeState, animation] = [
    state.animation,
    state.walking ? "walking" : state.animation,
  ];
  const visibleState =
    state.walking && nativeState === "idle" ? animation : nativeState;
  const bubble = state.notice || state.hovered || state.moving;

  function begin(e) {
    if (!state.moving) return;
    dragged.current = false;
    drag.current = { x: e.screenX, y: e.screenY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function move(e) {
    if (!drag.current) return;
    const dx = e.screenX - drag.current.x;
    const dy = e.screenY - drag.current.y;
    if (!dragged.current && Math.abs(dx) + Math.abs(dy) < 3) return;
    dragged.current = true;
    drag.current = { x: e.screenX, y: e.screenY };
    act("overlay:drag", { dx, dy });
  }

  return (
    <div className="overlay-view">
      {bubble && (
        <div className="pet-speech">
          <p>
            {state.moving
              ? "Drag to move."
              : state.notice?.message ||
                (state.timer.status === "running"
                  ? state.timer.phase === "work"
                    ? "We’re studying together."
                    : "Taking a breather."
                  : "Ready when you are.")}
          </p>
          <div className="overlay-controls">
            <button onClick={() => act("dashboard:open", { page: "Today" })}>
              Open Study Buddy
            </button>
            {state.moving && (
              <button onClick={() => act("overlay:lock")}>Done</button>
            )}
          </div>
        </div>
      )}
      <button
        className="desktop-pet"
        aria-label={`Say hello to ${state.pet.name}`}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
          dragged.current = true;
        }}
        onClick={() => {
          if (!dragged.current) act("pet:interact");
          dragged.current = false;
        }}
      >
        <PetSprite
          type={state.pet.pet_type}
          state={visibleState}
          stage={state.pet.evolution_stage}
          size={112}
          facing={state.facing}
          hovered={state.hovered}
          reaction={state.notice?.state === "happy"}
        />
      </button>
    </div>
  );
}
