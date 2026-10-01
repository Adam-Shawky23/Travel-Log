const PINS = [
  { x: 240, y: 76, delay: 0.9 },
  { x: 284, y: 240, delay: 1.15 },
  { x: 67, y: 221, delay: 1.4 },
  { x: 88, y: 103, delay: 1.65 },
];

const PATHS = [
  { d: 'M240,76 Q310,145 284,240', delay: 0.55 },
  { d: 'M284,240 Q169,300 67,221', delay: 0.8 },
  { d: 'M67,221 Q28,153 88,103', delay: 1.05 },
];

function Pin({ x, y, delay }) {
  return (
    <g className="globe-pin" style={{ animationDelay: `${delay}s` }} transform={`translate(${x}, ${y})`}>
      <path
        d="M0,-9 C5,-9 9,-5 9,0 C9,6.5 0,15 0,15 C0,15 -9,6.5 -9,0 C-9,-5 -5,-9 0,-9 Z"
        fill="#10233B"
      />
      <circle cx="0" cy="0" r="3.2" fill="#EFF3F1" />
    </g>
  );
}

function GlobeIllustration({ className = '' }) {
  return (
    <svg
      viewBox="0 0 360 360"
      className={className}
      role="img"
      aria-label="Illustration of a wireframe globe with pinned locations connected by travel routes"
    >
      <g className="globe-wireframe" stroke="#1F3F63" strokeOpacity="0.4" fill="none" strokeWidth="1.5">
        <circle cx="180" cy="180" r="120" />
        <ellipse cx="180" cy="180" rx="120" ry="18" />
        <ellipse cx="180" cy="180" rx="50" ry="120" />
        <ellipse cx="180" cy="180" rx="90" ry="120" />
        <ellipse cx="180" cy="132" rx="104" ry="14" />
        <ellipse cx="180" cy="228" rx="104" ry="14" />
      </g>

      {PATHS.map((path) => (
        <path
          key={path.d}
          d={path.d}
          className="globe-path"
          style={{ animationDelay: `${path.delay}s` }}
          fill="none"
          stroke="#B98A3D"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="5 6"
        />
      ))}

      {PINS.map((pin) => (
        <Pin key={`${pin.x}-${pin.y}`} {...pin} />
      ))}
    </svg>
  );
}

export default GlobeIllustration;
