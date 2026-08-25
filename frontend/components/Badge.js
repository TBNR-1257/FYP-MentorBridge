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
      <span className={`text-center text-xs font-medium ${earned ? "text-stone-900" : "text-stone-400"}`}>
        {badge.name}
      </span>

      {!earned && badge.currentValue !== undefined && (
        <div className="flex w-full flex-col items-center gap-0.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-teal-600"
              style={{ width: `${Math.round((badge.progress ?? 0) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-stone-400">
            {badge.currentValue}/{badge.threshold}
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-48 -translate-x-1/2 rounded-lg bg-stone-900 px-3 py-2 text-center text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {tooltipText}
        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-stone-900" />
      </div>
    </div>
  );
}
