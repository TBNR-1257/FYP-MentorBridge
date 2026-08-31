"use client";

// Simple horizontal bar chart for a single magnitude series (no cross-cutting
// categories to distinguish), so one consistent hue is correct here — no
// legend needed for a single series. Each bar is directly labeled with its
// value rather than requiring a hover tooltip, since this is a small, static
// admin summary rather than an explorable dataset.
export default function BarChart({ data, maxValue }) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <span className="w-28 shrink-0 truncate text-[#9fb8ae]" title={d.label}>
            {d.label}
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#17322b]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#12796f] to-[#6FE9DC]"
              style={{ width: `${max === 0 ? 0 : (d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right font-medium text-[#cfe0da]">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
