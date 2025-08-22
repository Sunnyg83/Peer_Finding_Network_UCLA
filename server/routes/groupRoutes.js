const express = require('express');
const router = express.Router();
const StudyGroup = require('../models/StudyGroup');
const User = require('../models/User');

console.log('Group routes loaded!');
console.log('Available routes:');
console.log('- POST /create');
console.log('- GET /user/:userId');
console.log('- POST /:id/join');
console.log('- GET /:id');
console.log('- GET /test');

// Test endpoint to verify route is working
router.get('/test', (req, res) => {
  res.json({ message: 'Groups route is working!' });
});

// Create a new study group
router.post('/create', async (req, res) => {
  console.log('POST /create route hit!');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  
  try {
    const { name, creatorId, course, maxMembers, selectedMembers } = req.body;
    
    // Validate input
    if (!name || !creatorId || !course || !maxMembers) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Create members array (creator + selected members)
    const members = [creatorId, ...(selectedMembers || [])];
    
    // Fetch user details for all members
    const memberUsers = await User.find({ _id: { $in: members } });
    const memberNames = memberUsers.map(user => ({
      id: user._id,
      name: user.name
    }));
    
    // Create the study group
    const newGroup = new StudyGroup({
      name,
      creatorId,
      courses: [course], // Store as array with one course
      maxMembers,
      members
    });
    
    const savedGroup = await newGroup.save();
    
    res.status(201).json({ 
      message: 'Study group created successfully', 
      group: savedGroup,
      memberNames: memberNames
    });
  } catch (err) {
    console.error('Error creating study group:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all groups for a specific course
router.get('/course/:course', async (req, res) => {
  try {
    const { course } = req.params;
    const decodedCourse = decodeURIComponent(course);
    
    console.log('Searching for groups with course:', decodedCourse);
    
    const groups = await StudyGroup.find({
      courses: { $regex: decodedCourse, $options: 'i' } // Case-insensitive search
    }).sort({ createdAt: -1 });
    
    // Fetch member names for each group
    const groupsWithMemberNames = await Promise.all(
      groups.map(async (group) => {
        const memberUsers = await User.find({ _id: { $in: group.members } });
        const memberNames = memberUsers.map(user => ({
          id: user._id,
          name: user.name
        }));
        
        return {
          ...group.toObject(),
          memberNames: memberNames
        };
      })
    );
    
    res.json({ groups: groupsWithMemberNames });
  } catch (err) {
    console.error('Error fetching course groups:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all groups for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const groups = await StudyGroup.find({
      members: userId
    }).sort({ createdAt: -1 });
    
    // Fetch member names for each group
    const groupsWithMemberNames = await Promise.all(
      groups.map(async (group) => {
        const memberUsers = await User.find({ _id: { $in: group.members } });
        const memberNames = memberUsers.map(user => ({
          id: user._id,
          name: user.name
        }));
        
        return {
          ...group.toObject(),
          memberNames: memberNames
        };
      })
    );
    
    res.json({ groups: groupsWithMemberNames });
  } catch (err) {
    console.error('Error fetching user groups:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Join a study group
router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    const group = await StudyGroup.findById(id);
    
    if (!group) {
      return res.status(404).json({ message: 'Study group not found' });
    }
    
    if (group.members.includes(userId)) {
      return res.status(400).json({ message: 'User already in group' });
    }
    
    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({ message: 'Group is full' });
    }
    
    // Get user info before adding them (for system message)
    const joiningUser = await User.findById(userId);
    const userName = joiningUser ? joiningUser.name : 'Unknown User';
    
    group.members.push(userId);
    const updatedGroup = await group.save();
    
    // Send system message about member joining
    try {
      const { sendGroupSystemMessage } = require('../firebaseAdmin');
      const conversationId = await getGroupConversationId(id);
      if (conversationId) {
        await sendGroupSystemMessage(conversationId, `${userName} joined the group`, 'join');
      }
    } catch (firebaseError) {
      console.log('Firebase system message failed (will log instead):', firebaseError.message);
    }
    
    res.json({ 
      message: 'Joined study group successfully', 
      group: updatedGroup 
    });
  } catch (err) {
    console.error('Error joining group:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Leave a study group
router.post('/:id/leave', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    const group = await StudyGroup.findById(id);
    
    if (!group) {
      return res.status(404).json({ message: 'Study group not found' });
    }
    
    if (!group.members.includes(userId)) {
      return res.status(400).json({ message: 'User is not in this group' });
    }
    
    // Get user info before removing them (for system message)
    const leavingUser = await User.findById(userId);
    const userName = leavingUser ? leavingUser.name : 'Unknown User';
    
    // Remove user from members
    group.members = group.members.filter(memberId => memberId !== userId);
    
    // If the user leaving is the creator, transfer ownership to another member
    if (group.creatorId === userId) {
      if (group.members.length > 0) {
        // Transfer to the first remaining member
        group.creatorId = group.members[0];
        await group.save();
        
        // Send system message about ownership transfer
        try {
          const { sendGroupSystemMessage } = require('../firebaseAdmin');
          const conversationId = await getGroupConversationId(id);
          if (conversationId) {
            await sendGroupSystemMessage(conversationId, `${userName} left the group. Ownership transferred to another member.`, 'ownership_transfer');
          }
        } catch (firebaseError) {
          console.log('Firebase system message failed (will log instead):', firebaseError.message);
        }
        
        res.json({ 
          message: `Left group successfully. Ownership transferred to another member.`, 
          group: group 
        });
      } else {
        // No members left, delete the group
        await StudyGroup.findByIdAndDelete(id);
        res.json({ 
          message: 'Left group successfully. Group deleted as no members remain.', 
          group: null 
        });
      }
    } else {
      // Regular member leaving
      await group.save();
      
      // Send system message about member leaving
      try {
        const { sendGroupSystemMessage } = require('../firebaseAdmin');
        const conversationId = await getGroupConversationId(id);
        if (conversationId) {
          await sendGroupSystemMessage(conversationId, `${userName} left the group`, 'leave');
        }
      } catch (firebaseError) {
        console.log('Firebase system message failed (will log instead):', firebaseError.message);
      }
      
      res.json({ 
        message: 'Left group successfully', 
        group: group 
      });
    }
  } catch (err) {
    console.error('Error leaving group:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get specific group details (MUST BE LAST - catches all other GET requests)
router.get('/:id', async (req, res) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Study group not found' });
    }
    
    res.json({ group });
  } catch (err) {
    console.error('Error fetching group:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

