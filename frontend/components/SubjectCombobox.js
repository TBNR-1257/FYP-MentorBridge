"use client";

import { useEffect, useRef, useState } from "react";
import { useSubjects } from "@/lib/useSubjects";

// Single-subject picker: type to filter a dropdown of existing subjects, click
// one to select it. With allowCreate (default, mentor-facing use), typing a
// name with no exact match still works via a "+ Add" option. With
// allowCreate={false} (student-facing use, e.g. a help request's subject),
// that option instead submits a subject request via onRequestNew for admin
// review — the field itself stays unfilled until an existing subject is picked.
export default function SubjectCombobox({ value, onChange, placeholder, required, id, allowCreate = true, onRequestNew }) {
  const subjects = useSubjects();
  const [open, setOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestedNames, setRequestedNames] = useState([]);
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
  const alreadyRequested = requestedNames.includes(query);

  async function handleRequestNew() {
    const name = value.trim();
    if (!name || !onRequestNew) return;
    setRequesting(true);
    try {
      await onRequestNew(name);
      setRequestedNames((prev) => [...prev, name.toLowerCase()]);
    } finally {
      setRequesting(false);
    }
  }

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
          {allowCreate && canCreate && (
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
          {!allowCreate && canCreate && onRequestNew && (
            <li>
              <button
                type="button"
                onClick={handleRequestNew}
                disabled={requesting || alreadyRequested}
                className="block w-full px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50"
              >
                {alreadyRequested
                  ? `Requested "${value.trim()}" — pending admin review`
                  : requesting
                    ? "Requesting…"
                    : `Not listed? Request "${value.trim()}" be added`}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
