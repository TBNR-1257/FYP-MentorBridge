const {
  listSubjects,
  listVerifiedMentorsForSubject,
  listActiveCoursesForSubject,
  createSubjectRequest,
} = require("../services/subject.service");

async function list(req, res) {
  const subjects = await listSubjects();
  res.json({ subjects });
}

async function listMentorsForSubject(req, res) {
  const mentors = await listVerifiedMentorsForSubject(req.params.id, req.query.search);
  res.json({ mentors });
}

async function listCoursesForSubject(req, res) {
  const courses = await listActiveCoursesForSubject(req.params.id, req.query.search);
  res.json({ courses });
}

async function requestSubject(req, res) {
  const name = (req.body?.name || "").trim();
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }
  const request = await createSubjectRequest(name, req.user.id);
  res.status(201).json({ request });
}

module.exports = { list, listMentorsForSubject, listCoursesForSubject, requestSubject };
