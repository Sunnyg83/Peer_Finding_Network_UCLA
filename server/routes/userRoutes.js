const express = require('express');
const router = express.Router();
const User = require('../models/User');
const multer = require('multer');
const AWS = require('aws-sdk');



// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-2'
});

const s3 = new AWS.S3();

// Multer setup for file uploads (memory storage for S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, coursesSeeking, availability, year, bio } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Sorry, this email already exists' });
    }
    const user = new User({ name, email, password, coursesSeeking, availability, year, bio });
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
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password. Please try again.' });
    }
    
    // Compare password using bcrypt
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
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
    }).select('name email coursesSeeking availability year imageUrl bio');

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
    
    // AWS S3 - Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    
    // Upload to S3
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read'
    };
    
    const result = await s3.upload(uploadParams).promise();
    
    // Return the S3 URL
    res.json({ imageUrl: result.Location });
  } catch (error) {
    console.error('S3 upload error:', error);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// Add GET /:id endpoint to fetch user info by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name email bio imageUrl');
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
    const { coursesSeeking, availability, year, name, imageUrl, bio } = req.body;
    const updateFields = {};
    if (coursesSeeking) updateFields.coursesSeeking = coursesSeeking;
    if (availability) updateFields.availability = availability;
    if (year) updateFields.year = year;
    if (name) updateFields.name = name;
    if (imageUrl) updateFields.imageUrl = imageUrl; 
    if (bio !== undefined) updateFields.bio = bio; 

    console.log('Updating fields:', updateFields);
    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { $set: updateFields },
      { new: true, select: '-password' }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('Updated user:', user);
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 