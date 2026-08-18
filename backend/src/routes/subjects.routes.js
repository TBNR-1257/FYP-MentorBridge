const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/subjects.controller");

const router = express.Router();

// Public (no auth) — the registration form needs this before a user is logged in,
// and it's just non-sensitive reference data (subject names).
router.get("/", asyncHandler(controller.list));

module.exports = router;
