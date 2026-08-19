"use client";

import { useEffect, useRef, useState } from "react";
import { useSubjects } from "@/lib/useSubjects";

// Multi-subject picker for mentors: selected subjects render as removable tags,
// typing searches/filters existing subjects, and a "+ Add" option lets you
// create one that doesn't exist yet.
export default function SubjectTagSelect({ value, onChange, placeholder }) {
  const subjects = useSubjects();
  const [query, setQuery] = useState("");
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

  const selectedLower = value.map((v) => v.toLowerCase());
  const filtered = subjects.filter(
    (s) => s.name.toLowerCase().includes(query.trim().toLowerCase()) && !selectedLower.includes(s.name.toLowerCase())
  );
  const exactMatch = subjects.some((s) => s.name.toLowerCase() === query.trim().toLowerCase());
  const canCreate = query.trim().length > 0 && !exactMatch && !selectedLower.includes(query.trim().toLowerCase());

  function addSubject(name) {
    if (!selectedLower.includes(name.toLowerCase())) {
      onChange([...value, name]);
    }
    setQuery("");
    setOpen(false);
  }

  function removeSubject(name) {
    onChange(value.filter((v) => v.toLowerCase() !== name.toLowerCase()));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0) addSubject(filtered[0].name);
      else if (canCreate) addSubject(query.trim());
    } else if (e.key === "Backspace" && query === "" && value.length > 0) {
      removeSubject(value[value.length - 1]);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-stone-300 bg-white px-2 py-1.5">
        {value.map((name) => (
          <span key={name} className="flex items-center gap-1 rounded bg-stone-100 px-2 py-0.5 text-sm text-stone-900">
            {name}
            <button
              type="button"
              onClick={() => removeSubject(name)}
              className="text-stone-500 hover:text-red-600"
              aria-label={`Remove ${name}`}
            >
              &times;
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          autoComplete="off"
          className="min-w-[120px] flex-1 border-none px-1 py-0.5 text-sm outline-none"
        />
      </div>
      {open && (filtered.length > 0 || canCreate) && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-stone-200 bg-white text-stone-900 shadow-md">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => addSubject(s.name)}
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
                onClick={() => addSubject(query.trim())}
                className="block w-full px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-100"
              >
                + Add &quot;{query.trim()}&quot; as a new subject
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
