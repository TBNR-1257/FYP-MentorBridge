const prisma = require("../config/prisma");

// Case-insensitive so "chemistry" and "Chemistry" resolve to the same row instead
// of silently fragmenting the taxonomy (which would break subject-based matching
// and admin subject-demand analytics).
async function resolveSubject(name) {
  const trimmed = name.trim();
  const existing = await prisma.subject.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return existing;
  return prisma.subject.create({ data: { name: trimmed } });
}

async function resolveSubjects(names) {
  return Promise.all(names.map(resolveSubject));
}

async function listSubjects() {
  return prisma.subject.findMany({ orderBy: { name: "asc" } });
}

module.exports = { resolveSubject, resolveSubjects, listSubjects };
