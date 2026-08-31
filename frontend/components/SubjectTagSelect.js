"use client";

import { useEffect, useRef, useState } from "react";
import { useSubjects } from "@/lib/useSubjects";

// Multi-subject picker: selected subjects render as removable tags, typing
// searches/filters existing subjects. With allowCreate (default, mentor-facing
// use), a "+ Add" option lets you create a subject that doesn't exist yet.
// With allowCreate={false} (student-facing use), that option instead submits a
// subject request via onRequestNew for admin review — students can't silently
// grow the taxonomy the way a mentor can. An optional `max` caps selections.
export default function SubjectTagSelect({ value, onChange, placeholder, allowCreate = true, onRequestNew, max }) {
  const subjects = useSubjects();
  const [query, setQuery] = useState("");
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

  const atMax = typeof max === "number" && value.length >= max;
  const selectedLower = value.map((v) => v.toLowerCase());
  const filtered = atMax
    ? []
    : subjects.filter(
        (s) => s.name.toLowerCase().includes(query.trim().toLowerCase()) && !selectedLower.includes(s.name.toLowerCase())
      );
  const exactMatch = subjects.some((s) => s.name.toLowerCase() === query.trim().toLowerCase());
  const alreadyRequested = requestedNames.includes(query.trim().toLowerCase());
  const canCreate = !atMax && query.trim().length > 0 && !exactMatch && !selectedLower.includes(query.trim().toLowerCase());

  function addSubject(name) {
    if (atMax) return;
    if (!selectedLower.includes(name.toLowerCase())) {
      onChange([...value, name]);
    }
    setQuery("");
    setOpen(false);
  }

  function removeSubject(name) {
    onChange(value.filter((v) => v.toLowerCase() !== name.toLowerCase()));
  }

  async function handleRequestNew() {
    const name = query.trim();
    if (!name || !onRequestNew) return;
    setRequesting(true);
    try {
      await onRequestNew(name);
      setRequestedNames((prev) => [...prev, name.toLowerCase()]);
    } finally {
      setRequesting(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0) addSubject(filtered[0].name);
      else if (allowCreate && canCreate) addSubject(query.trim());
    } else if (e.key === "Backspace" && query === "" && value.length > 0) {
      removeSubject(value[value.length - 1]);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#2c4a40] bg-[#102420] px-2 py-1.5">
        {value.map((name) => (
          <span key={name} className="flex items-center gap-1 rounded bg-[#17322b] px-2 py-0.5 text-sm text-[#e7f0ed]">
            {name}
            <button
              type="button"
              onClick={() => removeSubject(name)}
              className="text-[#9fb8ae] hover:text-red-400"
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
          disabled={atMax}
          placeholder={atMax ? `Max ${max} selected` : value.length === 0 ? placeholder : ""}
          autoComplete="off"
          className="min-w-[120px] flex-1 border-none px-1 py-0.5 text-sm outline-none disabled:bg-transparent"
        />
      </div>
      {open && (filtered.length > 0 || (allowCreate && canCreate) || (!allowCreate && canCreate && onRequestNew)) && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-[#234339] bg-[#102420] text-[#e7f0ed] shadow-md">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => addSubject(s.name)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-[#1d3a32]"
              >
                {s.name}
              </button>
            </li>
          ))}
          {allowCreate && canCreate && (
            <li>
              <button
                type="button"
                onClick={() => addSubject(query.trim())}
                className="block w-full px-3 py-2 text-left text-sm text-[#9fb8ae] hover:bg-[#1d3a32]"
              >
                + Add &quot;{query.trim()}&quot; as a new subject
              </button>
            </li>
          )}
          {!allowCreate && canCreate && onRequestNew && (
            <li>
              <button
                type="button"
                onClick={handleRequestNew}
                disabled={requesting || alreadyRequested}
                className="block w-full px-3 py-2 text-left text-sm text-[#9fb8ae] hover:bg-[#1d3a32] disabled:opacity-50"
              >
                {alreadyRequested
                  ? `Requested "${query.trim()}" — pending admin review`
                  : requesting
                    ? "Requesting…"
                    : `Not listed? Request "${query.trim()}" be added`}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
