const jwt = require("jsonwebtoken");

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function verifyToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  return { id: payload.sub, role: payload.role };
}

module.exports = { signToken, verifyToken };
