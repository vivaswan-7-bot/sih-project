const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const ReactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like','love','sad','alert'], required: true },
  createdAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  eventType: { 
    type: String, 
    enum: ['flood','tsunami','cyclone','high_waves','other'], 
    required: true 
  },
  latitude: Number,
  longitude: Number,

  // ✅ Can store multiple image/video URLs
  media: [{
    url: String,                     // file URL
    type: { type: String, enum: ['image','video'] }  // helps frontend know how to render
  }],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  engagement: {
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [CommentSchema],
    reactions: [ReactionSchema],
    reposts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);
