const router = require('express').Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const { ALLOWED_EVENTS, validateNewPost } = require('../utils/validators');
const multer = require('multer');
const path = require('path');

// --- Multer setup ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // all files go into /uploads folder
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/jpg','video/mp4','video/mpeg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only images and videos are allowed'));
  }
});

// --- Create post ---
router.post('/', auth, upload.array('media', 5), async (req, res) => {
  try {
    const errors = validateNewPost(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    const { title, description, eventType, latitude, longitude } = req.body;

    // Build media array from uploaded files
    const media = (req.files || []).map(file => ({
      url: `/uploads/${file.filename}`,   // ✅ relative path only
      type: file.mimetype.startsWith('image') ? 'image' : 'video'
    }));

    const post = await Post.create({
      title,
      description,
      eventType,
      latitude,
      longitude,
      media,
      createdBy: req.user.id,
      engagement: { likes: [], comments: [], reactions: [], reposts: [] }
    });

    // ✅ return full post so frontend can display immediately
    return res.json(post);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// --- Feed ---
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.eventType) {
    if (!ALLOWED_EVENTS.includes(req.query.eventType)) return res.json([]);
    filter.eventType = req.query.eventType;
  }
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const posts = await Post.find(filter).sort({ createdAt: -1 }).limit(limit);
  return res.json(posts);
});

// --- Single post ---
router.get('/:id', async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  return res.json(post);
});

// --- Like ---
router.post('/:id/like', auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });

  const uid = req.user.id;
  if (!post.engagement.likes.find(id => String(id) === String(uid))) {
    post.engagement.likes.push(uid);
    await post.save();
  }
  return res.json({ data: { status: 'liked' } });
});

// --- Comment ---
router.post('/:id/comment', auth, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });

  post.engagement.comments.push({ userId: req.user.id, text });
  await post.save();
  const commentId = post.engagement.comments[post.engagement.comments.length - 1]._id;
  return res.json({ data: { commentId } });
});

// --- React ---
router.post('/:id/react', auth, async (req, res) => {
  const { reaction } = req.body;
  const allowed = ['like','love','sad','alert'];
  if (!allowed.includes(reaction)) return res.status(400).json({ error: `reaction must be one of: ${allowed.join(', ')}` });

  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });

  post.engagement.reactions.push({ userId: req.user.id, type: reaction });
  await post.save();
  return res.json({ data: { status: 'reacted' } });
});

// --- Repost ---
router.post('/:id/repost', auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });

  const uid = req.user.id;
  if (!post.engagement.reposts.find(id => String(id) === String(uid))) {
    post.engagement.reposts.push(uid);
    await post.save();
  }
  return res.json({ data: { status: 'reposted' } });
});

module.exports = router;
