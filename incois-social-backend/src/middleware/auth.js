const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const raw = req.headers['authorization'];
  const token = raw && raw.startsWith('Bearer ') ? raw.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
