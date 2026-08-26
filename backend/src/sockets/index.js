const prisma = require("../config/prisma");
const { verifyToken } = require("../utils/jwt");

function socketRoom(sessionId) {
  return `session:${sessionId}`;
}

function courseRoom(courseId) {
  return `course:${courseId}`;
}

// A socket may only join a session it's actually a participant in (the student
// who posted the underlying help request, or the assigned mentor).
async function isParticipant(sessionId, userId) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      mentorProfile: { select: { userId: true } },
      helpRequest: { include: { studentProfile: { select: { userId: true } } } },
    },
  });
  if (!session) return false;
  return session.mentorProfile.userId === userId || session.helpRequest.studentProfile.userId === userId;
}

// A socket may only join a course's group chat if it's the owning mentor, or a
// student currently enrolled in the course.
async function isCourseMember(courseId, userId) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { mentorProfile: { select: { userId: true } }, enrollments: { include: { studentProfile: true } } },
  });
  if (!course) return false;
  if (course.mentorProfile.userId === userId) return true;
  return course.enrollments.some((e) => e.studentProfile.userId === userId);
}

function registerSocketHandlers(io) {
  io.use((socket, next) => {
    try {
      socket.data.user = verifyToken(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join_session", async ({ sessionId }, ack) => {
      if (!(await isParticipant(sessionId, socket.data.user.id))) {
        return ack?.({ error: "Not a participant in this session" });
      }
      socket.join(socketRoom(sessionId));
      ack?.({ ok: true });
    });

    socket.on("send_message", async ({ sessionId, content }, ack) => {
      if (!content?.trim()) return ack?.({ error: "Message cannot be empty" });
      if (!(await isParticipant(sessionId, socket.data.user.id))) {
        return ack?.({ error: "Not a participant in this session" });
      }

      const message = await prisma.chatMessage.create({
        data: { sessionId, senderId: socket.data.user.id, content: content.trim() },
        include: { sender: { select: { id: true, name: true } } },
      });

      io.to(socketRoom(sessionId)).emit("new_message", message);
      ack?.({ ok: true, message });
    });

    socket.on("join_course", async ({ courseId }, ack) => {
      if (!(await isCourseMember(courseId, socket.data.user.id))) {
        return ack?.({ error: "Not a member of this course" });
      }
      socket.join(courseRoom(courseId));
      ack?.({ ok: true });
    });

    socket.on("send_course_message", async ({ courseId, content }, ack) => {
      if (!content?.trim()) return ack?.({ error: "Message cannot be empty" });
      if (!(await isCourseMember(courseId, socket.data.user.id))) {
        return ack?.({ error: "Not a member of this course" });
      }

      const message = await prisma.courseChatMessage.create({
        data: { courseId, senderId: socket.data.user.id, content: content.trim() },
        include: { sender: { select: { id: true, name: true } } },
      });

      io.to(courseRoom(courseId)).emit("new_course_message", message);
      ack?.({ ok: true, message });
    });
  });
}

module.exports = { registerSocketHandlers };
