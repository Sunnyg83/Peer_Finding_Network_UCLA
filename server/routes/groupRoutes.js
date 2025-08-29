const express = require('express');
const router = express.Router();
const StudyGroup = require('../models/StudyGroup');
const User = require('../models/User');
const JoinRequest = require('../models/JoinRequest');

// Gemini AI setup
const { GoogleGenerativeAI } = require('@google/generative-ai'); // library to use the API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // client - access to the API
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // which model to use

console.log('Group routes loaded!');
console.log('Available routes:');
console.log('- POST /create');
console.log('- GET /user/:userId');
console.log('- POST /:id/join');
console.log('- POST /:id/kick');
console.log('- POST /:id/toggle-visibility');
console.log('- POST /:id/rename');
console.log('- POST /:id/request-join');
console.log('- POST /:id/join-request/:requestId');
console.log('- GET /:id/join-requests');
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
    const { name, creatorId, course, maxMembers, isPublic, selectedMembers } = req.body;
    
    // Validate input
    if (!name || !creatorId || !course || !maxMembers) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Create members array (creator + selected members)
    const members = [creatorId, ...(selectedMembers || [])];
    
    // Validate that member count doesn't exceed maxMembers
    if (members.length > maxMembers) {
      return res.status(400).json({ 
        message: `Cannot create group: ${members.length} members exceeds maximum of ${maxMembers}` 
      });
    }
    
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
      isPublic: isPublic !== undefined ? isPublic : true, // Default to public if not specified
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
    
    // Fetch member names for each group and clean up invalid member IDs
    const groupsWithMemberNames = await Promise.all(
      groups.map(async (group) => {
        const memberUsers = await User.find({ _id: { $in: group.members } });
        const validMemberIds = memberUsers.map(user => user._id.toString());
        
        // Check if there are any invalid member IDs and clean them up
        const invalidMemberIds = group.members.filter(memberId => 
          !validMemberIds.includes(memberId.toString())
        );
        
        if (invalidMemberIds.length > 0) {
          console.log(`🧹 Cleaning up ${invalidMemberIds.length} invalid member IDs from group ${group._id}:`, invalidMemberIds);
          group.members = group.members.filter(memberId => 
            validMemberIds.includes(memberId.toString())
          ); // takes original group and filters, is member ID in the valid list, if yes keep, if no remove
          await group.save();
        }
        
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
    
    // Fetch member names for each group and clean up invalid member IDs
    const groupsWithMemberNames = await Promise.all(
      groups.map(async (group) => {
        const memberUsers = await User.find({ _id: { $in: group.members } });
        const validMemberIds = memberUsers.map(user => user._id.toString());
        
        // Check if there are any invalid member IDs and clean them up
        const invalidMemberIds = group.members.filter(memberId => 
          !validMemberIds.includes(memberId.toString())
        );
        
        if (invalidMemberIds.length > 0) {
          console.log(`🧹 Cleaning up ${invalidMemberIds.length} invalid member IDs from group ${group._id}:`, invalidMemberIds);
          group.members = group.members.filter(memberId => 
            validMemberIds.includes(memberId.toString())
          );
          await group.save();
        }
        
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
    
    // Check if group is public or private
    if (!group.isPublic) {
      // For private groups, redirect to join request endpoint
      return res.status(403).json({ 
        message: 'This group is private. Please send a join request instead.',
        requiresJoinRequest: true,
        groupId: id
      });
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
    
    // Get user info before removing them
    const leavingUser = await User.findById(userId);
    const userName = leavingUser ? leavingUser.name : 'Unknown User';
    
    // Remove user from members
    group.members = group.members.filter(memberId => memberId !== userId);
    
    // Clean up any pending join requests from this user for this group
    try {
      await JoinRequest.deleteMany({
        groupId: id,
        userId: userId,
        status: 'pending'
      });
      console.log(`🧹 Cleaned up pending join requests for user ${userId} in group ${id}`);
    } catch (cleanupError) {
      console.error('Error cleaning up join requests:', cleanupError);
    }
    
    // If the user leaving is the creator, transfer ownership to another member
    if (group.creatorId === userId) {
      if (group.members.length > 0) {
        // Transfer to the first remaining member
        group.creatorId = group.members[0];
        await group.save();
        
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

// Get join requests for a group (for group creator)
router.get('/:id/requests', async (req, res) => {
  try {
    const { id } = req.params;
    
    const group = await StudyGroup.findById(id);
    if (!group) {
      return res.status(404).json({ message: 'Study group not found' });
    }
    
    // Get all pending join requests for this group
    const requests = await JoinRequest.find({ 
      groupId: id, 
      status: 'pending' 
    });
    
    console.log('Found join requests:', requests);
    
    res.json({ requests });
  } catch (err) {
    console.error('Error getting join requests:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Send a join request
router.post('/:id/request-join', async (req, res) => {
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
    
    // Check if there's already a pending request
    const existingRequest = await JoinRequest.findOne({
      groupId: id,
      userId: userId,
      status: 'pending'
    });
    
    if (existingRequest) {
      return res.status(400).json({ message: 'Join request already sent' });
    }
    
    // Also check if user was recently in the group and clean up any old requests (specific to each group)
    const oldRequests = await JoinRequest.find({
      groupId: id,
      userId: userId,
      status: { $in: ['accepted', 'rejected'] }
    });
    
    if (oldRequests.length > 0) {
      // Clean up old requests to prevent database clutter
      await JoinRequest.deleteMany({
        groupId: id,
        userId: userId,
        status: { $in: ['accepted', 'rejected'] }
      });
      console.log(`🧹 Cleaned up old join requests for user ${userId} in group ${id}`);
    }
    
    // Get user info for the request
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    
    // Create new join request
    const newRequest = new JoinRequest({
      groupId: id,
      userId: userId,
      userName: user.name,
      userEmail: user.email
    });
    
    await newRequest.save();
    
    res.json({ 
      message: 'Join request sent successfully',
      request: newRequest,
      userName: user.name
    });
  } catch (err) {
    console.error('Error sending join request:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

  // Accept a join request
  router.post('/:id/accept-request/:requestId', async (req, res) => {
    try {
      const { id, requestId } = req.params;

      // find group they want to join
      
      const group = await StudyGroup.findById(id);
      if (!group) {
        return res.status(404).json({ message: 'Study group not found' });

      }
      // find the join request and make sure it to the right group
      const request = await JoinRequest.findById(requestId);
      if (!request || request.groupId !== id) {
        return res.status(404).json({ message: 'Join request not found' });
      }
      // make sure the request is pending
      if (request.status !== 'pending') {
        return res.status(400).json({ message: 'Request already processed' });
      }
      // make sure group isnt full
      if (group.members.length >= group.maxMembers) {
        return res.status(400).json({ message: 'Group is full' });
      }
      
      // Add user to group, and save the group
      group.members.push(request.userId);
      await group.save();
      
      // marks as accepted after allat if statements
      await JoinRequest.findByIdAndUpdate(requestId, {
        status: 'accepted',
        respondedAt: new Date()
      });
      // system message
      res.json({ 
        message: 'Join request accepted successfully',
        group: group
      });
    } catch (err) {
      console.error('Error accepting join request:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

// Reject a join request
router.post('/:id/reject-request/:requestId', async (req, res) => {
  try {
    const { id, requestId } = req.params;
    
    const group = await StudyGroup.findById(id);
    if (!group) {
      return res.status(404).json({ message: 'Study group not found' });
    }
    
    const request = await JoinRequest.findById(requestId);
    if (!request || request.groupId !== id) {
      return res.status(404).json({ message: 'Join request not found' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }
    
    // Update request status - rejected
    await JoinRequest.findByIdAndUpdate(requestId, {
      status: 'rejected',
      respondedAt: new Date()
    });
    
    res.json({ 
      message: 'Join request rejected successfully'
    });
  } catch (err) {
    console.error('Error rejecting join request:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Check if user has a pending request for a group
router.get('/:id/request-status/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;
    
    const request = await JoinRequest.findOne({
      groupId: id,
      userId: userId,
      status: 'pending'
    });
    
    res.json({ 
      hasPendingRequest: !!request,
      request: request
    });
  } catch (err) {
    console.error('Error checking request status:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});



// AI-powered study group matching
router.post('/ai-match', async (req, res) => {
  console.log('POST /ai-match route hit!');
  console.log('Request body:', req.body);
  
  try {
    const { courseId, desiredSize, userId } = req.body;
    
    // Basic validation
    if (!courseId || !desiredSize || !userId) {
      return res.status(400).json({ 
        message: 'Missing required fields: courseId, desiredSize, userId' 
      });
    }
    
    if (desiredSize < 2 || desiredSize > 8) {
      return res.status(400).json({ 
        message: 'desiredSize must be between 2 and 8' 
      });
    }
    
    // Validate user exists and is enrolled in this course
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }
    
    // Check if user is enrolled in this course (the one they are making AI create a group for)
    if (!user.coursesSeeking || !user.coursesSeeking.includes(courseId)) {
      return res.status(403).json({ 
        message: 'User is not enrolled in this course' 
      });
    }
    
    console.log(`User ${userId} validated for course ${courseId}`);
    
    // Check if user already has an active AI group for this course (2 month expiry)
    const existingGroup = await StudyGroup.findOne({
      creatorId: userId,
      courseId: courseId,
      source: { $in: ['ai', 'ai-fallback'] } // Only check AI-created groups, not manual
    }).sort({ eligibleAfter: -1 }); // Get the most recent one
    
    if (existingGroup && existingGroup.eligibleAfter > new Date()) {
      console.log(`User ${userId} already has active AI group for ${courseId}, eligible after ${existingGroup.eligibleAfter}`);
      
      // Format the date nicely
      const eligibleDate = new Date(existingGroup.eligibleAfter);
      const formattedDate = eligibleDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      return res.json({
        message: `You already have an active AI group for ${courseId}. You can create a new AI generated group for ${courseId} on ${formattedDate}.`,
        group: existingGroup,
        reusedExisting: true,
        eligibleAfter: existingGroup.eligibleAfter,
        rationale: existingGroup.rationale || 'AI reasoning not available for existing group'
      });
    }
    
    console.log(`User ${userId} can create new AI group for ${courseId}`);
    
    // Build candidate pool - all users in the course for ai to search through
    console.log(`🔍 Building candidate pool for course ${courseId}...`);
    
    // Find all users enrolled in this course (excluding the current user)
    const candidates = await User.find({
      _id: { $ne: userId }, // Exclude current user
      coursesSeeking: { $in: [courseId] } // Must be enrolled in this course
    }).select('_id name year availability bio'); // Only select needed fields foe the AI
    
    console.log(`Found ${candidates.length} potential candidates`);
    
    // Handle empty pool case
    if (candidates.length === 0) {
      console.log(`No candidates found for course ${courseId}`);
      
      // Create group with just the requester
      const soloGroup = new StudyGroup({
        name: `AI Generated Group - ${courseId}`,
        creatorId: userId,
        courseId: courseId,
        members: [userId],
        maxMembers: 1, // Only 1 person available (themselves)
        source: 'ai',
        shortage: true,
        rationale: 'No other students enrolled in this course',
        eligibleAfter: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days from now in milliseconds
      });
      
      const savedSoloGroup = await soloGroup.save();
      console.log(`✅ Created solo group for user ${userId}`);
      
      return res.json({
        message: 'No other students enrolled in this course',
        group: savedSoloGroup,
        shortage: true,
        createdNew: true
      });
    }
    
    //  Call Gemini AI to pick best matches
    // Calculate how many to actually ask for (handle case where fewer candidates than desired)
    const actualDesiredCount = Math.min(desiredSize - 1, candidates.length);
    console.log(` Calling Gemini AI to pick best ${actualDesiredCount} matches from ${candidates.length} candidates...`);
    
    try {
      // Build Gemini prompt
      const prompt = `You are an AI study group matching system. Analyze the following students and pick the best ${actualDesiredCount} study partners for the requester.

Requester Profile:
- Name: ${user.name}
- Year: ${user.year}
- Availability: ${user.availability}
- Bio: ${user.bio || 'No bio provided'}

CANDIDATES (pick ${actualDesiredCount}):
${candidates.map((c, i) => `${i + 1}. ID: ${c._id}, Name: ${c.name}, Year: ${c.year}, Availability: ${c.availability}, Bio: ${c.bio || 'No bio'}`).join('\n')}

INSTRUCTIONS:
- Pick the best ${actualDesiredCount} candidates based on compatibility
- Consider: availability overlap, year similarity, study preferences from bio, or any other personality similarities in the bio
- Do NOT include any raw IDs in your rationale; refer to people by name only. 
- Return ONLY valid JSON in this exact format:
{
  "memberIds": ["id1", "id2", "id3"],
  "rationale": "Brief explanation of why these people were chosen"
}

IMPORTANT: Return ONLY the JSON, no other text.`;

      // Call Gemini API
      const result = await geminiModel.generateContent(prompt); // send prompt to Gemini
      const response = await result.response; // extract Gemini's response
      const aiResponse = response.text(); // actual text of Gemini's response
      
      console.log(`🤖 Gemini response: ${aiResponse}`);
      
      // Parse AI response
      let selectedMembers, rationale;
      let aiSucceeded = false;
      
      // Clean the AI response - remove markdown code blocks if present
      let cleanResponse = aiResponse.trim();
      console.log(`🔍 Original AI response: ${aiResponse}`);
      
      // Remove markdown code blocks more robustly
      if (cleanResponse.includes('```json')) {
        cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.includes('```')) {
        cleanResponse = cleanResponse.replace(/```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log(`🧹 Cleaned response: ${cleanResponse}`);
      
      try {
        const parsedResponse = JSON.parse(cleanResponse);
        selectedMembers = parsedResponse.memberIds || [];
        rationale = parsedResponse.rationale || 'AI selected based on compatibility';
        aiSucceeded = true;
        console.log(`✅ AI successfully returned ${selectedMembers.length} members`);
      } catch (parseError) {
        console.log(`⚠️ Failed to parse AI response, retrying once...`);
        console.log(`Clean response was: ${cleanResponse}`);
        
        // Retry with stricter prompt
        const retryPrompt = `Return ONLY valid JSON. No markdown formatting, no code blocks. Format:
{
  "memberIds": ["id1", "id2"],
  "rationale": "explanation"
}`;
        
        const retryResult = await geminiModel.generateContent(retryPrompt);
        const retryResponse = await retryResult.response;
        const retryText = retryResponse.text();
        
        // Clean retry response too
        let cleanRetryResponse = retryText.trim();
        console.log(`🔍 Original retry response: ${retryText}`);
        
        if (cleanRetryResponse.includes('```json')) {
          cleanRetryResponse = cleanRetryResponse.replace(/```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanRetryResponse.includes('```')) {
          cleanRetryResponse = cleanRetryResponse.replace(/```\s*/, '').replace(/\s*```$/, '');
        }
        
        console.log(`🧹 Cleaned retry response: ${cleanRetryResponse}`);
        
        try {
          const retryParsed = JSON.parse(cleanRetryResponse);
          selectedMembers = retryParsed.memberIds || [];
          rationale = retryParsed.rationale || 'AI selected (retry)';
          aiSucceeded = true;
          console.log(`AI retry successfully returned ${selectedMembers.length} members`);
        } catch (retryParseError) {
          console.log(`AI response parsing failed after retry`);
          console.log(`Clean retry response was: ${cleanRetryResponse}`);
          selectedMembers = [];
          rationale = 'AI failed to provide valid response after retry';
          aiSucceeded = false;
        }
      }
      
      // Step 7: Process AI response and create group
      console.log(`AI selected ${selectedMembers.length} members:`, selectedMembers);
      
      // Debug: Log candidate IDs for comparison
      console.log(`🔍 Candidate IDs in pool:`, candidates.map(c => c._id.toString()));
      console.log(`🔍 AI selected IDs:`, selectedMembers);
      
      // Validate selected members exist in candidate pool
      const validSelectedMembers = selectedMembers.filter(id => 
        candidates.some(c => c._id.toString() === id)
      );
      
      console.log(`✅ Validated members:`, validSelectedMembers);
      
      if (validSelectedMembers.length === 0) {
        console.log(`AI returned no valid member IDs`);
        console.log(`Validation failed - AI IDs don't match candidate pool`);
        aiSucceeded = false;
        selectedMembers = [];
        rationale = 'AI failed to return valid member IDs';
      } else {
        // Update selectedMembers to only include valid ones
        selectedMembers = validSelectedMembers;
        console.log(`✅ Successfully validated ${selectedMembers.length} members`);
      }
      
      // Only create group if AI actually succeeded
      if (aiSucceeded && selectedMembers.length > 0) {
        const newGroup = new StudyGroup({
          name: `AI Generated Group - ${courseId}`,
          creatorId: userId,
          courseId: courseId,
          members: [userId, ...selectedMembers],
          maxMembers: desiredSize,
          source: 'ai',
          shortage: selectedMembers.length < actualDesiredCount,
          rationale: rationale,
          eligibleAfter: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
        });
        
        const savedGroup = await newGroup.save();
        console.log(`✅ Created AI group with ${selectedMembers.length + 1} members`);
        
        // Build ID->Name map for ALL candidates to guarantee 100% substitution
        const idToName = Object.fromEntries(candidates.map(c => [c._id.toString(), c.name]));
        const selectedMemberNames = selectedMembers.map(id => idToName[id] || id);
        
        // Clean rationale: replace any occurrences of raw IDs with names and strip leftover ID tags
        let cleanedRationale = rationale || '';
        for (const [id, name] of Object.entries(idToName)) {
          try { cleanedRationale = cleanedRationale.split(id).join(name); } catch {}
        }
        cleanedRationale = cleanedRationale.replace(/ID:\s*[A-Za-z0-9_-]+/g, '').replace(/\s{2,}/g, ' ').trim();
        
        // Build combined member details including the requester
        const membersDetailed = [
          { id: userId, name: user.name },
          ...selectedMembers.map(id => ({ id, name: idToName[id] || id }))
        ];
        const allMemberNames = [user.name, ...selectedMemberNames];
        
        res.json({
          message: `AI study group created successfully! Members: ${allMemberNames.join(', ')}`,
          group: savedGroup,
          selectedMembers: selectedMembers,
          selectedMemberNames,
          members: membersDetailed,
          memberNames: allMemberNames,
          rationale: cleanedRationale,
          createdNew: true,
          shortage: selectedMembers.length < actualDesiredCount,
          aiSucceeded: true
        });
      } else {
        // AI failed - return error instead of creating group
        res.status(500).json({
          message: 'AI matching failed. Please try again later or create a group manually.',
          error: 'AI could not find suitable matches',
          aiFailed: true
        });
      }
      
    } catch (aiError) {
      console.error(`❌ Gemini API error:`, aiError);
      
      // AI completely failed - return error instead of creating group
      return res.status(500).json({
        message: 'AI matching failed. Please try again later or create a group manually.',
        error: 'AI service unavailable',
        aiFailed: true
      });
    }
    
  } catch (err) {
    console.error('Error in AI match:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Kick a member from the group (creator only)
router.post('/:id/kick', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, memberId } = req.body;
    
    console.log('🚪 Kick request:', { groupId: id, userId, memberId });
    
    const group = await StudyGroup.findById(id);
    if (!group) {
      console.log('❌ Group not found:', id);
      return res.status(404).json({ message: 'Study group not found' });
    }
    
    console.log('📋 Group found:', { 
      groupId: group._id, 
      creatorId: group.creatorId, 
      members: group.members,
      isCreator: group.creatorId.toString() === userId 
    });
    
    // Check if user is the creator
    if (group.creatorId.toString() !== userId) {
      console.log('❌ User is not creator');
      return res.status(403).json({ message: 'Only the creator can kick members' });
    }
    
    // Check if trying to kick the creator
    if (memberId === group.creatorId.toString()) {
      console.log('❌ Cannot kick creator');
      return res.status(400).json({ message: 'Cannot kick the group creator' });
    }
    
    // Check if member exists in group
    const memberExists = group.members.some(member => member.toString() === memberId);
    console.log('🔍 Member exists check:', { memberId, memberExists, members: group.members.map(m => m.toString()) });
    
    if (!memberExists) {
      console.log('❌ Member not found in group');
      return res.status(400).json({ message: 'Member not found in group' });
    }
    
    // Remove member from group
    const originalMemberCount = group.members.length;
    group.members = group.members.filter(member => member.toString() !== memberId);
    const newMemberCount = group.members.length;
    
    console.log('👥 Member removal:', { 
      originalCount: originalMemberCount, 
      newCount: newMemberCount, 
      removed: originalMemberCount - newMemberCount 
    });
    
    await group.save();
    
    console.log('✅ Member kicked successfully');
    res.json({ 
      message: 'Member kicked successfully', 
      group: group,
      kickedMemberId: memberId
    });
  } catch (err) {
    console.error('❌ Error kicking member:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Toggle group visibility (public/private) - creator only
router.post('/:id/toggle-visibility', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    console.log('🔄 Toggle visibility request:', { groupId: id, userId });
    
    const group = await StudyGroup.findById(id);
    if (!group) {
      console.log('❌ Group not found:', id);
      return res.status(404).json({ message: 'Study group not found' });
    }
    
    console.log('📋 Group found:', { 
      groupId: group._id, 
      creatorId: group.creatorId, 
      currentVisibility: group.isPublic,
      isCreator: group.creatorId.toString() === userId 
    });
    
    // Check if user is the creator
    if (group.creatorId.toString() !== userId) {
      console.log('❌ User is not creator');
      return res.status(403).json({ message: 'Only the creator can change group visibility' });
    }
    
    // Toggle visibility
    const oldVisibility = group.isPublic;
    group.isPublic = !group.isPublic;
    await group.save();
    
    console.log('✅ Visibility toggled:', { 
      groupId: group._id, 
      oldVisibility, 
      newVisibility: group.isPublic 
    });
    
    res.json({ 
      message: `Group is now ${group.isPublic ? 'public' : 'private'}`, 
      group: group,
      isPublic: group.isPublic
    });
  } catch (err) {
    console.error('❌ Error toggling group visibility:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Rename a study group (any member can rename)
router.post('/:id/rename', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, newName } = req.body;
    
    console.log('✏️ Rename group request:', { groupId: id, userId, newName });
    
    const group = await StudyGroup.findById(id);
    if (!group) {
      console.log('❌ Group not found:', id);
      return res.status(404).json({ message: 'Study group not found' });
    }
    
    // Check if user is a member of the group
    if (!group.members.some(member => member.toString() === userId)) {
      console.log('❌ User is not a member of the group');
      return res.status(403).json({ message: 'Only group members can rename the group' });
    }
    
    // Validate new name
    if (!newName || newName.trim().length === 0) {
      return res.status(400).json({ message: 'Group name cannot be empty' });
    }
    
    if (newName.trim().length > 50) {
      return res.status(400).json({ message: 'Group name must be 50 characters or less' });
    }
    
    const oldName = group.name;
    group.name = newName.trim();
    await group.save();
    
    console.log('✅ Group renamed successfully:', { 
      groupId: group._id, 
      oldName, 
      newName: group.name 
    });
    
    res.json({ 
      message: 'Group renamed successfully', 
      group: group,
      oldName: oldName,
      newName: group.name
    });
  } catch (err) {
    console.error('❌ Error renaming group:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a study group (creator only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    console.log('🗑️ Delete group request:', { groupId: id, userId });
    
    const group = await StudyGroup.findById(id);
    if (!group) {
      console.log('❌ Group not found:', id);
      return res.status(404).json({ message: 'Study group not found' });
    }
    
    console.log('📋 Group found:', { 
      groupId: group._id, 
      creatorId: group.creatorId, 
      memberCount: group.members.length,
      isCreator: group.creatorId.toString() === userId 
    });
    
    // Check if user is the creator
    if (group.creatorId.toString() !== userId) {
      console.log('❌ User is not creator');
      return res.status(403).json({ message: 'Only the creator can delete the group' });
    }
    
    // Clean up join requests for this group
    try {
      await JoinRequest.deleteMany({ groupId: id });
      console.log('🧹 Cleaned up join requests for group:', id);
    } catch (cleanupError) {
      console.error('Error cleaning up join requests:', cleanupError);
    }
    
    // Delete the group
    await StudyGroup.findByIdAndDelete(id);
    
    console.log('✅ Group deleted successfully:', { groupId: id });
    
    res.json({ 
      message: 'Study group deleted successfully',
      deletedGroupId: id
    });
  } catch (err) {
    console.error('❌ Error deleting group:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Request to join a private group
router.post('/:id/request-join', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, message } = req.body;
    
    const group = await StudyGroup.findById(id);
    if (!group) {
      return res.status(404).json({ message: 'Study group not found' });
    }
    
    // Check if group is private
    if (group.isPublic) {
      return res.status(400).json({ message: 'Public groups do not require join requests' });
    }
    
    // Check if user is already a member
    if (group.members.includes(userId)) {
      return res.status(400).json({ message: 'User is already a member of this group' });
    }
    
    // Check if group is full
    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({ message: 'Group is full' });
    }
    
    // Check if there's already a pending request
    const existingRequest = await JoinRequest.findOne({
      groupId: id,
      userId: userId,
      status: 'pending'
    });
    
    if (existingRequest) {
      return res.status(400).json({ message: 'Join request already pending' });
    }
    
    // Create join request
    const joinRequest = new JoinRequest({
      groupId: id,
      userId: userId,
      message: message || 'I would like to join this study group',
      status: 'pending'
    });
    
    await joinRequest.save();
    
    res.json({ 
      message: 'Join request sent successfully', 
      joinRequest: joinRequest
    });
  } catch (err) {
    console.error('Error creating join request:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Approve/Reject join request (creator only)
router.post('/:id/join-request/:requestId', async (req, res) => {
  try {
    const { id, requestId } = req.params;
    const { userId, action } = req.body; // action: 'approve' or 'reject'
    
    const group = await StudyGroup.findById(id);
    if (!group) {
      return res.status(404).json({ message: 'Study group not found' });
    }
    
    // Check if user is the creator
    if (group.creatorId.toString() !== userId) {
      return res.status(403).json({ message: 'Only the creator can approve/reject requests' });
    }
    
    const joinRequest = await JoinRequest.findById(requestId);
    if (!joinRequest) {
      return res.status(404).json({ message: 'Join request not found' });
    }
    
    if (action === 'approve') {
      // Check if group is full
      if (group.members.length >= group.maxMembers) {
        return res.status(400).json({ message: 'Group is full' });
      }
      
      // Add user to group
      group.members.push(joinRequest.userId);
      await group.save();
      
      // Update join request status
      joinRequest.status = 'accepted';
      await joinRequest.save();
      
      res.json({ 
        message: 'Join request accepted', 
        group: group,
        joinRequest: joinRequest
      });
    } else if (action === 'reject') {
      // Update join request status
      joinRequest.status = 'rejected';
      await joinRequest.save();
      
      res.json({ 
        message: 'Join request rejected', 
        joinRequest: joinRequest
      });
    } else {
      res.status(400).json({ message: 'Invalid action. Use "approve" or "reject"' });
    }
  } catch (err) {
    console.error('Error handling join request:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get join requests for a group (creator only)
router.get('/:id/join-requests', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    
    const group = await StudyGroup.findById(id);
    if (!group) {
      return res.status(404).json({ message: 'Study group not found' });
    }
    
    // Check if user is the creator
    if (group.creatorId.toString() !== userId) {
      return res.status(403).json({ message: 'Only the creator can view join requests' });
    }
    
    const joinRequests = await JoinRequest.find({ 
      groupId: id, 
      status: 'pending' 
    }).populate('userId', 'name');
    
    res.json({ joinRequests: joinRequests });
  } catch (err) {
    console.error('Error fetching join requests:', err);
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
    
    // Fetch member names for the group and clean up invalid member IDs
    const memberUsers = await User.find({ _id: { $in: group.members } });
    const validMemberIds = memberUsers.map(user => user._id.toString());
    
    // Check if there are any invalid member IDs and clean them up
    const invalidMemberIds = group.members.filter(memberId => 
      !validMemberIds.includes(memberId.toString())
    );
    
    if (invalidMemberIds.length > 0) {
      console.log(`🧹 Cleaning up ${invalidMemberIds.length} invalid member IDs from group ${group._id}:`, invalidMemberIds);
      group.members = group.members.filter(memberId => 
        validMemberIds.includes(memberId.toString())
      );
      await group.save();
    }
    
    const memberNames = memberUsers.map(user => ({
      id: user._id,
      name: user.name
    }));
    
    // Return group with populated member names
    const groupWithMemberNames = {
      ...group.toObject(),
      memberNames: memberNames
    };
    
    res.json({ group: groupWithMemberNames });
  } catch (err) {
    console.error('Error fetching group:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

