const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// GET /users/me → returns { data: { _id, email, role, name } }
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ data: { _id: user._id, email: user.email, role: user.role, name: user.name } });
});

module.exports = router;
