const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  coursesTaken: [{
    type: String
  }],
  coursesSeeking: [{
    type: String
  }],
  availability: {
    type: String
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User; 