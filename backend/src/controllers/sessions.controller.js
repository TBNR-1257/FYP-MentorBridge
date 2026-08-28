const service = require("../services/session.service");
const resourceService = require("../services/resource.service");
const {
  setNotesSchema,
  setConfidenceSchema,
  completeSessionSchema,
  setMeetingLinkSchema,
} = require("../schemas/session.schema");
const { createRatingSchema } = require("../schemas/rating.schema");
const { createResourceSchema } = require("../schemas/resource.schema");

async function list(req, res) {
  const sessions = await service.listMySessions(req.user.id, req.user.role);
  res.json({ sessions });
}

async function detail(req, res) {
  const session = await service.getSessionDetail(req.params.id, req.user.id);
  res.json({ session });
}

async function messages(req, res) {
  const messages = await service.listMessages(req.params.id, req.user.id);
  res.json({ messages });
}

async function start(req, res) {
  const session = await service.startSession(req.params.id, req.user.id);
  res.json({ session });
}

async function notes(req, res) {
  const parsed = setNotesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
  }
  const session = await service.setMentorNotes(req.params.id, req.user.id, parsed.data.mentorNotes);
  res.json({ session });
}

async function meetingLink(req, res) {
  const parsed = setMeetingLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
  }
  const session = await service.setMeetingLink(req.params.id, req.user.id, parsed.data.meetingLink);
  res.json({ session });
}

async function confidence(req, res) {
  const parsed = setConfidenceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
  }
  const session = await service.setConfidence(req.params.id, req.user.id, parsed.data);
  res.json({ session });
}

async function complete(req, res) {
  const parsed = completeSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
  }
  const session = await service.completeSession(req.params.id, req.user.id, parsed.data.outcome);
  res.json({ session });
}

async function rate(req, res) {
  const parsed = createRatingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
  }
  const rating = await service.addRating(req.params.id, req.user.id, parsed.data);
  res.status(201).json({ rating });
}

async function listResources(req, res) {
  const resources = await resourceService.listSessionResources(req.params.id, req.user.id);
  res.json({ resources });
}

async function addResource(req, res) {
  const parsed = createResourceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
  }
  const resource = await resourceService.addSessionResource(req.params.id, req.user.id, parsed.data);
  res.status(201).json({ resource });
}

module.exports = {
  list,
  detail,
  messages,
  start,
  notes,
  meetingLink,
  confidence,
  complete,
  rate,
  listResources,
  addResource,
};
