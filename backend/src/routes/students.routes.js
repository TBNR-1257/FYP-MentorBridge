const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const controller = require("../controllers/students.controller");

const router = express.Router();

router.get("/", requireAuth, controller.list);

module.exports = router;
