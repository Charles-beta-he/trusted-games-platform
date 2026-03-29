import React from 'react';

// Mapping ranges to [0, 1]
function normalize(value, min, max) {
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

// Convert polar to cartesian, center at (cx, cy), radius r, angle in radians (0 = up)
function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

// Four axes: top=attack, right=noise, bottom=defense, left=center
// angles: top=0°, right=90°, bottom=180°, left=270°
const AXES = [
  { key: 'attack',  label: '进攻力', angle: 0   },
  { key: 'noise',   label: '走法多样性', angle: 90  },
  { key: 'defense', label: '防守力', angle: 180 },
  { key: 'center',  label: '中腹偏好', angle: 270 },
];

const CX = 100;
const CY = 100;
const R  = 70; // max radius

function buildPolygonPoints(values, cx, cy, r) {
  return AXES.map(({ key, angle }) => {
    const v = values[key] ?? 0;
    const pt = polar(cx, cy, v * r, angle);
    return `${pt.x},${pt.y}`;
  }).join(' ');
}

function buildRingPoints(scale, cx, cy, r) {
  return AXES.map(({ angle }) => {
    const pt = polar(cx, cy, scale * r, angle);
    return `${pt.x},${pt.y}`;
  }).join(' ');
}

export default function StyleRadar({ params = {} }) {
  const { attack = 1.2, defense = 1.2, center = 0.25, noise = 0.175 } = params;

  const normalized = {
    attack:  normalize(attack,  0.6, 1.8),
    defense: normalize(defense, 0.6, 1.8),
    center:  normalize(center,  0,   0.5),
    noise:   normalize(noise,   0,   0.35),
  };

  const dataPoints = buildPolygonPoints(normalized, CX, CY, R);
  const rings = [0.2, 0.6, 1.0];

  return (
    <div
      style={{
        maxWidth: 160,
        width: '100%',
        margin: '0 auto',
        userSelect: 'none',
      }}
    >
      <svg
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label="棋风雷达图"
      >
        {/* Background rings */}
        {rings.map((scale) => (
          <polygon
            key={scale}
            points={buildRingPoints(scale, CX, CY, R)}
            fill="none"
            stroke="var(--border-color, #ccc)"
            strokeWidth="0.8"
            opacity="0.5"
          />
        ))}

        {/* Axis lines */}
        {AXES.map(({ angle, label }) => {
          const tip = polar(CX, CY, R, angle);
          return (
            <line
              key={angle}
              x1={CX}
              y1={CY}
              x2={tip.x}
              y2={tip.y}
              stroke="var(--border-color, #ccc)"
              strokeWidth="0.8"
              opacity="0.5"
            />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={dataPoints}
          fill="var(--accent-primary, #6c63ff)"
          fillOpacity="0.25"
          stroke="var(--accent-primary, #6c63ff)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Data point dots */}
        {AXES.map(({ key, angle }) => {
          const v = normalized[key] ?? 0;
          const pt = polar(CX, CY, v * R, angle);
          return (
            <circle
              key={key}
              cx={pt.x}
              cy={pt.y}
              r="3"
              fill="var(--accent-primary, #6c63ff)"
            />
          );
        })}

        {/* Labels */}
        {AXES.map(({ angle, label }) => {
          const LABEL_R = R + 18;
          const pt = polar(CX, CY, LABEL_R, angle);
          let textAnchor = 'middle';
          if (angle === 90)  textAnchor = 'start';
          if (angle === 270) textAnchor = 'end';
          return (
            <text
              key={angle}
              x={pt.x}
              y={pt.y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              fontSize="9"
              fill="var(--text-secondary, #888)"
              fontFamily="system-ui, sans-serif"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
