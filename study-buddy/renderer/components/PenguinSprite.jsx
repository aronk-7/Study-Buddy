export default function PenguinSprite({
  sleepy = false,
  joyful = false,
  studying = false,
  resting = false,
  stage = 0,
}) {
  return (
    <g className="penguin-mascot">
      <ellipse cx="90" cy="151" rx="35" ry="6" fill="#68775c" opacity=".12" />
      <g className="mascot-figure">
        <g className="mascot-foot mascot-foot-left">
          <ellipse cx="75" cy="145" rx="12" ry="5" fill="#dda36d" />
        </g>
        <g className="mascot-foot mascot-foot-right">
          <ellipse cx="106" cy="145" rx="12" ry="5" fill="#dda36d" />
        </g>
        <ellipse cx="90" cy="115" rx="32" ry="31" fill="#596976" />
        <ellipse cx="90" cy="119" rx="24" ry="25" fill="#fff7e8" />
        <g className="mascot-wing">
          <path
            d="M62 96 Q45 104 49 125 Q51 132 60 119 L69 103"
            fill="#596976"
          />
          <path
            d="M118 96 Q135 104 131 125 Q129 132 120 119 L111 103"
            fill="#596976"
          />
        </g>
        <path
          d="M65 98 Q90 108 115 98 L113 109 Q90 117 67 109 Z"
          fill="#b78f87"
        />
        <path d="M110 106 L112 124 L103 123 L102 108" fill="#c7a39a" />
        <g className="mascot-head">
          <ellipse cx="90" cy="72" rx="37" ry="36" fill="#596976" />
          <path
            d="M63 73 C58 49 80 47 90 59 C100 47 122 49 117 73 C121 95 102 103 90 103 C78 103 59 95 63 73 Z"
            fill="#fff7e8"
          />
          <path
            d="M82 37 Q82 26 89 34 Q91 28 97 35"
            fill="none"
            stroke="#596976"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <ellipse
            cx="72"
            cy="83"
            rx="7"
            ry="4"
            fill="#e6afa0"
            opacity={joyful ? ".75" : ".5"}
          />
          <ellipse
            cx="108"
            cy="83"
            rx="7"
            ry="4"
            fill="#e6afa0"
            opacity={joyful ? ".75" : ".5"}
          />
          {sleepy ? (
            <g
              fill="none"
              stroke="#3f4e55"
              strokeWidth="2.6"
              strokeLinecap="round"
            >
              <path d="M72 72 Q77 77 82 72 M98 72 Q103 77 108 72" />
            </g>
          ) : (
            <g className="mascot-eyes">
              <g className="mascot-eye">
                <ellipse cx="77" cy="72" rx="4.5" ry="6" fill="#3f4e55" />
                <circle cx="76" cy="70" r="1.5" fill="#fff" />
              </g>
              <g className="mascot-eye">
                <ellipse cx="103" cy="72" rx="4.5" ry="6" fill="#3f4e55" />
                <circle cx="102" cy="70" r="1.5" fill="#fff" />
              </g>
            </g>
          )}
          <path
            d="M82 83 Q90 79 98 83 Q96 91 90 92 Q84 91 82 83"
            fill="#dda36d"
          />
        </g>
        {stage > 0 && (
          <path
            d="M84 110 Q90 103 96 110 Q90 117 84 110"
            fill={stage === 3 ? "#e4b768" : "#dce5cc"}
          />
        )}
        {resting && (
          <g className="mascot-mug">
            <rect
              x="120"
              y="132"
              width="18"
              height="18"
              rx="6"
              fill="#b78f87"
            />
            <path
              d="M137 136 Q147 135 144 144 Q142 147 137 145"
              fill="none"
              stroke="#b78f87"
              strokeWidth="4"
            />
            <path
              className="mascot-steam"
              d="M127 126 Q122 121 127 116"
              fill="none"
              stroke="#c4c8b7"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
        )}
        {studying && (
          <g className="mascot-book">
            <path
              d="M64 123 Q77 119 90 127 Q103 119 116 123 L115 143 Q102 140 90 146 Q78 140 65 143 Z"
              fill="#b78f87"
            />
            <path
              d="M68 124 Q79 122 90 128 L90 141 Q79 137 68 139 Z M112 124 Q101 122 90 128 L90 141 Q101 137 112 139 Z"
              fill="#fff7e8"
            />
            <path
              d="M73 129 L83 131 M97 131 L107 129"
              fill="none"
              stroke="#a9b59e"
              strokeWidth="1.5"
            />
          </g>
        )}
      </g>
    </g>
  );
}
