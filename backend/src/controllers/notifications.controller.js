const service = require("../services/notification.service");

async function list(req, res) {
  const notifications = await service.listMyNotifications(req.user.id);
  res.json({ notifications });
}

async function markRead(req, res) {
  await service.markRead(req.user.id, req.params.id);
  res.json({ ok: true });
}

async function markAllRead(req, res) {
  await service.markAllRead(req.user.id);
  res.json({ ok: true });
}

module.exports = { list, markRead, markAllRead };
