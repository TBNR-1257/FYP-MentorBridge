// Express 4 doesn't catch rejected promises from async route handlers on its own;
// this forwards any rejection to the error-handling middleware instead of hanging/crashing.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
