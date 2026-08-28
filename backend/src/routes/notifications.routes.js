const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth.middleware");
const controller = require("../controllers/notifications.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", asyncHandler(controller.list));
router.patch("/:id/read", asyncHandler(controller.markRead));
router.patch("/read-all", asyncHandler(controller.markAllRead));

module.exports = router;
