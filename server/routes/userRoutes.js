const express = require('express');
const router = express.Router();
const User = require('../models/User');
const multer = require('multer');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');



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
    
    // allow test user1 and user2
    if (email === 'test1@ucla.edu' || email === 'test2@ucla.edu') {
      console.log('🧪 Test user login:', email);
      return res.json({ message: 'Login successful!', user });
    }
    
    // Compare password using bcrypt for regular users
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid email or password. Please try again.' });
    }
    
    res.json({ message: 'Login successful!', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Google OAuth signin endpoint
router.post('/signin', async (req, res) => {
  try {
    const { email, googleId, name, picture } = req.body;
    
    console.log('🔵 Google signin request:', { email, googleId, name });
    
    // Validate email domain
    if (!email.endsWith('@g.ucla.edu') && !email.endsWith('@ucla.edu')) {
      return res.status(400).json({ message: 'Only UCLA students are allowed. Please use your @g.ucla.edu or @ucla.edu email.' });
    }
    
    // Find or create user
    const user = await User.findOrCreateGoogleUser(email, googleId, name, picture);
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    console.log('✅ Google signin successful for:', user.email);
    
    res.json({ 
      message: 'Login successful!', 
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        coursesSeeking: user.coursesSeeking,
        availability: user.availability,
        year: user.year,
        imageUrl: user.imageUrl,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error('Google signin error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Find peers based on course matches with priority scoring
router.post('/peers', async (req, res) => {
  try {
    const { userId, coursesSeeking } = req.body;
    
    console.log('🔍 Peer search request:', { userId, coursesSeeking });
    console.log('🔍 coursesSeeking type:', typeof coursesSeeking, 'isArray:', Array.isArray(coursesSeeking));
    
    // Find users who are seeking the same courses (excluding the current user)
    const allPeers = await User.find({
      _id: { $ne: userId },
      coursesSeeking: { $in: coursesSeeking }
    }).select('name email coursesSeeking availability year imageUrl bio');

    console.log('📊 Found peers before scoring:', allPeers.length);
    
    // Log the first peer to see data structure
    if (allPeers.length > 0) {
      const firstPeer = allPeers[0];
      console.log('🔍 First peer data structure:', {
        name: firstPeer.name,
        coursesSeeking: firstPeer.coursesSeeking,
        coursesSeekingType: typeof firstPeer.coursesSeeking,
        isArray: Array.isArray(firstPeer.coursesSeeking),
        hasToObject: typeof firstPeer.toObject === 'function'
      });
    }

    // Helper: parse "Department 31A" -> { dept: 'DEPARTMENT', number: '31A' }
    const parseCourse = (raw) => {
      if (!raw || typeof raw !== 'string') return { dept: '', number: '' };
      const trimmed = raw.trim().replace(/\s+/g, ' ');
      const parts = trimmed.split(' ');
      if (parts.length < 2) return { dept: parts[0]?.toUpperCase() || '', number: '' };
      const number = parts.pop().toUpperCase();
      const dept = parts.join(' ').toUpperCase();
      return { dept, number };
    };

    // Build normalized sets for quick checks
    const normalizedSearch = (Array.isArray(coursesSeeking) ? coursesSeeking : []).map(parseCourse);
    const searchKeySet = new Set(
      normalizedSearch
        .filter(sc => sc.dept && sc.number)
        .map(sc => `${sc.dept} ${sc.number}`)
    );

    // Calculate match score for each peer and sort by priority (exact dept+number matches only)
    const peersWithScores = allPeers.map(peer => {
      const peerCourses = Array.isArray(peer.coursesSeeking) ? peer.coursesSeeking : [];
      const normalizedPeer = peerCourses.map(parseCourse);

      // Build a unique set of peer course keys
      const peerKeySet = new Set(
        normalizedPeer
          .filter(pc => pc.dept && pc.number)
          .map(pc => `${pc.dept} ${pc.number}`)
      );

      // Intersection of user's unique exact courses and peer's unique exact courses
      const exactMatches = Array.from(peerKeySet).filter(key => searchKeySet.has(key));

      // Score is count of unique exact matches; cannot exceed user's unique course count by construction
      const matchScore = exactMatches.length;

      // Convert to plain object
      const peerData = peer.toObject ? peer.toObject() : peer;

      const peerWithScore = {
        ...peerData,
        matchScore,
        matchingCourses: exactMatches.map(course => ({ course, isMatch: true, type: 'exact' })),
        totalCourses: peerCourses.length
      };

      console.log(`👤 ${peer.name}: ${matchScore} exact matches, ${peerCourses.length} total courses`);
      return peerWithScore;
    });

    // Sort peers by match score (highest first), then by total courses (highest first)
    const sortedPeers = peersWithScores.sort((a, b) => {
      // First sort by match score (descending)
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore; // sort by descending order
      }
      // If match scores are equal, sort by total courses (descending)
      return b.totalCourses - a.totalCourses;
    });

    console.log('🏆 Sorted peers by priority:');
    sortedPeers.forEach((peer, index) => {
      console.log(`${index + 1}. ${peer.name} - ${peer.matchScore} matches, ${peer.totalCourses} total courses`);
    });

    res.json({ 
      peers: sortedPeers,
      searchCourses: coursesSeeking,
      totalPeersFound: sortedPeers.length
    });
  } catch (err) {
    console.error('❌ Error in peer search:', err);
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