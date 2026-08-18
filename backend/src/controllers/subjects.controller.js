const { listSubjects } = require("../services/subject.service");

async function list(req, res) {
  const subjects = await listSubjects();
  res.json({ subjects });
}

module.exports = { list };
