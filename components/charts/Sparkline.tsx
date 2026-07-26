interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  /** Screen-reader label for the chart — defaults to the original weight
   *  wording so every pre-existing call site is unaffected. Pass an explicit
   *  label for any other series (e.g. "HRV history sparkline") so a
   *  screen-reader user isn't told "Weight history" while looking at a
   *  different metric's trend. */
  label?: string;
}

// Dependency-free SVG sparkline. Scales the series into the viewBox, draws a
// 2px accent polyline, dots the latest point, and marks the all-time max (PR)
// in the energy color.
export default function Sparkline({
  data,
  width = 100,
  height = 32,
  className,
  label = 'Weight history sparkline',
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <div
        className={`flex h-8 items-center justify-center text-caption text-text-faint ${className ?? ''}`}
      >
        No history yet
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pad = 3;

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = pad + (height - pad * 2) * (1 - (v - min) / range);
    return { x, y, v };
  });

  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  const prIndex = data.indexOf(max);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`h-8 w-full ${className ?? ''}`}
      role="img"
      aria-label={label}
    >
      <polyline
        points={polyline}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* All-time max (PR) marker */}
      <circle cx={points[prIndex].x} cy={points[prIndex].y} r={2.5} fill="var(--energy)" />
      {/* Latest point */}
      <circle cx={last.x} cy={last.y} r={2.5} fill="var(--accent)" />
    </svg>
  );
}
