"use client";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function emptySlot() {
  return { dayOfWeek: 1, startTime: "14:00", endTime: "16:00" };
}

// Controlled editor for a mentor's list of weekly availability slots. Shared
// between the mentor registration form and the mentor profile-edit page.
export default function AvailabilityEditor({ value, onChange }) {
  function updateSlot(index, field, val) {
    onChange(value.map((slot, i) => (i === index ? { ...slot, [field]: val } : slot)));
  }

  function addSlot() {
    onChange([...value, emptySlot()]);
  }

  function removeSlot(index) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">Availability</legend>
      {value.map((slot, index) => (
        <div key={index} className="flex items-center gap-2">
          <select
            value={slot.dayOfWeek}
            onChange={(e) => updateSlot(index, "dayOfWeek", Number(e.target.value))}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
          >
            {DAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
          <input
            type="time"
            value={slot.startTime}
            onChange={(e) => updateSlot(index, "startTime", e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
          />
          <span className="text-stone-500">to</span>
          <input
            type="time"
            value={slot.endTime}
            onChange={(e) => updateSlot(index, "endTime", e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
          />
          {value.length > 1 && (
            <button
              type="button"
              onClick={() => removeSlot(index)}
              className="text-sm text-stone-500 hover:text-red-600"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={addSlot} className="self-start text-sm text-stone-700 underline">
        + Add another slot
      </button>
    </fieldset>
  );
}
