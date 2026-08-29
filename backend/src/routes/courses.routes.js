const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth.middleware");
const controller = require("../controllers/courses.controller");

const router = express.Router();

router.use(requireAuth);

// Specific paths before /:id so Express doesn't swallow them as a course id.
router.get("/mine", asyncHandler(controller.listMine));
router.get("/sessions", asyncHandler(controller.listSessions));
router.get("/sessions/:id", asyncHandler(controller.sessionDetail));
router.post("/sessions/:id/start", asyncHandler(controller.startSession));
router.patch("/sessions/:id/notes", asyncHandler(controller.sessionNotes));
router.post("/sessions/:id/complete", asyncHandler(controller.completeSession));

router.post("/", asyncHandler(controller.create));
router.get("/:id", asyncHandler(controller.detail));
router.get("/:id/messages", asyncHandler(controller.messages));
router.post("/:id/join", asyncHandler(controller.join));
router.post("/:id/leave", asyncHandler(controller.leave));
router.patch("/:id/meeting-link", asyncHandler(controller.meetingLink));
router.get("/:id/resources", asyncHandler(controller.listResources));
router.post("/:id/resources", asyncHandler(controller.addResource));
router.post("/:id/end", asyncHandler(controller.end));
router.post("/:id/clone", asyncHandler(controller.clone));
router.post("/:id/rating", asyncHandler(controller.rate));

module.exports = router;
