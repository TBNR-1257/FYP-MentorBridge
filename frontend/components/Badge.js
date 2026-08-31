"use client";

// Renders one achievement badge: icon + name, with a hover tooltip showing the
// description (or, for a locked badge, what's needed to earn it). Pure CSS
// group-hover tooltip — no JS state needed.
export default function Badge({ badge, earned = true, size = "md" }) {
  const dimension = size === "sm" ? "h-10 w-10" : "h-14 w-14";
  const tooltipText = earned ? badge.description : `Locked — ${badge.criteria}`;

  return (
    <div className="group relative flex flex-col items-center gap-1">
      <img
        src={badge.iconUrl}
        alt={badge.name}
        className={`${dimension} ${earned ? "" : "opacity-30 grayscale"}`}
      />
      <span className={`text-center text-xs font-medium ${earned ? "text-[#e7f0ed]" : "text-[#6f8981]"}`}>
        {badge.name}
      </span>

      {!earned && badge.currentValue !== undefined && (
        <div className="flex w-full flex-col items-center gap-0.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1d3a32]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#12796f] to-[#6FE9DC]"
              style={{ width: `${Math.round((badge.progress ?? 0) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-[#6f8981]">
            {badge.currentValue}/{badge.threshold}
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-48 -translate-x-1/2 rounded-lg border border-[#2c4a40] bg-[#17322b] px-3 py-2 text-center text-xs text-[#e7f0ed] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {tooltipText}
        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#17322b]" />
      </div>
    </div>
  );
}
