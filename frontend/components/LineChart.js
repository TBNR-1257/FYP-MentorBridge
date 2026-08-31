"use client";

// Minimal trend chart for one or more time-bucketed series (e.g. student vs.
// mentor signups per week). Each point's value shows in a tooltip on hover
// (same group/group-hover pattern as the Badge tooltip) rather than being
// permanently labeled, so a dense multi-week, multi-series chart doesn't
// turn into a wall of overlapping numbers. The hoverable hit area is a plain
// HTML overlay positioned by percentage over the SVG (not the tiny SVG dot
// itself), so it's easy to land the pointer on.
export default function LineChart({ data, series, height = 140 }) {
  const width = 100;
  const padY = 8;
  const max = Math.max(...data.flatMap((d) => series.map((s) => d[s.key] ?? 0)), 1);

  const lines = series.map((s, seriesIndex) => {
    const points = data.map((d, i) => {
      const value = d[s.key] ?? 0;
      const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
      const y = padY + (1 - value / max) * (height - padY * 2);
      return { x, y, xPct: x, yPct: (y / height) * 100, value };
    });
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    // Alternate label placement above/below the dot per series so two
    // series's labels don't collide when their values are close together.
    return { ...s, points, path, labelAbove: seriesIndex % 2 === 0 };
  });

  const labelEvery = Math.max(1, Math.ceil(data.length / 5));

  return (
    <div>
      {series.length > 1 && (
        <div className="mb-2 flex gap-4 text-[10px] text-[#9fb8ae]">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div className="relative h-32 w-full">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
          {lines.map((line) => (
            <path
              key={line.key}
              d={line.path}
              fill="none"
              stroke={line.color}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {lines.map((line) =>
            line.points.map((p, i) => <circle key={`${line.key}-${i}`} cx={p.x} cy={p.y} r="1.4" fill={line.color} />)
          )}
        </svg>
        {lines.map((line) =>
          line.points.map((p, i) => (
            <div
              key={`${line.key}-pt-${i}`}
              className="group absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
            >
              <span
                className={`pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded border border-[#2c4a40] bg-[#17322b] px-1.5 py-0.5 text-[10px] font-medium text-[#e7f0ed] opacity-0 shadow-md transition-opacity group-hover:opacity-100 ${
                  line.labelAbove ? "bottom-full mb-1" : "top-full mt-1"
                }`}
              >
                <span style={{ color: line.color }}>{line.label}:</span> {p.value}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-[#6f8981]">
        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? <span key={i}>{d.label}</span> : <span key={i} />
        )}
      </div>
    </div>
  );
}
