import { useId } from "react";
import PenguinSprite from "./PenguinSprite";

export const buddyStates = {
  idle: "Ready",
  walking: "Ready",
  studying: "Studying",
  resting: "Resting",
  sleeping: "Sleepy",
  celebrating: "Happy",
  happy: "Happy",
};

export default function PetSprite({
  type = "duckling",
  state = "idle",
  stage = 0,
  size = 140,
  facing = 1,
  hovered = false,
  reaction = false,
}) {
  const highlight = useId().replaceAll(":", "");
  const sleepy = state === "sleeping" || state === "resting";
  const joyful = state === "happy" || state === "celebrating" || reaction;
  const studying = state === "studying";

  return (
    <span
      className={`mascot mascot-${state} ${hovered ? "mascot-hovered" : ""} ${joyful ? "mascot-joyful" : ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Your buddy is ${buddyStates[state]?.toLowerCase() || "ready"}`}
      data-state={state}
      data-type={type}
    >
      <svg
        viewBox="0 0 180 180"
        aria-hidden="true"
        style={{ transform: `scaleX(${facing || 1})` }}
      >
        {type === "penguin" ? (
          <PenguinSprite
            sleepy={sleepy}
            joyful={joyful}
            studying={studying}
            resting={state === "resting"}
            stage={stage}
          />
        ) : (
          <>
            <defs>
              <radialGradient id={highlight} cx="40%" cy="25%" r="80%">
                <stop offset="0" stopColor="#ffedb5" />
                <stop offset="1" stopColor="#efd183" />
              </radialGradient>
            </defs>
            <ellipse
              className="mascot-shadow"
              cx="90"
              cy="151"
              rx="42"
              ry="7"
              fill="#68775c"
              opacity=".12"
            />
            <g className="mascot-figure">
              <g className="mascot-foot mascot-foot-left">
                <ellipse cx="72" cy="143" rx="13" ry="6" fill="#dea16d" />
              </g>
              <g className="mascot-foot mascot-foot-right">
                <ellipse cx="109" cy="143" rx="13" ry="6" fill="#dea16d" />
              </g>
              <ellipse
                cx="90"
                cy="116"
                rx="34"
                ry="30"
                fill="#eed18b"
                stroke="#dbbd78"
                strokeWidth="1.2"
              />
              <ellipse
                cx="90"
                cy="120"
                rx="25"
                ry="23"
                fill="#fff1c5"
                opacity=".75"
              />
              <g className="mascot-wing mascot-wing-left">
                <ellipse
                  cx="57"
                  cy="112"
                  rx="12"
                  ry="21"
                  fill="#f4d995"
                  stroke="#dbbd78"
                  strokeWidth="1"
                  transform="rotate(18 57 112)"
                />
              </g>
              <g className="mascot-wing mascot-wing-right">
                <ellipse
                  cx="123"
                  cy="112"
                  rx="12"
                  ry="21"
                  fill="#f4d995"
                  stroke="#dbbd78"
                  strokeWidth="1"
                  transform="rotate(-18 123 112)"
                />
              </g>
              <path
                d="M65 99 Q90 109 115 99 L113 109 Q90 119 67 109 Z"
                fill="#8fa88b"
              />
              <path
                d="M108 106 Q118 118 112 130 L103 127 L103 108"
                fill="#a1b699"
              />
              <g className="mascot-head">
                <ellipse
                  cx="90"
                  cy="74"
                  rx="43"
                  ry="38"
                  fill={`url(#${highlight})`}
                  stroke="#dbbd78"
                  strokeWidth="1.2"
                />
                <path
                  d="M79 38 Q77 23 86 29 Q89 33 90 38 Q90 23 98 29 Q101 33 99 38"
                  fill="#f5df9e"
                  stroke="#dbbd78"
                  strokeWidth="1.2"
                />
                <ellipse
                  cx="69"
                  cy="83"
                  rx="10"
                  ry="6"
                  fill="#eaa59b"
                  opacity={joyful ? ".65" : ".35"}
                />
                <ellipse
                  cx="111"
                  cy="83"
                  rx="10"
                  ry="6"
                  fill="#eaa59b"
                  opacity={joyful ? ".65" : ".35"}
                />
                <g className="mascot-eyes">
                  {sleepy ? (
                    <g
                      fill="none"
                      stroke="#536053"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    >
                      <path d="M69 73 Q75 78 81 73" />
                      <path d="M100 73 Q106 78 112 73" />
                    </g>
                  ) : (
                    <>
                      <g className="mascot-eye mascot-eye-left">
                        <ellipse
                          cx="76"
                          cy="72"
                          rx="5.2"
                          ry="7.6"
                          fill="#46564c"
                        />
                        <circle cx="74.5" cy="69.5" r="2" fill="#fffef7" />
                      </g>
                      <g className="mascot-eye mascot-eye-right">
                        <ellipse
                          cx="105"
                          cy="72"
                          rx="5.2"
                          ry="7.6"
                          fill="#46564c"
                        />
                        <circle cx="103.5" cy="69.5" r="2" fill="#fffef7" />
                      </g>
                    </>
                  )}
                </g>
                <path
                  d="M80 86 Q90 79 101 86 Q99 94 90 95 Q82 94 80 86"
                  fill="#e2a16b"
                />
                <path
                  d={joyful ? "M84 88 Q90 92 97 87" : "M85 88 Q90 89 96 88"}
                  fill="none"
                  stroke="#b67e51"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
                {studying && (
                  <g
                    fill="none"
                    stroke="#627966"
                    strokeWidth="1.6"
                    opacity=".85"
                  >
                    <rect x="65" y="63" width="23" height="18" rx="7" />
                    <rect x="94" y="63" width="23" height="18" rx="7" />
                    <path d="M88 70 Q91 67 94 70" />
                  </g>
                )}
              </g>
              {stage > 0 && (
                <path
                  d="M83 109 Q91 100 97 109 Q90 118 83 109"
                  fill={stage === 3 ? "#e4b768" : "#dce5cc"}
                />
              )}
              {studying && (
                <g className="mascot-book">
                  <path
                    d="M53 124 Q71 119 90 128 Q109 119 127 124 L125 148 Q108 145 90 152 Q72 145 55 148 Z"
                    fill="#718d76"
                  />
                  <path
                    d="M57 123 Q75 121 90 129 L90 147 Q75 141 58 143 Z"
                    fill="#fff8e4"
                  />
                  <path
                    d="M123 123 Q105 121 90 129 L90 147 Q105 141 122 143 Z"
                    fill="#f5edda"
                  />
                  <g stroke="#adb9a1" strokeWidth="1.3" strokeLinecap="round">
                    <path d="M65 129 L80 131 M65 135 L79 137 M100 132 L116 129 M101 138 L116 135" />
                  </g>
                  <path d="M91 130 L91 150" stroke="#ddd2af" strokeWidth="1" />
                </g>
              )}
              {state === "resting" && (
                <g className="mascot-mug">
                  <rect
                    x="119"
                    y="134"
                    width="19"
                    height="18"
                    rx="6"
                    fill="#9daf93"
                  />
                  <path
                    d="M137 137 Q148 137 145 144 Q142 148 137 146"
                    fill="none"
                    stroke="#9daf93"
                    strokeWidth="4"
                  />
                  <path
                    className="mascot-steam"
                    d="M126 128 Q120 123 126 118 M133 127 Q138 123 132 117"
                    fill="none"
                    stroke="#c4c8b7"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </g>
              )}
            </g>
          </>
        )}
        {state === "sleeping" && (
          <g className="mascot-zzz" fill="#829480" fontFamily="Georgia, serif">
            <text x="131" y="55" fontSize="12">
              z
            </text>
            <text x="142" y="39" fontSize="17">
              z
            </text>
          </g>
        )}
        {(joyful || hovered) && (
          <g className="mascot-sparkles">
            <path
              d="M30 62 L33 69 L40 72 L33 75 L30 82 L27 75 L20 72 L27 69 Z"
              fill="#d7bd78"
            />
            <path
              d="M148 77 L151 82 L156 85 L151 87 L148 93 L145 87 L140 85 L145 82 Z"
              fill="#b3c4a2"
            />
            <path
              d="M127 31 C120 20 113 31 127 40 C141 31 134 20 127 31"
              fill="#e6aaa1"
            />
          </g>
        )}
      </svg>
    </span>
  );
}
