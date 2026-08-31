"use client";

export default function FilterChips({ value, onChange, options }) {
  return (
    <div className="flex rounded-lg border border-stone-300 bg-white p-1 text-sm">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded px-3 py-1 ${value === opt.value ? "bg-teal-600 text-white" : "text-stone-600 hover:bg-stone-50"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
