"use client";

import { useState } from "react";

// Shared "Resources" section for a session or course room: mentor-only add
// form (title + optional description + URL), list of clickable links visible
// to everyone in the room. Links only, no file upload.
export default function ResourceList({ resources, canAdd, onAdd }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onAdd({ title, description: description.trim() || undefined, url });
      setTitle("");
      setDescription("");
      setUrl("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
      <h2 className="mb-2 font-medium">Resources</h2>

      {resources.length === 0 ? (
        <p className="text-stone-500">No resources shared yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {resources.map((r) => (
            <li key={r.id} className="rounded-lg border border-stone-100 p-2">
              <a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-teal-700 hover:underline">
                {r.title}
              </a>
              {r.description && <p className="text-stone-500">{r.description}</p>}
            </li>
          ))}
        </ul>
      )}

      {canAdd && (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 border-t border-stone-100 pt-3">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
          />
          <input
            required
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="self-start rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add resource"}
          </button>
        </form>
      )}
    </section>
  );
}
