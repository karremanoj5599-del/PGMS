// Multi-tenant user extraction middleware
// Reads user_id from header or query param and attaches to req.userId

const extractUser = (req, res, next) => {
  const userId = req.headers['x-user-id'] || req.query.user_id;

  if (!userId && !req.path.startsWith('/api/auth') && !req.path.startsWith('/iclock')) {
    console.warn(`[AUTH] Missing x-user-id for ${req.path}`);
  }
  req.userId = userId ? parseInt(userId) : null;
  next();
};

module.exports = { extractUser };
