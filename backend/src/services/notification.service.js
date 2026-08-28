const prisma = require("../config/prisma");
const { getIo } = require("../sockets/io");

async function notify(userId, type, message, link = null) {
  const notification = await prisma.notification.create({
    data: { userId, type, message, link },
  });
  getIo()?.to(`user:${userId}`).emit("notification", notification);
  return notification;
}

async function listMyNotifications(userId) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

async function markRead(userId, notificationId) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

async function markAllRead(userId) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

module.exports = { notify, listMyNotifications, markRead, markAllRead };
