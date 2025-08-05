const express = require('express');
const router = express.Router();
const User = require('../models/User');
const multer = require('multer');
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, coursesSeeking, availability, year } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Sorry, this email already exists' });
    }
    const user = new User({ name, email, password, coursesSeeking, availability, year });
    await user.save();
    res.status(201).json({ message: 'You have been registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login a user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(400).json({ message: 'Invalid email or password. Please try again.' });
    }
    res.json({ message: 'Login successful!', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Find peers based on course matches
router.post('/peers', async (req, res) => {
  try {
    const { userId, coursesSeeking } = req.body;
    
    // Find users who are seeking the same courses (excluding the current user)
    const peers = await User.find({
      _id: { $ne: userId },
      coursesSeeking: { $in: coursesSeeking }
    }).select('name email coursesSeeking availability year imageUrl'); // include imageUrl to display profile pic of other users
    
    res.json({ peers });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/upload-image', upload.single('image'), async(req,res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    
    // Return the full URL to access the image
    const imageUrl = `https://peer-finding-network-ucla.fly.dev/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

// Add GET /:id endpoint to fetch user info by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name email');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update user profile
router.put('/:id', async (req, res) => {
  console.log('PUT /api/users/:id hit!', req.params.id);
  try {
    const { coursesSeeking, availability, year, name, imageUrl } = req.body;
    const updateFields = {};
    if (coursesSeeking) updateFields.coursesSeeking = coursesSeeking;
    if (availability) updateFields.availability = availability;
    if (year) updateFields.year = year;
    if (name) updateFields.name = name;
    if (imageUrl) updateFields.imageUrl = imageUrl; 

    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { $set: updateFields },
      { new: true, select: '-password' }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 