const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const controller = require("../controllers/mentors.controller");

const router = express.Router();

router.get("/", requireAuth, controller.list);

module.exports = router;
