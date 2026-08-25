const { listSubjects, listVerifiedMentorsForSubject } = require("../services/subject.service");

async function list(req, res) {
  const subjects = await listSubjects();
  res.json({ subjects });
}

async function listMentorsForSubject(req, res) {
  const mentors = await listVerifiedMentorsForSubject(req.params.id, req.query.search);
  res.json({ mentors });
}

module.exports = { list, listMentorsForSubject };
