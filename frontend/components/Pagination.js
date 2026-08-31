"use client";

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 hover:bg-stone-50 disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-stone-500">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 hover:bg-stone-50 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
