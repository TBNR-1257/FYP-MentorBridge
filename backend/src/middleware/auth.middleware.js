const { verifyToken } = require("../utils/jwt");
const prisma = require("../config/prisma");

// Looks the user up on every request (not just at login) so a suspension takes
// effect immediately instead of only once their existing token expires — also
// keeps req.user.role fresh rather than trusting a stale JWT claim.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing authentication token" });
  }

  try {
    const { id } = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } });
    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: "This account has been suspended" });
    }
    req.user = { id: user.id, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
