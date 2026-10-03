import { Heart } from "lucide-react";

export default function MoodBar({ pet, compact = false }) {
  return (
    <div className={`mood ${compact ? "compact" : ""}`}>
      <div
        className="hearts"
        aria-label={`Buddy mood: ${pet.hearts} of 5 hearts`}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <Heart
            key={index}
            size={compact ? 12 : 17}
            fill={index < pet.hearts ? "currentColor" : "none"}
            className={index < pet.hearts ? "filled" : ""}
          />
        ))}
      </div>
      {!compact && <span className="small muted">Mood</span>}
    </div>
  );
}
