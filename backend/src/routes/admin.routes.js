const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const controller = require("../controllers/admin.controller");

const router = express.Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/mentors", asyncHandler(controller.listMentors));
router.patch("/mentors/:id/verify", asyncHandler(controller.verifyMentor));
router.patch("/mentors/:id/reject", asyncHandler(controller.rejectMentor));
router.get("/subject-requests", asyncHandler(controller.listSubjectRequests));
router.patch("/subject-requests/:id/approve", asyncHandler(controller.approveSubjectRequest));
router.patch("/subject-requests/:id/reject", asyncHandler(controller.rejectSubjectRequest));
router.get("/users", asyncHandler(controller.listUsers));
router.patch("/users/:id/suspend", asyncHandler(controller.suspendUser));
router.patch("/users/:id/reactivate", asyncHandler(controller.reactivateUser));
router.get("/analytics", asyncHandler(controller.getAnalytics));
router.get("/sessions", asyncHandler(controller.listSessions));
router.get("/courses", asyncHandler(controller.listCourses));

module.exports = router;
