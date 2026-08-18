const express = require("express");

const router = express.Router();

router.use("/auth", require("./auth.routes"));
router.use("/subjects", require("./subjects.routes"));
router.use("/students", require("./students.routes"));
router.use("/mentors", require("./mentors.routes"));
router.use("/matching", require("./matching.routes"));
router.use("/sessions", require("./sessions.routes"));
router.use("/gamification", require("./gamification.routes"));
router.use("/admin", require("./admin.routes"));

module.exports = router;
