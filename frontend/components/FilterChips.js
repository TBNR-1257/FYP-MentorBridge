"use client";

export default function FilterChips({ value, onChange, options }) {
  return (
    <div className="flex rounded-lg border border-[#2c4a40] bg-[#102420] p-1 text-sm">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded px-3 py-1 ${value === opt.value ? "bg-gradient-to-r from-[#12796f] to-[#6FE9DC] text-white" : "text-[#9fb8ae] hover:bg-[#17322b]"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
