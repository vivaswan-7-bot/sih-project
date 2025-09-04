const router = require('express').Router();
const auth = require('../middleware/auth');
const allowRoles = require('../middleware/roles');
const Post = require('../models/Post');

// GET /dashboard/summary → object (official/analyst)
router.get('/summary', auth, allowRoles('official','analyst'), async (req, res) => {
  const totalPosts = await Post.countDocuments({});
  const byEvent = await Post.aggregate([
    { $group: { _id: '$eventType', count: { $sum: 1 } } }
  ]);
  const recent24h = await Post.countDocuments({
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });

  const byEventType = Object.fromEntries(byEvent.map(e => [e._id, e.count]));

  res.json({
    totals: { posts: totalPosts, recent24h },
    byEventType
  });
});

// GET /dashboard/reports → ARRAY (official/analyst)
router.get('/reports', auth, allowRoles('official','analyst'), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 200);
  const reports = await Post.find({}).sort({ createdAt: -1 }).limit(limit);
  res.json(reports);
});

module.exports = router;
