const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const controller = require("../controllers/admin.controller");

const router = express.Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/mentors", asyncHandler(controller.listMentors));
router.patch("/mentors/:id/verify", asyncHandler(controller.verifyMentor));
router.patch("/mentors/:id/reject", asyncHandler(controller.rejectMentor));

module.exports = router;
