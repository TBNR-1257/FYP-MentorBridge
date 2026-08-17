const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth.middleware");
const controller = require("../controllers/mentors.controller");

const router = express.Router();

router.get("/", requireAuth, asyncHandler(controller.list));

module.exports = router;
