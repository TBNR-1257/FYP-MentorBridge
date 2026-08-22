const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export function listSubjects() {
  return apiFetch("/subjects");
}

export function updateMentorProfile(token, payload) {
  return apiFetch("/mentors/profile", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function login(email, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(payload) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchMe(token) {
  return apiFetch("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function listMentors(token, status) {
  const query = status ? `?status=${status}` : "";
  return apiFetch(`/admin/mentors${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function verifyMentor(token, mentorProfileId) {
  return apiFetch(`/admin/mentors/${mentorProfileId}/verify`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function rejectMentor(token, mentorProfileId) {
  return apiFetch(`/admin/mentors/${mentorProfileId}/reject`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createHelpRequest(token, payload) {
  return apiFetch("/students/help-requests", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function listMyHelpRequests(token) {
  return apiFetch("/students/help-requests", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getHelpRequest(token, id) {
  return apiFetch(`/students/help-requests/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function requestMentor(token, id, mentorProfileId) {
  return apiFetch(`/students/help-requests/${id}/request-mentor`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mentorProfileId }),
  });
}

export function cancelRequest(token, id) {
  return apiFetch(`/students/help-requests/${id}/cancel-request`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function listMentorQueue(token) {
  return apiFetch("/mentors/help-requests/queue", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function acceptHelpRequest(token, id) {
  return apiFetch(`/mentors/help-requests/${id}/accept`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function declineHelpRequest(token, id) {
  return apiFetch(`/mentors/help-requests/${id}/decline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function listMySessions(token) {
  return apiFetch("/sessions", { headers: { Authorization: `Bearer ${token}` } });
}

export function getSession(token, id) {
  return apiFetch(`/sessions/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}

export function listSessionMessages(token, id) {
  return apiFetch(`/sessions/${id}/messages`, { headers: { Authorization: `Bearer ${token}` } });
}

export function startSession(token, id) {
  return apiFetch(`/sessions/${id}/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function setSessionNotes(token, id, mentorNotes) {
  return apiFetch(`/sessions/${id}/notes`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mentorNotes }),
  });
}

export function setSessionConfidence(token, id, payload) {
  return apiFetch(`/sessions/${id}/confidence`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function completeSession(token, id, outcome) {
  return apiFetch(`/sessions/${id}/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ outcome }),
  });
}

export function rateSession(token, id, payload) {
  return apiFetch(`/sessions/${id}/rating`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function getServiceHours(token) {
  return apiFetch("/mentors/service-hours", { headers: { Authorization: `Bearer ${token}` } });
}

export function getMentorBadges(token) {
  return apiFetch("/mentors/badges", { headers: { Authorization: `Bearer ${token}` } });
}

export function getProgress(token) {
  return apiFetch("/students/progress", { headers: { Authorization: `Bearer ${token}` } });
}
