type SparklineProps = {
  values: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
  showDot?: boolean;
};

export function Sparkline({
  values,
  width = 64,
  height = 24,
  color = "var(--success-accent)",
  showDot = true,
}: SparklineProps) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return null;

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;

  const pad = 3; // padding for dot radius
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;

  const points = nums.map((v, i) => {
    const x = pad + (i / (nums.length - 1)) * plotW;
    const y = pad + plotH - ((v - min) / range) * plotH;
    return { x, y };
  });

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Area polygon: line points + bottom-right + bottom-left
  const areaPoints =
    linePoints +
    ` ${points[points.length - 1].x},${height} ${points[0].x},${height}`;

  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      aria-hidden="true"
    >
      <polygon points={areaPoints} fill={color} opacity={0.1} />
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDot && (
        <circle cx={last.x} cy={last.y} r={2} fill={color} />
      )}
    </svg>
  );
}
