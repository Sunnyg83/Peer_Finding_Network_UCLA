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

    // Calculate match score for each peer and sort by priority
    const peersWithScores = allPeers.map(peer => {
      // Ensure coursesSeeking is an array
      const peerCourses = Array.isArray(peer.coursesSeeking) ? peer.coursesSeeking : [];
      const searchCourses = Array.isArray(coursesSeeking) ? coursesSeeking : [];
      
      // Count how many courses match between the searching user and this peer - find matches
      const matchingCourses = peerCourses.filter(course => 
        searchCourses.includes(course)
      );
      
      // Calculate match score (more matches = higher score)
      const matchScore = matchingCourses.length;
      
      // Find the specific matching courses for display
      const matchDetails = matchingCourses.map(course => ({
        course: course,
        isMatch: true
      }));
      
      // Convert to plain object 
      const peerData = peer.toObject ? peer.toObject() : peer;
      
      const peerWithScore = {
        ...peerData,
        matchScore: matchScore,
        matchingCourses: matchDetails,
        totalCourses: peerCourses.length
      }; // scoring data - match score + course details

  
      
      console.log(`👤 ${peer.name}: ${matchScore} matches, ${peerCourses.length} total courses`);
      console.log(`   Peer courses: [${peerCourses.join(', ')}]`);
      console.log(`   Search courses: [${searchCourses.join(', ')}]`);
      console.log(`   Matching courses: [${matchingCourses.join(', ')}]`);
      
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