// user model in mongoose to talk to mongoDB
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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
  },
  bio: {
    type: String
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null values but ensures uniqueness when present
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next(); // prevents double hashing
  
  try {
    // Hash password with salt rounds of 12
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare hashed password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to handle Google OAuth login
userSchema.statics.findOrCreateGoogleUser = async function(email, googleId, name, picture) {
  try {
    // Check if user exists with this email
    let user = await this.findOne({ email: email });
    
    if (user) {
      // User exists, update with Google ID if not already set
      if (!user.googleId) {
        user.googleId = googleId;
        if (picture) user.imageUrl = picture;
        await user.save();
      }
      return user;
    }
    
    // Create new user with Google OAuth
    user = new this({
      name: name,
      email: email,
      password: googleId, // Use Google ID as password
      googleId: googleId,
      imageUrl: picture
    });
    
    await user.save();
    return user;
  } catch (error) {
    throw error;
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User; 