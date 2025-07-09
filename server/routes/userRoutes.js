const express = require('express');
const router = express.Router();
const User = require('../models/User');

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
    }).select('name email coursesSeeking availability year');
    
    res.json({ peers });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 