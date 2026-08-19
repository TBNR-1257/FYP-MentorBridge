"use client";

import { useEffect, useRef, useState } from "react";
import { useSubjects } from "@/lib/useSubjects";

// Single-subject picker: type to filter a dropdown of existing subjects, click
// one to select it. Typing a name with no exact match still works (creates a
// new subject on submit) via a "+ Add" option, so the taxonomy can still grow.
export default function SubjectCombobox({ value, onChange, placeholder, required, id }) {
  const subjects = useSubjects();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const query = value.trim().toLowerCase();
  const filtered = subjects.filter((s) => s.name.toLowerCase().includes(query));
  const exactMatch = subjects.some((s) => s.name.toLowerCase() === query);
  const canCreate = query.length > 0 && !exactMatch;

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
      />
      {open && (filtered.length > 0 || canCreate) && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-stone-200 bg-white text-stone-900 shadow-md">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(s.name);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-stone-100"
              >
                {s.name}
              </button>
            </li>
          ))}
          {canCreate && (
            <li>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="block w-full px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-100"
              >
                Use &quot;{value.trim()}&quot; as a new subject
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
