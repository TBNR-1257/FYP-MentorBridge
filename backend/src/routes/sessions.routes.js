const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth.middleware");
const controller = require("../controllers/sessions.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", asyncHandler(controller.list));
router.get("/:id", asyncHandler(controller.detail));
router.get("/:id/messages", asyncHandler(controller.messages));
router.post("/:id/start", asyncHandler(controller.start));
router.patch("/:id/notes", asyncHandler(controller.notes));
router.patch("/:id/confidence", asyncHandler(controller.confidence));
router.post("/:id/complete", asyncHandler(controller.complete));
router.post("/:id/rating", asyncHandler(controller.rate));

module.exports = router;
