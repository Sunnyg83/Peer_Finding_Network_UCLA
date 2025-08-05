// user model in mongoose to talk to mongoDB
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
  coursesSeeking: [{
    type: String
  }],
  availability: {
    type: String
  },
  year: {
    type: String
  },
  imageUrl: {
    type: String
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User; 