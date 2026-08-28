const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const controller = require("../controllers/mentors.controller");

const router = express.Router();

// Public-ish (any authed role) — must come before the blanket MENTOR-only gate below.
router.get("/leaderboard", requireAuth, asyncHandler(controller.leaderboard));
router.get("/:id/public-profile", requireAuth, asyncHandler(controller.getPublicProfile));
router.post("/:id/endorsements", requireAuth, asyncHandler(controller.addEndorsement));

router.use(requireAuth, requireRole("MENTOR"));

router.get("/help-requests/queue", asyncHandler(controller.listQueue));
router.post("/help-requests/:id/accept", asyncHandler(controller.acceptHelpRequest));
router.post("/help-requests/:id/decline", asyncHandler(controller.declineHelpRequest));
router.patch("/profile", asyncHandler(controller.updateProfile));
router.get("/service-hours", asyncHandler(controller.listServiceHours));
router.get("/badges", asyncHandler(controller.listBadges));

module.exports = router;
