const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const controller = require("../controllers/students.controller");

const router = express.Router();

router.use(requireAuth, requireRole("STUDENT"));

router.post("/help-requests", asyncHandler(controller.createHelpRequest));
router.get("/help-requests", asyncHandler(controller.listMyHelpRequests));
router.get("/help-requests/:id", asyncHandler(controller.getHelpRequest));
router.post("/help-requests/:id/select-mentor", asyncHandler(controller.selectMentor));

module.exports = router;
