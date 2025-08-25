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
    max: 20
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
  }
});

const StudyGroup = mongoose.model('StudyGroup', studyGroupSchema);

module.exports = StudyGroup;