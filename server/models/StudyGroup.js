const mongoose = require('mongoose');

const studyGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  creatorId: {
    type: String,
    required: true
  },
  courses: [{
    type: String
  }],
  maxMembers: {
    type: Number,
    required: true,
    min: 2,
    max: 20 // max group size
  },
  members: [{
    type: String
  }],
  isPublic: {
    type: Boolean,
    default: true  // Default to public so existing groups work
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  courseId: {
    type: String,
  },
  expiresAt: {
    type: Date
  },
  // Next time the requester can create another AI group for this course
  eligibleAfter: {
    type: Date
  },
  source: {
    type: String, // 'ai' | 'manual' | 'ai-fallback'
    enum: ['ai', 'manual', 'ai-fallback'],
    default: 'ai'
  },
  rationale: {
    type: String
  },
  shortage: {
    type: Boolean,
    default: false
  }
});

// query indexes 

// has this user used AI for this course recently? -1 for most recent record
studyGroupSchema.index({ creatorId: 1, courseId: 1, eligibleAfter: -1 }); // within user+course ger most recent record; if eligible after is in future, block, if not allow

// Fast listings for a course by recency - see existing groups feature
studyGroupSchema.index({ courseId: 1, createdAt: -1 });

const StudyGroup = mongoose.model('StudyGroup', studyGroupSchema);

module.exports = StudyGroup;