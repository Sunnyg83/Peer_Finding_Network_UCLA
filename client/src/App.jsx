import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'
import { API_URL } from './config'
import { 
  getOrCreateConversation, 
  sendMessage, 
  listenForMessages, 
  getUserConversations, 
  getUnreadCountForUser, 
  markConversationAsRead,
  getOrCreateGroupConversation,
  getGroupConversationId,
  getUserGroupConversations
} from './firebaseChatModel';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { departments, getDepartmentName, getDepartmentCode } from './departments';

// Particle Background Component
const ParticleBackground = () => {
  useEffect(() => {
    const createParticles = () => {
      const particleContainer = document.querySelector('#particles-js');
      if (!particleContainer) return;
      
      // Clear existing particles
      particleContainer.innerHTML = '';
      
      // Create particles
      for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 3 + 4) + 's';
        particleContainer.appendChild(particle);
      }

      // Create floating Bruins
      for (let i = 0; i < 16; i++) {
        const bruin = document.createElement('div');
        bruin.className = 'floating-bruin';
        bruin.textContent = '🐻';
        bruin.style.left = Math.random() * 100 + '%';
        bruin.style.top = Math.random() * 100 + '%';
        bruin.style.animationDelay = Math.random() * 4 + 's';
        bruin.style.animationDuration = (Math.random() * 10 + 15) + 's';
        bruin.style.fontSize = (Math.random() * 30 + 40) + 'px';
        bruin.style.opacity = '0.2';
        particleContainer.appendChild(bruin);
      }

      // Create floating UCLA banners
      for (let i = 0; i < 8; i++) {
        const banner = document.createElement('div');
        banner.className = 'floating-banner';
        banner.innerHTML = '<img src="/UCLA_Bruins_logo.svg.png" alt="UCLA Bruins" />';
        banner.style.left = Math.random() * 100 + '%';
        banner.style.top = Math.random() * 100 + '%';
        banner.style.animationDelay = Math.random() * 4 + 's';
        banner.style.animationDuration = (Math.random() * 10 + 15) + 's';
        banner.style.opacity = '0.15'; // start subtle so it blends immediately
        banner.style.zIndex = '10';
        particleContainer.appendChild(banner);
      }

      // Create connection lines
      for (let i = 0; i < 15; i++) {
        const line = document.createElement('div');
        line.className = 'connection-line';
        line.style.left = Math.random() * 100 + '%';
        line.style.top = Math.random() * 100 + '%';
        line.style.width = (Math.random() * 100 + 50) + 'px';
        line.style.animationDelay = Math.random() * 3 + 's';
        line.style.animationDuration = (Math.random() * 5 + 8) + 's';
        particleContainer.appendChild(line);
      }
    };

    createParticles();
    
    // Recreate particles on window resize
    const handleResize = () => createParticles();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <div id="particles-js" />
      <div className="animated-gradient-bg" />
      <div className="geometric-overlay" />
    </>
  );
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState('login')
  // track current theme
  const [theme, setTheme] = useState('dark')
  // Landing page state
  const [showLanding, setShowLanding] = useState(true)
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null); // display chat window for selected conv
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [userGroups, setUserGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showGroupChatModal, setShowGroupChatModal] = useState(false);
  const [currentGroupChat, setCurrentGroupChat] = useState(null);
  const [showBrowseGroupsModal, setShowBrowseGroupsModal] = useState(false);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [loadingAvailableGroups, setLoadingAvailableGroups] = useState(false);
  
  // Group chat state
  const [groupChatMessages, setGroupChatMessages] = useState([]);
  const [groupConversationId, setGroupConversationId] = useState(null);
  const [groupMessageInput, setGroupMessageInput] = useState('');
  const [groupChatLoading, setGroupChatLoading] = useState(false);

  const [chatPeer, setChatPeer] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0);
  const [groupUnreadCount, setGroupUnreadCount] = useState(0);

  // Load default from storage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      getUserConversations(currentUser._id).then(setConversations);
    }
  }, [isLoggedIn, currentUser, showMessagesModal]); // update convs when logged in, current user, or modal is closed

  // Set up real-time listener for group chat messages
  useEffect(() => {
    if (groupConversationId && showGroupChatModal) {
      const unsubscribe = listenForMessages(groupConversationId, (messages) => {
        setGroupChatMessages(messages);
        
        // Update unread count when new messages arrive
        if (currentUser && messages.length > 0) {
          getGroupChatUnreadCount(currentUser._id).then(setGroupUnreadCount);
        }
      });
      
      return () => unsubscribe();
    }
  }, [groupConversationId, showGroupChatModal, currentUser]);

  // Get unread count for individual chats only (excluding group chats)
  const getIndividualChatUnreadCount = async (userId) => {
    try {
      const allConversations = await getUserConversations(userId);
      let totalUnread = 0;
      
      // Only count individual chats (where isGroup is not true)
      allConversations.forEach(conv => {
        if (!conv.isGroup) {
          const unreadCount = conv.unreadCount?.[userId] || 0;
          totalUnread += unreadCount;
        }
      });
      
      return totalUnread;
    } catch (error) {
      console.error('Error getting individual chat unread count:', error);
      return 0;
    }
  };

  // Get unread count for group chats
  const getGroupChatUnreadCount = async (userId) => {
    try {
      const groupConversations = await getUserGroupConversations(userId);
      let totalUnread = 0;
      
      groupConversations.forEach(conv => {
        const unreadCount = conv.unreadCount?.[userId] || 0;
        totalUnread += unreadCount;
      });
      
      return totalUnread;
    } catch (error) {
      console.error('Error getting group chat unread count:', error);
      return 0;
    }
  };

  // Mark group chat messages as read
  const markGroupChatAsRead = async (conversationId, userId) => {
    try {
      // Reset unread count for this user in the conversation
      const convRef = doc(db, 'conversations', conversationId);
      await updateDoc(convRef, {
        [`unreadCount.${userId}`]: 0
      });
      
      // Update local unread count
      setGroupUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking group chat as read:', error);
    }
  };

  // Update unread counts when conversations change
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      // Get individual chat unread count
      getIndividualChatUnreadCount(currentUser._id).then(setUnreadCount);
      
      // Get group chat unread count
      getGroupChatUnreadCount(currentUser._id).then(setGroupUnreadCount);
    }
  }, [isLoggedIn, currentUser, conversations, showMessagesModal, showGroupsModal]);

  // Open group chat
  const openGroupChat = async (group) => {
    try {
      setGroupChatLoading(true);
      
      console.log('Opening group chat for group:', group); // Debug log
      
      // Ensure we have member names
      let membersWithNames = group.members || [];
      let memberNames = group.memberNames || [];
      
      // If we don't have memberNames, try to construct them
      if (!memberNames.length && membersWithNames.length) {
        memberNames = membersWithNames.map(memberId => ({
          id: memberId,
          name: memberId // Fallback to ID if no name
        }));
      }
      
      // Set the current group chat with proper member data
      setCurrentGroupChat({
        id: `group_${group._id}`,
        type: 'group',
        name: group.name,
        members: memberNames, // Use memberNames instead of member IDs
        memberNames: memberNames, // Keep this for consistency
        groupId: group._id
      });
      
      // Get or create Firebase conversation for this group
      let conversationId = await getGroupConversationId(group._id);
      
      if (!conversationId) {
        // Create new conversation if it doesn't exist
        conversationId = await getOrCreateGroupConversation(
          group._id,
          group.name,
          membersWithNames
        );
      }
      
      setGroupConversationId(conversationId);
      
      // Mark messages as read when opening group chat
      if (currentUser) {
        await markGroupChatAsRead(conversationId, currentUser._id);
      }
      
      // Close the groups modal and open the group chat modal
      setShowGroupsModal(false);
      setShowGroupChatModal(true);
      
    } catch (error) {
      console.error('Error opening group chat:', error);
      alert('Failed to open group chat');
    } finally {
      setGroupChatLoading(false);
    }
  };

  // Send group message
  const sendGroupMessage = async () => {
    if (!groupMessageInput.trim() || !groupConversationId || !currentUser) return;
    
    try {
      await sendMessage(groupConversationId, currentUser._id, groupMessageInput.trim());
      setGroupMessageInput(''); // Clear input after sending
    } catch (error) {
      console.error('Error sending group message:', error);
      alert('Failed to send message');
    }
  };

  // Send join request for private groups
  const sendJoinRequest = async (groupId) => {
    try {
      const response = await fetch(`${API_URL}/api/groups/${groupId}/request-join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Join request sent to creator`);
        
        // Refresh available groups to update button state
        await fetchAvailableGroups();
      } else {
        const errorData = await response.json();
        alert(`Failed to send request: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error sending join request:', error);
      alert('Failed to send join request');
    }
  };

  // Close group chat modal and clean up
  const closeGroupChatModal = () => {
    setShowGroupChatModal(false);
    setCurrentGroupChat(null);
    setGroupConversationId(null);
    setGroupChatMessages([]);
    setGroupMessageInput('');
    
    // Reset group unread count when modal is closed
    if (currentUser) {
      getGroupChatUnreadCount(currentUser._id).then(setGroupUnreadCount);
    }
  };

  // Join a study group
  const joinGroup = async (groupId) => {
    try {
      const response = await fetch(`${API_URL}/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id })
      });

      if (response.ok) {
        // Refresh available groups and user groups
        await fetchAvailableGroups();
        await fetchUserGroups();
        
        // Firebase conversation will be automatically updated by the backend
        // System message "X joined the group" will be sent automatically
        console.log('Group joined successfully - backend will handle Firebase updates');
        
        alert('Successfully joined the group!');
      } else {
        const errorData = await response.json();
        alert(`Failed to join group: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error joining group:', error);
      alert('Failed to join group');
    }
  };

  // Leave a study group
  const leaveGroup = async (groupId) => {
    try {
      const response = await fetch(`${API_URL}/api/groups/${groupId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id })
      });

      if (response.ok) {
        // Refresh user groups
        await fetchUserGroups();
        
        console.log('Group left successfully');
        
        alert('Successfully left the group!');
      } else {
        const errorData = await response.json();
        alert(`Failed to leave group: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      alert('Failed to leave group');
    }
  };



  // Fetch available groups for user's courses
  const fetchAvailableGroups = async () => {
    if (!currentUser || !currentUser.coursesSeeking) {
      console.log('No currentUser or coursesSeeking');
      return;
    }
    
    console.log('Fetching groups for courses:', currentUser.coursesSeeking);
    setLoadingAvailableGroups(true);
    try {
      // Get groups for each course the user is seeking
      const allGroups = [];
      
      for (const course of currentUser.coursesSeeking) {
        console.log('Fetching groups for course:', course);
        const response = await fetch(`${API_URL}/api/groups/course/${encodeURIComponent(course)}`);
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Groups found for', course, ':', data.groups.length);
          
          // Filter out groups the user is already in
          const availableForCourse = data.groups.filter(group => 
            !group.members.includes(currentUser._id)
          );
          console.log('Available groups for', course, ':', availableForCourse.length);
          allGroups.push(...availableForCourse);
        } else {
          console.log('Failed to fetch groups for course:', course);
        }
      }
      
      console.log('Total available groups:', allGroups.length);
      setAvailableGroups(allGroups);
    } catch (error) {
      console.error('Error fetching available groups:', error);
    } finally {
      setLoadingAvailableGroups(false);
    }
  };

  // Fetch user's study groups
  const fetchUserGroups = async () => {
    if (!currentUser) return;
    
    setLoadingGroups(true);
    try {
      const response = await fetch(`${API_URL}/api/groups/user/${currentUser._id}`);
      if (response.ok) {
        const data = await response.json();
        setUserGroups(data.groups);
      }
    } catch (error) {
      console.error('Error fetching user groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  // red dot state
  // Fetch unread count on login, refresh, and modal is closed
  useEffect(() => {
    async function fetchUnread() {
      if (isLoggedIn && currentUser) {
        const count = await getUnreadCountForUser(currentUser._id);
        setUnreadCount(count);
      }
    }
    fetchUnread();
  }, [isLoggedIn, currentUser, showMessagesModal, chatPeer]);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }



  // Landing page component
  const LandingPage = () => {
    const scrollToFeatures = () => {
      document.getElementById('features-section').scrollIntoView({ 
        behavior: 'smooth' 
      });
    };

    return (
              <motion.div 
          className="landing-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Start/Hero Section */}
          <motion.section 
            className="hero-section"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
                      <div className="hero-content">
              <motion.h1 
                className="hero-title"
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
              Study Bruins - UCLA's Study Network
            </motion.h1>
              <motion.h2 
                className="hero-subtitle"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
              Connect with UCLA Students in Your Classes
            </motion.h2>
              <motion.p 
                className="hero-description"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
              Struggling to find study partners? Need help understanding course material? 
              Study Bruins connects you with fellow UCLA students taking the same classes. 
              Find study groups, get homework help, and make friends who share your academic journey.
            </motion.p>
              <motion.div 
                className="cta-buttons"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.0 }}
              >
                <motion.button 
                  className="cta-primary" 
                  onClick={() => setShowLanding(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                Get Started Now
              </motion.button>
                <motion.button 
                  className="cta-secondary" 
                  onClick={scrollToFeatures}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                Learn More
              </motion.button>
            </motion.div>
          </div>
        </motion.section>

        {/* Features Section */}
        <motion.section 
          id="features-section" 
          className="features-section"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <motion.div 
            className="features-grid"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            {[
              {
                icon: "🎓",
                title: "Find Study Partners",
                description: "Connect with students in your exact classes. Find study groups, homework partners, and classmates who can help you succeed."
              },
              {
                icon: "💬",
                title: "Real-Time Collaboration",
                description: "Chat instantly with your study partners and create study groups. Share notes, ask questions, and collaborate on assignments in real-time. Build study groups with your preferred size and manage them easily."
              },
              {
                icon: "🤝",
                title: "Build Your Network",
                description: "More than just study partners - make lasting friendships with students who share your academic interests and goals. Join public or private study groups, and connect with peers who understand your academic journey."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="feature-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ 
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
              >
                <motion.div 
                  className="feature-icon"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  {feature.icon}
                </motion.div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* Stats Section */}
        <motion.section 
          className="stats-section"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <motion.div 
            className="stats-grid"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <motion.div 
              className="stat-item"
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.1 }}
            >
              <motion.div 
                className="stat-number"
                initial={{ y: -20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                viewport={{ once: true }}
              >
                24/7
              </motion.div>
              <motion.div 
                className="stat-label"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                viewport={{ once: true }}
              >
                Available
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* Footer */}
        <motion.footer 
          className="footer"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <p>© 2025 Peer Network. Connecting UCLA students, one class at a time.</p>
        </motion.footer>
      </motion.div>
    );
  };

  // Only show landing if not logged in and showLanding is true
  if (!isLoggedIn && showLanding) {
    const isLight = theme === 'light';
    return (
      <>
        {/* Particle Background for Landing Page */}
        <ParticleBackground />
        
        <motion.button 
          className="theme-toggle" 
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          style={{ 
            position: 'fixed', 
            top: 24, 
            right: 24, 
            zIndex: 1000,
            background: isLight ? 'rgba(23, 64, 139, 0.85)' : 'rgba(255, 255, 255, 0.1)',
            border: isLight ? '1px solid #17408B' : '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            color: isLight ? '#fff' : undefined,
            backdropFilter: 'blur(10px)'
          }}
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={theme}
              initial={{ opacity: 0, rotate: -180 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <LandingPage />
      </>
    );
  }

  return (
    <motion.div 
      className="centered-viewport"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Particle Background */}
      <ParticleBackground />

       {/* Toggle button logic */}
      <motion.button 
        className="theme-toggle" 
        onClick={toggleTheme}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </motion.button>
      {/* Messages icon (top right) */}
      {isLoggedIn && (
        <button
          className="messages-icon"
          onClick={() => setShowMessagesModal(true)}
          title="Messages"
        >
          <span role="img" aria-label="messages">💬</span>
          {unreadCount > 0 && (
            <span 
              style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                width: '12px',
                height: '12px',
                backgroundColor: '#ff4444',
                borderRadius: '50%',
                border: '2px solid var(--bg-primary)',
                boxShadow: '0 0 5px #ff4444'
              }}
            />
          )}
        </button>
      )}
      
      {/* My Groups icon (top right, next to messages) */}
      {isLoggedIn && (
        <button
          className="groups-icon"
          onClick={() => {
            setShowGroupsModal(true);
            fetchUserGroups(); // Fetch groups when modal opens
            // Also refresh conversations to get latest unread counts
            if (currentUser) {
              getUserConversations(currentUser._id).then(setConversations);
            }
          }}
          title="My Study Groups"
          style={{ position: 'relative' }}
        >
          <span role="img" aria-label="study groups">👥</span>
          {groupUnreadCount > 0 && (
            <span 
              style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                width: '12px',
                height: '12px',
                backgroundColor: '#ff4444',
                borderRadius: '50%',
                border: '2px solid var(--bg-primary)',
                boxShadow: '0 0 5px #ff4444'
              }}
            />
          )}
        </button>
      )}
      <div className="centered-content">
        <div className="centered-header">
          <h1>UCLA Study Network</h1>
                          <p>Your study partner is just a click away.<br />Connect, collaborate, succeed.</p>
        </div>
        {!isLoggedIn ? (
          <div className="auth-container">
            <div className="auth-tabs">
              <button 
                className={`tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => setActiveTab('login')}
              >
                Login
              </button>
              <button 
                className={`tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => setActiveTab('register')}
              >
                Register
              </button>
            </div>
            {activeTab === 'login' ? (
              <LoginForm setIsLoggedIn={setIsLoggedIn} setCurrentUser={setCurrentUser} />
            ) : (
              <RegisterForm setIsLoggedIn={setIsLoggedIn} setCurrentUser={setCurrentUser} setActiveTab={setActiveTab} />
            )}
          </div>
        ) : (
          <Dashboard
            currentUser={currentUser}
            setIsLoggedIn={setIsLoggedIn}
            setCurrentUser={setCurrentUser}
            setChatPeer={setChatPeer} // Pass setter to Dashboard
            showBrowseGroupsModal={showBrowseGroupsModal}
            setShowBrowseGroupsModal={setShowBrowseGroupsModal}
            availableGroups={availableGroups}
            setAvailableGroups={setAvailableGroups}
            loadingAvailableGroups={loadingAvailableGroups}
            setLoadingAvailableGroups={setLoadingAvailableGroups}
            fetchAvailableGroups={fetchAvailableGroups}
            joinGroup={joinGroup}
            leaveGroup={leaveGroup}

          />
        )}
        {/* Chat popup modal (Chat + Messages react state vars) */}
        {chatPeer && (
          <ChatPopup
            peer={chatPeer}
            currentUser={currentUser}
            onClose={async () => {
              setChatPeer(null);
              // Re-fetch unread count after closing chat
              if (currentUser) {
                const count = await getIndividualChatUnreadCount(currentUser._id);
                setUnreadCount(count);
              }
            }}
          />
        )}
        {showMessagesModal && (
          <MessagesModal
            conversations={conversations}
            currentUser={currentUser}
            selectedConversation={selectedConversation}
            // disappearing red dot if user reads messages
            onClose={async () => {
              setShowMessagesModal(false);
              // Re-fetch unread counts after closing modal
              if (currentUser) {
                const individualCount = await getIndividualChatUnreadCount(currentUser._id);
                const groupCount = await getGroupChatUnreadCount(currentUser._id);
                setUnreadCount(individualCount);
                setGroupUnreadCount(groupCount);
              }
            }}
            onSelectConversation={(conv, peer) => {
              if (conv.type === 'group') {
                // For group chats, open group chat modal
                setCurrentGroupChat(conv);
                setShowGroupChatModal(true);
              setShowMessagesModal(false);
                setShowGroupsModal(false);
              } else {
                // For individual chats, open regular chat
                setShowMessagesModal(false);
                setShowGroupsModal(false);
              setChatPeer(peer);
              }
            }}
          />
        )}
        
        {/* Group Chat Modal */}
        {showGroupChatModal && currentGroupChat && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'rgba(23, 23, 38, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '2px solid var(--neon-blue)',
              borderRadius: '20px',
              padding: '2rem',
              width: '90%',
              maxWidth: '800px',
              height: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 0 20px var(--neon-blue), 0 0 40px var(--neon-blue)',
              position: 'relative'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--neon-blue)',
                paddingBottom: '1rem'
              }}>
                <div>
                  <h2 style={{
                    color: 'var(--neon-blue)',
                    margin: '0',
                    fontSize: '1.5rem',
                    textShadow: '0 0 10px var(--neon-blue)'
                  }}>
                    🏠 {currentGroupChat.name}
                  </h2>
                  <p style={{
                    color: '#e8e8e8',
                    margin: '0.5rem 0 0 0',
                    fontSize: '0.9rem'
                  }}>
                    Members: {currentGroupChat.members.map(m => m.name || m).join(', ')}
                  </p>
                </div>
                <button 
                  onClick={closeGroupChatModal}
                  style={{
                    background: 'transparent',
                    border: '2px solid var(--neon-blue)',
                    color: 'var(--neon-blue)',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 0 10px var(--neon-blue)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--neon-blue)';
                    e.target.style.color = 'var(--bg-primary)';
                    e.target.style.boxShadow = '0 0 15px var(--neon-blue), 0 0 25px var(--neon-blue)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.color = 'var(--neon-blue)';
                    e.target.style.boxShadow = '0 0 10px var(--neon-blue)';
                  }}
                >
                  &times;
                </button>
              </div>

              {/* Chat Messages Area */}
              <div style={{
                flex: 1,
                background: 'rgba(23, 23, 38, 0.6)',
                border: '1px solid var(--neon-blue)',
                borderRadius: '15px',
                padding: '1rem',
                marginBottom: '1rem',
                overflowY: 'auto',
                minHeight: '300px'
              }}>
               
                {groupChatLoading ? (
                  <div style={{
                    color: 'var(--neon-blue)',
                    textAlign: 'center',
                    fontSize: '1.1rem',
                    marginTop: '2rem'
                  }}>
                    🔄 Loading group chat...
                  </div>
                ) : groupChatMessages.length === 0 ? (
                  <div style={{
                    color: '#888',
                    textAlign: 'center',
                    fontSize: '1.1rem',
                    marginTop: '2rem'
                  }}>
                    💬 No messages yet!<br/>
                    <span style={{ fontSize: '0.9rem' }}>
                      Start the conversation by sending a message.
                    </span>
                  </div>
                ) : (
                  <div>
                    {groupChatMessages.map((message) => (
                      <div key={message.id} style={{
                        marginBottom: '1rem',
                        padding: '0.8rem',
                        borderRadius: '10px',
                        background: message.senderId === 'system' 
                          ? 'rgba(255, 193, 7, 0.1)' 
                          : message.senderId === currentUser?._id 
                            ? 'rgba(0, 123, 255, 0.2)' 
                            : 'rgba(108, 117, 125, 0.2)',
                        border: message.senderId === 'system' 
                          ? '1px solid rgba(255, 193, 7, 0.5)' 
                          : '1px solid rgba(108, 117, 125, 0.3)',
                        maxWidth: message.senderId === currentUser?._id ? '80%' : '80%',
                        marginLeft: message.senderId === currentUser?._id ? 'auto' : '0',
                        marginRight: message.senderId === currentUser?._id ? '0' : 'auto'
                      }}>
                        {message.senderId === 'system' ? (
                          <div style={{
                            color: '#ffc107',
                            fontSize: '0.9rem',
                            fontStyle: 'italic',
                            textAlign: 'center'
                          }}>
                            {message.text}
                          </div>
                        ) : (
                          <>
                            <div style={{
                              color: message.senderId === currentUser?._id 
                                ? 'var(--neon-blue)' 
                                : '#e8e8e8',
                              fontSize: '0.8rem',
                              marginBottom: '0.3rem',
                              fontWeight: 'bold'
                            }}>
                              {message.senderId === currentUser?._id ? 'You' : 
                                (() => {
                                  // Debug logging
                                  console.log('Finding name for senderId:', message.senderId);
                                  console.log('Current group chat:', currentGroupChat);
                                  console.log('Member names:', currentGroupChat.memberNames);
                                  console.log('Members:', currentGroupChat.members);
                                  
                                  // Try to find the user name from memberNames array
                                  const member = currentGroupChat.memberNames?.find(m => m.id === message.senderId) ||
                                               currentGroupChat.memberNames?.find(m => m._id === message.senderId) ||
                                               currentGroupChat.members?.find(m => m._id === message.senderId) ||
                                               currentGroupChat.members?.find(m => m.id === message.senderId);
                                  
                                  console.log('Found member:', member);
                                  
                                  if (member) {
                                    return member.name || member;
                                  }
                                  
                                  // If still not found, try to get from currentUser if it's the same user
                                  if (message.senderId === currentUser?._id) {
                                    return 'You';
                                  }
                                  
                                  // Last resort - show first few characters of ID
                                  return message.senderId ? `User ${message.senderId.substring(0, 8)}...` : 'Unknown User';
                                })()
                              }
                            </div>
                            <div style={{
                              color: '#e8e8e8',
                              fontSize: '1rem',
                              wordBreak: 'break-word'
                            }}>
                              {message.text}
                            </div>
                            <div style={{
                              color: '#888',
                              fontSize: '0.7rem',
                              marginTop: '0.3rem',
                              textAlign: 'right'
                            }}>
                              {message.createdAt ? new Date(message.createdAt).toLocaleTimeString() : ''}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center'
              }}>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={groupMessageInput} // group chat input
                  onChange={(e) => setGroupMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendGroupMessage()}
                  style={{
                    flex: 1,
                    background: 'rgba(23, 23, 38, 0.8)',
                    border: '1px solid var(--neon-blue)',
                    borderRadius: '10px',
                    padding: '0.8rem',
                    color: '#e8e8e8',
                    fontSize: '1rem'
                  }}
                />
                <button
                  onClick={sendGroupMessage}
                  disabled={!groupMessageInput.trim()} // send button code
                  style={{
                    background: groupMessageInput.trim() ? 'var(--neon-blue)' : 'rgba(108, 117, 125, 0.5)',
                    color: groupMessageInput.trim() ? 'var(--bg-card)' : '#888',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.8rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: groupMessageInput.trim() ? 'pointer' : 'not-allowed', // pointer/no pointer logic if messgae exists
                    transition: 'all 0.3s ease' // cool animation lol
                  }}
                  onMouseEnter={(e) => {
                    if (groupMessageInput.trim()) {
                      e.target.style.background = 'var(--neon-blue)';
                      e.target.style.boxShadow = '0 0 15px var(--neon-blue)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (groupMessageInput.trim()) {
                      e.target.style.background = 'var(--neon-blue)';
                      e.target.style.boxShadow = 'none';
                    }
                  }} // glow over send button if message exists 
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Browse Available Groups Modal */}
        {console.log('showBrowseGroupsModal:', showBrowseGroupsModal)}
        {showBrowseGroupsModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'rgba(23, 23, 38, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '2px solid var(--neon-blue)',
              borderRadius: '20px',
              padding: '2rem',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 0 20px var(--neon-blue), 0 0 40px var(--neon-blue)',
              position: 'relative'
            }}>
              <button 
                onClick={() => setShowBrowseGroupsModal(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'transparent',
                  border: '2px solid var(--neon-blue)',
                  color: 'var(--neon-blue)',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0 10px var(--neon-blue)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--neon-blue)';
                  e.target.style.color = 'var(--bg-primary)';
                  e.target.style.boxShadow = '0 0 15px var(--neon-blue), 0 0 25px var(--neon-blue)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = 'var(--neon-blue)';
                  e.target.style.boxShadow = '0 0 10px var(--neon-blue)';
                }}
              >
                &times;
              </button>

              <h2 style={{
                color: 'var(--neon-blue)',
                textAlign: 'center',
                marginBottom: '1.5rem',
                fontSize: '1.8rem',
                textShadow: '0 0 10px var(--neon-blue)'
              }}>
                Available Study Groups
              </h2>

              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <button
                  onClick={fetchAvailableGroups}
                  style={{
                    background: 'var(--neon-blue)',
                    color: 'var(--bg-card)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.8rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 0 5px var(--neon-blue)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#0056b3';
                    e.target.style.boxShadow = '0 0 8px var(--neon-blue)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'var(--neon-blue)';
                    e.target.style.boxShadow = '0 0 5px var(--neon-blue)';
                  }}
                >
                  🔄 Refresh Groups
                </button>
              </div>

              {loadingAvailableGroups ? (
                <div style={{
                  color: '#888',
                  textAlign: 'center',
                  fontSize: '1.05rem',
                  margin: '1.5rem 0'
                }}>
                  Loading available groups...
                </div>
              ) : availableGroups.length === 0 ? (
                <div style={{
                  color: '#888',
                  textAlign: 'center',
                  fontSize: '1.05rem',
                  margin: '1.5rem 0'
                }}>
                  No available groups found for your courses.<br/>
                  <span style={{ fontSize: '0.9rem' }}>
                    Try creating your own study group!
                  </span>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  {availableGroups.map((group, index) => (
                    <div key={index} style={{
                      background: 'rgba(23, 23, 38, 0.6)',
                      border: '1px solid var(--neon-blue)',
                      borderRadius: '15px',
                      padding: '1.5rem',
                      boxShadow: '0 0 8px var(--neon-blue)',
                      transition: 'all 0.3s ease'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '1rem'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                            <h3 style={{
                              color: 'var(--neon-blue)',
                              margin: '0',
                              fontSize: '1.3rem',
                              textShadow: '0 0 5px var(--neon-blue)'
                            }}>
                              {group.name}
                            </h3>
                            <span style={{
                              background: group.isPublic ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 107, 107, 0.2)',
                              color: group.isPublic ? '#4caf50' : '#ff6b6b',
                              padding: '0.3rem 0.6rem',
                              borderRadius: '12px',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              border: `1px solid ${group.isPublic ? '#4caf50' : '#ff6b6b'}`,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              {group.isPublic ? '🌐 Public' : '🔒 Private'}
                            </span>
                          </div>
                          
                          {/* New Messages Indicator - Only show if user is a member */}
                          {(() => {
                            // Only check for unread messages if user is actually IN this group
                            if (group.members.includes(currentUser._id)) {
                              const groupConversation = conversations.find(conv => 
                                conv.groupId === group._id && conv.isGroup
                              );
                              const unreadCount = groupConversation?.unreadCount?.[currentUser._id] || 0;
                              
                              if (unreadCount > 0) {
                                return (
                                  <div className="group-unread-indicator">
                                    <span className="group-unread-badge">
                                      New messages
                                    </span>
                                  </div>
                                );
                              }
                            }
                            return null;
                          })()}
                          
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            marginBottom: '1rem'
                          }}>
                            <p style={{
                              color: '#e8e8e8',
                              margin: '0',
                              fontSize: '0.9rem'
                            }}>
                              <strong>Course:</strong> {group.courses.join(', ')}
                            </p>
                            <p style={{
                              color: '#e8e8e8',
                              margin: '0',
                              fontSize: '0.9rem'
                            }}>
                              <strong>Members:</strong> {group.members.length}/{group.maxMembers}
                            </p>
                            <p style={{
                              color: '#e8e8e8',
                              margin: '0',
                              fontSize: '0.9rem'
                            }}>
                              <strong>Created:</strong> {new Date(group.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          {group.memberNames && (
                            <div style={{
                              background: 'rgba(23, 23, 38, 0.8)',
                              border: '1px solid var(--neon-blue)',
                              borderRadius: '10px',
                              padding: '1rem'
                            }}>
                              <h4 style={{
                                color: 'var(--neon-blue)',
                                margin: '0 0 0.5rem 0',
                                fontSize: '1rem'
                              }}>
                                Current Members:
                              </h4>
                              <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.5rem'
                              }}>
                                {group.memberNames.map((member, memberIndex) => (
                                  <span key={memberIndex} style={{
                                    background: 'rgba(39, 116, 174, 0.3)',
                                    color: '#e8e8e8',
                                    padding: '0.3rem 0.6rem',
                                    borderRadius: '15px',
                                    fontSize: '0.8rem',
                                    border: '1px solid var(--neon-blue)'
                                  }}>
                                    {member.id === group.creatorId ? '👑 ' : ''}{member.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => group.isPublic ? joinGroup(group._id) : sendJoinRequest(group._id)}
                          style={{
                            background: group.isPublic ? 'var(--neon-blue)' : '#ff6b6b',
                            color: 'var(--bg-card)',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '0.8rem 1.5rem',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: group.isPublic ? '0 0 5px var(--neon-blue)' : '0 0 5px #ff6b6b',
                            whiteSpace: 'nowrap',
                            marginLeft: '1rem'
                          }}
                          onMouseEnter={(e) => {
                            if (group.isPublic) {
                              e.target.style.background = '#0056b3';
                              e.target.style.boxShadow = '0 0 8px var(--neon-blue)';
                            } else {
                              e.target.style.boxShadow = '0 0 8px #ff6b6b';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (group.isPublic) {
                              e.target.style.background = group.isPublic ? 'var(--neon-blue)' : '#ff6b6b';
                              e.target.style.boxShadow = group.isPublic ? '0 0 5px var(--neon-blue)' : '0 0 5px #ff6b6b';
                            }
                          }}
                        >
                          {group.isPublic ? '➕ Join Group' : '🔒 Request Join'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Groups Modal */}
        {showGroupsModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'rgba(23, 23, 38, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '2px solid var(--neon-blue)',
              borderRadius: '20px',
              padding: '2rem',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 0 20px var(--neon-blue), 0 0 40px var(--neon-blue)',
              position: 'relative'
            }}>
              <button 
                onClick={() => setShowGroupsModal(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'transparent',
                  border: '2px solid var(--neon-blue)',
                  color: 'var(--neon-blue)',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0 10px var(--neon-blue)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--neon-blue)';
                  e.target.style.color = 'var(--bg-primary)';
                  e.target.style.boxShadow = '0 0 15px var(--neon-blue), 0 0 25px var(--neon-blue)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = 'var(--neon-blue)';
                  e.target.style.boxShadow = '0 0 10px var(--neon-blue)';
                }}
              >
                &times;
              </button>

              <h2 style={{
                color: 'var(--neon-blue)',
                textAlign: 'center',
                marginBottom: '1.5rem',
                fontSize: '1.8rem',
                textShadow: '0 0 10px var(--neon-blue)'
              }}>
                My Study Groups
              </h2>

              {loadingGroups ? (
                <div style={{
                  color: '#888',
                  textAlign: 'center',
                  fontSize: '1.05rem',
                  margin: '1.5rem 0'
                }}>
                  Loading your groups...
                </div>
              ) : userGroups.length === 0 ? (
                <div style={{
                  color: '#888',
                  textAlign: 'center',
                  fontSize: '1.05rem',
                  margin: '1.5rem 0'
                }}>
                  You haven't joined any study groups yet.
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  {userGroups.map((group, index) => (
                    <div key={index} style={{
                      background: 'rgba(23, 23, 38, 0.6)',
                      border: '1px solid var(--neon-blue)',
                      borderRadius: '15px',
                      padding: '1.5rem',
                      boxShadow: '0 0 8px var(--neon-blue)',
                      transition: 'all 0.3s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                        <h3 style={{
                          color: 'var(--neon-blue)',
                          margin: '0',
                          fontSize: '1.3rem',
                          textShadow: '0 0 5px var(--neon-blue)'
                        }}>
                          {group.name}
                        </h3>
                        <span style={{
                          background: group.isPublic ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 107, 107, 0.2)',
                          color: group.isPublic ? '#4caf50' : '#ff6b6b',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          border: `1px solid ${group.isPublic ? '#4caf50' : '#ff6b6b'}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          {group.isPublic ? '🌐 Public' : '🔒 Private'}
                        </span>
                      </div>
                      
                      {/* New Messages Indicator - Only show if user is a member */}
                      {(() => {
                        // Only check for unread messages if user is actually IN this group
                        if (group.members.includes(currentUser._id)) {
                          const groupConversation = conversations.find(conv => 
                            conv.groupId === group._id && conv.isGroup
                          );
                          const unreadCount = groupConversation?.unreadCount?.[currentUser._id] || 0;
                          
                          if (unreadCount > 0) {
                            return (
                              <div className="group-unread-indicator">
                                <span className="group-unread-badge">
                                  New messages
                                </span>
                              </div>
                            );
                          }
                        }
                        return null;
                      })()}

                      {/* Join Requests Section - Only show for group creator */}
                      {group.creatorId === currentUser._id && (
                        <div style={{
                          background: 'rgba(255, 193, 7, 0.1)',
                          border: '1px solid #ffc107',
                          borderRadius: '10px',
                          padding: '1rem',
                          marginBottom: '1rem'
                        }}>
                          <h4 style={{
                            color: '#ffc107',
                            margin: '0 0 0.5rem 0',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            🔔 Join Requests
                          </h4>
                          <JoinRequestsSection groupId={group._id} currentUser={currentUser} />
                        </div>
                      )}
                      
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        marginBottom: '1rem'
                      }}>
                        <p style={{
                          color: '#e8e8e8',
                          margin: '0',
                          fontSize: '0.9rem'
                        }}>
                          <strong>Course:</strong> {group.courses.join(', ')}
                        </p>
                        <p style={{
                          color: '#e8e8e8',
                          margin: '0',
                          fontSize: '0.9rem'
                        }}>
                          <strong>Members:</strong> {group.members.length}/{group.maxMembers}
                        </p>
                        <p style={{
                          color: '#e8e8e8',
                          margin: '0',
                          fontSize: '0.9rem'
                        }}>
                          <strong>Created:</strong> {new Date(group.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div style={{
                        background: 'rgba(23, 23, 38, 0.8)',
                        border: '1px solid var(--neon-blue)',
                        borderRadius: '10px',
                        padding: '1rem'
                      }}>
                        <h4 style={{
                          color: 'var(--neon-blue)',
                          margin: '0 0 0.5rem 0',
                          fontSize: '1rem'
                        }}>
                          Group Members:
                        </h4>
                        
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          marginBottom: '1rem'
                        }}>
                          <button
                            onClick={() => openGroupChat(group)}
                            style={{
                              background: 'var(--neon-blue)',
                              color: 'var(--bg-card)',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '0.5rem 1rem',
                              fontSize: '0.9rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 0 5px var(--neon-blue)',
                              flex: 1
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#0056b3';
                              e.target.style.boxShadow = '0 0 8px var(--neon-blue)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'var(--neon-blue)';
                              e.target.style.boxShadow = '0 0 5px var(--neon-blue)';
                            }}
                          >
                            💬 Group Chat
                          </button>
                          
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to leave "${group.name}"?`)) {
                                leaveGroup(group._id);
                              }
                            }}
                            style={{
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '0.5rem 1rem',
                              fontSize: '0.9rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 0 5px #dc3545'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#c82333';
                              e.target.style.boxShadow = '0 0 8px #dc3545';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#dc3545';
                              e.target.style.boxShadow = '0 0 5px #dc3545';
                            }}
                          >
                            🚪 Leave Group
                          </button>
                        </div>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.5rem'
                        }}>
                          {group.memberNames ? (
                            group.memberNames.map((member, memberIndex) => (
                              <span key={memberIndex} style={{
                                background: 'rgba(39, 116, 174, 0.3)',
                                color: '#e8e8e8',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '15px',
                                fontSize: '0.8rem',
                                border: '1px solid var(--neon-blue)'
                              }}>
                                {member.id === group.creatorId ? '👑 ' : ''}{member.name}
                              </span>
                            ))
                          ) : (
                            <div style={{
                              color: '#888',
                              fontSize: '0.9rem',
                              textAlign: 'center',
                              padding: '1rem'
                            }}>
                              Loading member names... {/*if names are not available yet, do this*/}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        


      </div>
    </motion.div>
  )
}

function LoginForm({ setIsLoggedIn, setCurrentUser }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          email: formData.email.toLowerCase()
        }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setIsLoggedIn(true)
        setCurrentUser(data.user)
      } else {
        alert(data.message)
      }
    } catch (error) {
      alert('Login failed. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Login</h2>
      <div className="form-group">
        <label>Email:</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
        />
      </div>
      <div className="form-group">
        <label>Password:</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          required
        />
      </div>
      <button type="submit" className="btn-primary">Login</button>
    </form>
  )
}

function RegisterForm({ setIsLoggedIn, setCurrentUser, setActiveTab }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    courses: [{ department: '', courseNumber: '' }],
    availability: '',
    year: ''
  })

  // functions for managing courses
  const addCourse = () => {
    if (formData.courses.length < 4) {
      setFormData({
        ...formData,
        courses: [...formData.courses, { department: '', courseNumber: '' }]
      });
    }
  };

  // Check for duplicate courses
  const hasDuplicateCourses = () => {
    const courseStrings = formData.courses
      .filter(course => course.department && course.courseNumber)
      .map(course => `${course.department} ${course.courseNumber.toUpperCase()}`);
    
    const uniqueCourses = new Set(courseStrings); // use set data structure to remove duplicates
    return courseStrings.length !== uniqueCourses.size; // return true if there are duplicates (not equal) - set gets rid of duplicates
  };

  // Get duplicate course names for error message
  const getDuplicateCourses = () => {
    const courseStrings = formData.courses
      .filter(course => course.department && course.courseNumber)
      .map(course => `${course.department} ${course.courseNumber.toUpperCase()}`);
    
    // find which courses appear more than once
      const duplicates = courseStrings.filter((course, index) => 
      courseStrings.indexOf(course) !== index // duplicates - check with index of first occurrence to current index
    );
    
    return [...new Set(duplicates)]; // show duplicate course once in error msg
  };

  const removeCourse = (index) => {
    if (formData.courses.length > 1) { // keep at least one course
      const newCourses = formData.courses.filter((_, i) => i !== index); // keep all indices escept the one we want to remove
      setFormData({
        ...formData,
        courses: newCourses
      });
    }
  };

  const updateCourse = (index, field, value) => {
    const newCourses = [...formData.courses];
    newCourses[index] = { ...newCourses[index], [field]: value };
    setFormData({
      ...formData,
      courses: newCourses
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Check for duplicate courses
    if (hasDuplicateCourses()) {
      const duplicates = getDuplicateCourses();
      alert(`Please remove duplicate course(s):\n${duplicates.join('\n')}`);
      return;
    }
    
    try {
      // Convert all courses to standardized format (uppercase course numbers, remove spaces)
      const coursesSeeking = formData.courses
        .filter(course => course.department && course.courseNumber)
        .map(course => `${course.department} ${course.courseNumber.toUpperCase().replace(/\s+/g, '')}`);
      
      console.log('Submitting registration:', {
        ...formData,
        email: formData.email.toLowerCase(),
        coursesSeeking: coursesSeeking
      });
      
      const response = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          email: formData.email.toLowerCase(),
          coursesSeeking: coursesSeeking
        }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert('Registration successful! Please login.')
        setActiveTab('login')
      } else {
        alert(data.message)
      }
    } catch (error) {
      alert('Registration failed. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Register</h2>
      <div className="form-group">
        <label>Name:</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          required
        />
      </div>
      <div className="form-group">
        <label>Email:</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
        />
      </div>
      <div className="form-group">
        <label>Password:</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          required
        />
      </div>
      <div className="form-group">
        <label>Courses Seeking:</label>
        {formData.courses.map((course, index) => (
          <div key={index} style={{ 
            border: '1px solid #ddd', 
            padding: '15px', 
            marginBottom: '10px', 
            borderRadius: '8px',
            backgroundColor: 'transparent'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--neon-blue)' }}>Course {index + 1}</span>
              {formData.courses.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCourse(index)}
                  style={{
                    background: '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ×
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>Department:</label>
                <select
                  value={course.department}
                  onChange={(e) => updateCourse(index, 'department', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--neon-blue)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    boxShadow: '0 0 5px var(--neon-blue)',
                    outline: 'none'
                  }}
                >
                  <option value="">Select a department</option>
                  {departments.map((dept, deptIndex) => (
                    <option key={deptIndex} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>Course Number:</label>
                <input
                  type="text"
                  value={course.courseNumber}
                  onChange={(e) => updateCourse(index, 'courseNumber', e.target.value)}
                  placeholder="e.g., 31, 1A, 101"
                  required
                  disabled={!course.department}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
            </div>
          </div>
        ))}
        
        {formData.courses.length < 4 && (
          <button
            type="button"
            onClick={addCourse}
            style={{
              background: 'var(--neon-blue)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              marginTop: '5px'
            }}
          >
            + Add Another Course
          </button>
        )}
      </div>
      

      <div className="form-group">
        <label>Availability:</label>
        <input
          type="text"
          value={formData.availability}
          onChange={(e) => setFormData({...formData, availability: e.target.value})}
          placeholder="e.g., Weekdays 2-5pm, Weekends"
          required
        />
      </div>
      <div className="form-group">
        <label>Year in College:</label>
        <input
          type="text"
          value={formData.year}
          onChange={(e) => setFormData({...formData, year: e.target.value})}
          placeholder="e.g., Freshman, Sophomore, Junior, Senior"
          required
        />
      </div>
      <button type="submit" className="btn-primary">Register</button>
    </form>
  )
}

// JoinRequestsSection component for group creators to manage join requests
function JoinRequestsSection({ groupId, currentUser }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch join requests for this group
  const fetchRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/api/groups/${groupId}/requests`);
      if (response.ok) {
        const data = await response.json();
        console.log('Received join requests data:', data);
        console.log('Requests array:', data.requests);
        if (data.requests && data.requests.length > 0) {
          console.log('First request details:', data.requests[0]);
          console.log('User ID:', data.requests[0].userId);
        }
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load requests when component mounts
  useEffect(() => {
    fetchRequests();
  }, [groupId]);

  // Accept a join request
  const acceptRequest = async (requestId) => {
    try {
      const response = await fetch(`${API_URL}/api/groups/${groupId}/accept-request/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        alert('Join request accepted! User has been added to the group.');
        // Refresh requests
        await fetchRequests();
        // Refresh the page to show updated member count
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Failed to accept request: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept join request');
    }
  };

  // Reject a join request
  const rejectRequest = async (requestId) => {
    try {
      const response = await fetch(`${API_URL}/api/groups/${groupId}/reject-request/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        alert('Join request rejected.');
        // Refresh requests
        await fetchRequests();
      } else {
        const errorData = await response.json();
        alert(`Failed to reject request: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject join request');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '1rem' }}>Loading join requests...</div>;
  }

  if (requests.length === 0) {
    return <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>No pending join requests</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      {requests.map((request) => (
        <div key={request._id} style={{
          background: 'rgba(23, 23, 38, 0.6)',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          padding: '0.8rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ color: '#e8e8e8', fontWeight: 'bold', marginBottom: '0.3rem' }}>
              {request.userName || 'Unknown User'}
            </div>
            <div style={{ color: '#888', fontSize: '0.8rem' }}>
              {request.userEmail || 'No email'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => acceptRequest(request._id)}
              style={{
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.2rem',
                transition: 'all 0.3s ease'
              }}
              title="Accept request"
            >
              ✅
            </button>
            <button
              onClick={() => rejectRequest(request._id)}
              style={{
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.2rem',
                transition: 'all 0.3s ease'
              }}
              title="Reject request"
            >
              ❌
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Dashboard({ 
  currentUser, 
  setIsLoggedIn, 
  setCurrentUser, 
  setChatPeer,
  showBrowseGroupsModal,
  setShowBrowseGroupsModal,
  availableGroups,
  setAvailableGroups,
  loadingAvailableGroups,
  setLoadingAvailableGroups,
  fetchAvailableGroups,
  joinGroup,
  leaveGroup,

}) {
  const [peers, setPeers] = useState([])
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [expandedBios, setExpandedBios] = useState({})
  const [expandSelfBio, setExpandSelfBio] = useState(false)
  const [showStudyGroupOptions, setShowStudyGroupOptions] = useState(false)
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [selectedPeers, setSelectedPeers] = useState([])
  const [coursePeers, setCoursePeers] = useState([])
  const [loadingCoursePeers, setLoadingCoursePeers] = useState(false)

  const [groupFormData, setGroupFormData] = useState({
    name: '',
    course: '',
    maxMembers: 5,
    isPublic: true  // Default to public
  })

  const handleLogout = () => {
    setIsLoggedIn(false)
    setCurrentUser(null)
  }

  const findPeers = async () => {
    setLoading(true)
    setHasSearched(true)
    try {
      console.log('🔍 Searching for peers with courses:', currentUser.coursesSeeking); // appears in frontend developer console
      
      const response = await fetch(`${API_URL}/api/users/peers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser._id,
          coursesSeeking: currentUser.coursesSeeking
        }),
      })
      
      if (response.ok) {
        const data = await response.json() // logs in dev conosle - for debugging
        console.log('📊 Received peer data:', data);
        console.log('👥 Peers with match scores:', data.peers?.map(p => ({
          name: p.name,
          matchScore: p.matchScore,
          totalCourses: p.totalCourses,
          courses: p.coursesSeeking
        })));
        
        // Verify the peers are sorted by priority
        if (data.peers && data.peers.length > 0) {
          const firstPeer = data.peers[0];
          const lastPeer = data.peers[data.peers.length - 1];
          console.log('🥇 First peer (highest priority):', {
            name: firstPeer.name,
            matchScore: firstPeer.matchScore,
            totalCourses: firstPeer.totalCourses
          });
          console.log('🥉 Last peer (lowest priority):', {
            name: lastPeer.name,
            matchScore: lastPeer.matchScore,
            totalCourses: lastPeer.totalCourses
          });
        }
        
        setPeers(data.peers || []) // prevent error if data is empty [], update peers state var
      } else {
        console.error('❌ API response not ok:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error finding peers:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearPeers = () => {
    setPeers([])
    setHasSearched(false)
  }

  // Handle peer selection (checking/unchecking) for study group
  const togglePeerSelection = (peerId) => {
    setSelectedPeers(prev => 
      prev.includes(peerId) 
        ? prev.filter(id => id !== peerId)
        : [...prev, peerId]
    )
  }

  // Find peers for a specific course
  const findPeersForCourse = async (course) => {
    try {
      console.log('Finding peers for course:', course, 'API_URL:', API_URL);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_URL}/api/users/peers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser._id,
          coursesSeeking: [course] // Search for this specific course
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json()
        console.log('Found peers:', data.peers);
        return data.peers
      } else {
        console.error('API response not ok:', response.status, response.statusText);
        return []
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Request timed out after 10 seconds');
      } else {
        console.error('Error finding peers for course:', error)
      }
      return []
    }
  }

    // Create study group
  const createStudyGroup = async () => {
    if (!groupFormData.name || !groupFormData.course) {
      alert('Please fill in all required fields')
      return
    }

    try {
      console.log('Trying to create group at:', `${API_URL}/api/groups/create`);
      console.log('API_URL is:', API_URL);
      
      const response = await fetch(`${API_URL}/api/groups/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupFormData.name,
          creatorId: currentUser._id,
          course: groupFormData.course,
          maxMembers: groupFormData.maxMembers,
          isPublic: groupFormData.isPublic,
          selectedMembers: selectedPeers
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Show member names in success message
        const memberNames = data.memberNames?.map(member => member.name).join(', ') || 'No members';
        alert(`Study group created successfully!\n\nMembers: ${memberNames}`)
        
        setShowCreateGroupModal(false)
        setSelectedPeers([])
        setGroupFormData({ name: '', course: '', maxMembers: 5 })
      } else {
        const errorData = await response.json()
        alert(`Failed to create group: ${errorData.message}`)
      }
    } catch (error) {
      console.error('Error creating study group:', error)
      alert('Failed to create study group')
    }
  }

  return (
    <motion.div 
      className="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="dashboard-header">
        <h2>Welcome, {currentUser?.name}!</h2>
        <button onClick={handleLogout} className="btn-secondary">Logout</button>
      </div>

      <div className="user-info">
        <h3>Your Profile</h3>
        {editMode ? (
          <EditProfileForm
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            setEditMode={setEditMode}
            refreshPeers={findPeers}
            clearPeers={clearPeers}
          />
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{ position: 'relative', marginRight: '15px' }}>
                <img 
                  src={currentUser?.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTAgODBDMTAgNjUgMjAgNTUgMzUgNTVINjVDODAgNTUgOTAgNjUgOTAgODBWNzBIMFY4MFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo='}
                  alt="Profile" 
                  style={{
                    width: '60px', 
                    height: '60px', 
                    objectFit: 'cover',
                    borderRadius: '50%',
                    border: '2px solid #ddd'
                  }} 
                />
                <div 
                  onClick={() => setEditMode(true)}
                  style={{
                    position: 'absolute',
                    bottom: '-5px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#007bff',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
                >
                  Edit me!
                </div>
              </div>
              <div>
                <h4 style={{ margin: '0 0 5px 0', color: '#000' }}>{currentUser?.name}</h4>
                <p style={{ margin: '0', color: '#000', fontSize: '14px' }}>{currentUser?.email}</p>
              </div>
            </div>
            {currentUser?.bio && (
              <div style={{ margin: '8px 0', color: '#333', whiteSpace: 'pre-line' }}>
                {expandSelfBio || currentUser.bio.length <= 160
                  ? currentUser.bio
                  : `${currentUser.bio.slice(0, 160)}...`}
                {currentUser.bio.length > 160 && (
                  <button
                    type="button"
                    onClick={() => setExpandSelfBio(v => !v)}
                    style={{ marginLeft: 6, background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', padding: 0 }}
                  >
                    {expandSelfBio ? 'Less' : 'More'}
                  </button>
                )}
              </div>
            )}
            <p><strong>Courses Seeking:</strong> {currentUser?.coursesSeeking?.join(', ')}</p>
            <p><strong>Availability:</strong> {currentUser?.availability}</p>
            <p><strong>Year:</strong> {currentUser?.year}</p>
            <button onClick={() => setEditMode(true)} className="btn-primary" style={{marginTop: '10px'}}>Edit Profile</button>
          </>
        )}
      </div>

      <div className="peer-finding">
        <h3>Find Study Partners</h3>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', width: '100%' }}>
          <button 
            onClick={() => {
              if (showStudyGroupOptions) {
                setShowStudyGroupOptions(false);
              }
              findPeers();
            }} 
            className="btn-primary"
            disabled={loading}
            style={{ 
              flex: '1',  // Take up half the space
              fontSize: '16px',  // Bigger font
              padding: '12px 20px',  // More padding
              height: 'auto',  // Match height
              minHeight: '61px'  // Increased height
            }}
          >
            {loading ? 'Finding Peers...' : 'Find Peers'}
          </button>
          
          <button 
            onClick={() => {
              setShowStudyGroupOptions(!showStudyGroupOptions); // toggle
              if (!showStudyGroupOptions) { // clear peer search when opening study groups
                setPeers([]);
                setHasSearched(false);
              }
            }}
            className="btn-primary"
            style={{ 
              flex: '1',  // Take up half the space
              fontSize: '16px',  // Bigger font
              padding: '12px 20px',  // More padding
              height: 'auto',  // Match height
              minHeight: '61px'  // Same height as Find Peers
            }}
          >
            Find Study Groups
          </button>
        </div>

        {showStudyGroupOptions && (
          <div style={{ 
            marginTop: '20px', 
            padding: '20px', 
            border: '1px solid var(--border-light)', 
            borderRadius: '8px',
            background: 'var(--bg-card)'
          }}>
            <h4 style={{ marginBottom: '15px', textAlign: 'center', color: 'var(--text-primary)' }}>Study Group Options</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button 
                className="btn-primary"
                onClick={() => setShowCreateGroupModal(true)}
                style={{ width: '100%', padding: '15px', fontSize: '16px' }}
              >
                Create Study Group
              </button>
              
              <button 
                className="btn-primary"
                onClick={() => {
                  console.log('See Existing Groups button clicked!');
                  setShowBrowseGroupsModal(true);
                  // Auto-fetch groups when modal opens
                  setTimeout(() => fetchAvailableGroups(), 100);
                }}
                style={{ 
                  width: '100%', 
                  padding: '15px', 
                  fontSize: '16px'
                }}
              >
                See Existing Groups
              </button>
              
              <button 
                className="btn-primary"
                disabled={false}
                style={{
                  cursor: 'pointer'
                }}
                onClick={() => {
                  alert(`🤖 AI Study Partner Matching - Coming Soon!\n\n` +
                        `Our AI algorithm will:\n` +
                        `• Ask for your desired group size\n` +
                        `• Analyze all available students in your course\n` +
                        `• Find optimal study partners based on:\n` +
                        `  - Availability matching\n` +
                        `  - Academic year similarity\n` +
                        `  - Study preferences & bio\n` +
                        `• Create a study group from these optimal partners based on your preferred group size!\n\n` +
                        `Stay tuned for this intelligent matching feature!`);
                }}
              >
                🔒 Want Us to Decide? (Coming Soon)
              </button>
            </div>
          </div>
        )}

        {/* Create Study Group Modal */}
        {showCreateGroupModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'rgba(23, 23, 38, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '2px solid var(--neon-blue)',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 0 20px var(--neon-blue), 0 0 40px var(--neon-blue)',
              position: 'relative'
            }}>
              <h3 style={{ 
                marginTop: 0, 
                marginBottom: '20px', 
                textAlign: 'center',
                color: 'var(--neon-blue)',
                fontSize: '1.8rem',
                textShadow: '0 0 10px var(--neon-blue)'
              }}>
                Create Study Group
              </h3>
              
              {/* Group Name Input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold',
                  color: 'var(--neon-blue)',
                  textShadow: '0 0 5px var(--neon-blue)'
                }}>
                  Group Name: *
                </label>
                <input
                  type="text"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({...groupFormData, name: e.target.value})}
                  placeholder="e.g., CS 31 Study Squad"
                style={{ 
                  width: '100%', 
                    padding: '12px',
                    border: '2px solid var(--neon-blue)',
                    borderRadius: '8px',
                  fontSize: '16px',
                    backgroundColor: 'rgba(23, 23, 38, 0.8)',
                    color: '#e8e8e8',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>

              {/* Course Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold',
                  color: 'var(--neon-blue)',
                  textShadow: '0 0 5px var(--neon-blue)'
                }}>
                  Course: *
                </label>
                <select
                  value={groupFormData.course}
                  onChange={async (e) => {
                    const selectedCourse = e.target.value
                    setGroupFormData({...groupFormData, course: selectedCourse})
                    setSelectedPeers([]) // Reset selected peers
                    
                    if (selectedCourse) {
                      setLoadingCoursePeers(true)
                      const peers = await findPeersForCourse(selectedCourse)
                      setCoursePeers(peers)
                      setLoadingCoursePeers(false)
                    } else {
                      setCoursePeers([])
                  }
                }}
                style={{ 
                  width: '100%', 
                    padding: '12px',
                    border: '2px solid var(--neon-blue)',
                    borderRadius: '8px',
                  fontSize: '16px',
                    backgroundColor: 'rgba(23, 23, 38, 0.8)',
                    color: '#e8e8e8',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <option value="">Select a course</option>
                  {currentUser?.coursesSeeking?.map((course, index) => (
                    <option key={index} value={course}>{course}</option>
                  ))}
                </select>
              </div>

              {/* Max Members Slider */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold',
                  color: 'var(--neon-blue)',
                  textShadow: '0 0 5px var(--neon-blue)'
                }}>
                  Max Members: {groupFormData.maxMembers}
                </label>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={groupFormData.maxMembers}
                  onChange={(e) => setGroupFormData({...groupFormData, maxMembers: parseInt(e.target.value)})}
                  style={{ 
                    width: '100%',
                    accentColor: 'var(--neon-blue)'
                  }}
                />
              </div>

              {/* Public/Private Toggle */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold',
                  color: 'var(--neon-blue)',
                  textShadow: '0 0 5px var(--neon-blue)'
                }}>
                  Group Access:
                </label>
                <div style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  alignItems: 'center',
                  padding: '10px',
                  background: 'rgba(23, 23, 38, 0.6)',
                  borderRadius: '8px',
                  border: '1px solid var(--neon-blue)'
                }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    cursor: 'pointer',
                    color: groupFormData.isPublic ? 'var(--neon-blue)' : '#888'
                  }}>
                    <input
                      type="radio"
                      name="groupAccess"
                      value="public"
                      checked={groupFormData.isPublic === true}
                      onChange={() => setGroupFormData({...groupFormData, isPublic: true})}
                      style={{ accentColor: 'var(--neon-blue)' }}
                    />
                    <span style={{ fontWeight: 'bold' }}>🌐 Public</span>
                    <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>- Anyone can join</span>
                  </label>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    cursor: 'pointer',
                    color: groupFormData.isPublic === false ? 'var(--neon-blue)' : '#888'
                  }}>
                    <input
                      type="radio"
                      name="groupAccess"
                      value="private"
                      checked={groupFormData.isPublic === false}
                      onChange={() => setGroupFormData({...groupFormData, isPublic: false})}
                      style={{ accentColor: 'var(--neon-blue)' }}
                    />
                    <span style={{ fontWeight: 'bold' }}>🔒 Private</span>
                    <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>- Creator Approval required</span>
                  </label>
                </div>
              </div>

              {/* Peer Selection */}
              {groupFormData.course && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 'bold',
                    color: 'var(--neon-blue)',
                    textShadow: '0 0 5px var(--neon-blue)'
                  }}>
                    Select Peers to Invite for {groupFormData.course}:
                  </label>
                  
                  {loadingCoursePeers ? (
                    <div style={{ 
                      padding: '20px', 
                      textAlign: 'center', 
                      color: '#888',
                      backgroundColor: 'rgba(23, 23, 38, 0.6)',
                      borderRadius: '10px',
                      border: '1px solid var(--neon-blue)'
                    }}>
                      Finding peers for {groupFormData.course}...
                    </div>
                  ) : coursePeers.length > 0 ? (
                    <div style={{ 
                      maxHeight: '200px', 
                      overflowY: 'auto', 
                      border: '2px solid var(--neon-blue)', 
                      borderRadius: '10px', 
                      padding: '10px',
                      backgroundColor: 'rgba(23, 23, 38, 0.6)'
                    }}>
                      {coursePeers.map((peer, index) => (
                        <label key={index} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '8px', 
                          cursor: 'pointer',
                          backgroundColor: selectedPeers.includes(peer._id) ? 'rgba(39, 116, 174, 0.3)' : 'transparent',
                          borderRadius: '8px',
                          marginBottom: '4px',
                          transition: 'background-color 0.2s',
                          border: selectedPeers.includes(peer._id) ? '1px solid var(--neon-blue)' : '1px solid transparent'
                        }}>
                          <input
                            type="checkbox"
                            checked={selectedPeers.includes(peer._id)}
                            onChange={() => togglePeerSelection(peer._id)}
                            style={{ 
                              marginRight: '10px',
                              accentColor: 'var(--neon-blue)'
                            }}
                          />
                          <span style={{ color: 'var(--text-primary)' }}>
                            {peer.name} ({peer.email})
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div style={{ 
                      padding: '15px', 
                      backgroundColor: 'rgba(23, 23, 38, 0.6)', 
                      borderRadius: '10px', 
                      textAlign: 'center',
                      border: '2px solid var(--neon-blue)'
                    }}>
                      <p style={{ margin: 0, color: '#888' }}>
                        No peers found for {groupFormData.course}. Try a different course or invite friends manually.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button
                  onClick={createStudyGroup}
                  className="btn-primary"
                  style={{ padding: '12px 24px', fontSize: '16px' }}
                >
                  Create Group
                </button>
                <button
                                  onClick={() => {
                  setShowCreateGroupModal(false)
                  setSelectedPeers([])
                  setCoursePeers([])
                  setGroupFormData({ name: '', course: '', maxMembers: 5, isPublic: true })
                }}
                  className="btn-secondary"
                  style={{ padding: '12px 24px', fontSize: '16px' }}
                >
                  Cancel
              </button>
              </div>
            </div>
          </div>
        )}

        {hasSearched && !showStudyGroupOptions && (
          peers.length > 0 ? (
            <div className="peers-list">
              <h4>Potential Study Partners (Sorted by Most Matches):</h4>
              {peers.map((peer, index) => (
                <div key={index} className="peer-card" style={{ position: 'relative' }}>
                  {/* New Message Indicator */}
                  {peer.unreadCount > 0 && (
                    <div className="peer-unread-indicator">
                      <span className="peer-unread-badge">
                        New message
                      </span>
                    </div>
                  )}
                  
                  {peer.bio && (
                    <div style={{ margin: 0, marginBottom: '10px', color: '#111', whiteSpace: 'pre-line' }}>
                      {(expandedBios[peer._id] || peer.bio.length <= 160)
                        ? peer.bio
                        : `${peer.bio.slice(0, 160)}...`}
                      {peer.bio.length > 160 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setExpandedBios(prev => ({ ...prev, [peer._id]: !prev[peer._id] })); }}
                          style={{ marginLeft: 6, background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', padding: 0 }}
                        >
                          {expandedBios[peer._id] ? 'Less' : 'More'}
                        </button>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <img 
                      src={peer.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTAgODBDMTAgNjUgMjAgNTUgMzUgNTVINjVDODAgNTUgOTAgNjUgOTAgODBWNzBIMFY4MFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo='}
                      alt="Profile" 
                      style={{
                        width: '50px', 
                        height: '50px', 
                        objectFit: 'cover',
                        borderRadius: '50%',
                        border: '2px solid #ddd',
                        marginRight: '15px'
                      }} 
                    />
                    <div style={{ flex: 1 }}>
                      <h5 style={{ margin: '0 0 5px 0', color: '#000' }}>{peer.name}</h5>
                      <p style={{ margin: '0', color: '#000', fontSize: '14px' }}>{peer.email}</p>
                      

                    </div>
                  </div>
                  <p><strong>Courses:</strong> {peer.coursesSeeking?.join(', ')}</p>
                  <p><strong>Availability:</strong> {peer.availability}</p>
                  <p><strong>Year:</strong> {peer.year}</p>
                  <button
                    className="btn-primary"
                    style={{ marginTop: '0.7rem' }}
                    onClick={() => setChatPeer(peer)}
                  >
                    Chat with {peer.name}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            // Only show message if no peers
            <div style={{marginTop: '1.5rem', color: '#a4508b', textAlign: 'center', fontWeight: 500}}>
              Oh no, unfortunately it looks like no one has registered for this class yet.
            </div>
          )
        )}
      </div>
    </motion.div>
  )
}

function EditProfileForm({ currentUser, setCurrentUser, setEditMode, refreshPeers, clearPeers }) {
  // Convert existing coursesSeeking array to the new format { department, courseNumber }
  // remember user courses so render original courses in edit profile form
  const convertExistingCourses = (coursesArray) => {
    if (!Array.isArray(coursesArray)) return [{ department: '', courseNumber: '' }];
    
    return coursesArray.map(course => {
      // Try to parse existing course format (e.g., "Computer Science 31A")
      const parts = course.split(' ');
      if (parts.length >= 2) {
        const courseNumber = parts.pop(); // Last part is course number
        const department = parts.join(' '); // Everything else is department
        return { department, courseNumber };
      }
      return { department: course, courseNumber: '' }; // Fallback
    });
  };

  const [formData, setFormData] = useState({
    courses: convertExistingCourses(currentUser.coursesSeeking), // seperates into department and course number
    availability: currentUser.availability,
    year: currentUser.year,
    bio: currentUser.bio || ''
  });
  const [loading, setLoading] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(
    currentUser.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTAgODBDMTAgNjUgMjAgNTUgMzUgNTVINjVDODAgNTUgOTAgNjUgOTAgODBWNzBIMFY4MFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo='
  );

  // Helper functions for managing courses - literally the same as in register form
  const addCourse = () => {
    if (formData.courses.length < 4) {
      setFormData({
        ...formData,
        courses: [...formData.courses, { department: '', courseNumber: '' }]
      });
    }
  };

  // Check for duplicate courses
  const hasDuplicateCourses = () => {
    const courseStrings = formData.courses
      .filter(course => course.department && course.courseNumber)
      .map(course => `${course.department} ${course.courseNumber.toUpperCase()}`);
    
    const uniqueCourses = new Set(courseStrings);
    return courseStrings.length !== uniqueCourses.size;
  };

  // Get duplicate course names for error message
  const getDuplicateCourses = () => {
    const courseStrings = formData.courses
      .filter(course => course.department && course.courseNumber)
      .map(course => `${course.department} ${course.courseNumber.toUpperCase()}`);
    
    const duplicates = courseStrings.filter((course, index) => 
      courseStrings.indexOf(course) !== index
    );
    
    return [...new Set(duplicates)];
  };

  const removeCourse = (index) => {
    if (formData.courses.length > 1) {
      const newCourses = formData.courses.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        courses: newCourses
      });
    }
  };

  const updateCourse = (index, field, value) => {
    const newCourses = [...formData.courses];
    newCourses[index] = { ...newCourses[index], [field]: value };
    setFormData({
      ...formData,
      courses: newCourses
    });
  };

  const handleImageChange = (e) => { 
    const file = e.target.files[0]; // get selected file
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result) // convert to data URL so <img> can display 
      reader.readAsDataURL(file);
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(currentUser.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTAgODBDMTAgNjUgMjAgNTUgMzUgNTVINjVDODAgNTUgOTAgNjUgOTAgODBWNzBIMFY4MFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=');
  }
  // simple sanitizer: strip HTML tags
  const sanitizeText = (text) => (text || '').replace(/<[^>]*>/g, '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check for duplicate courses
    if (hasDuplicateCourses()) {
      const duplicates = getDuplicateCourses();
      alert(`Please remove duplicate courses:\n${duplicates.join('\n')}`);
      return;
    }
    
    setLoading(true);
    try {
      let imageUrl = currentUser.imageUrl; // Keep existing image if no new one selected
      
      // Upload image if selected
      if (selectedImage) {
        const formData = new FormData();
        formData.append('image', selectedImage);
        
        const uploadResponse = await fetch(`${API_URL}/api/users/upload-image`, {
          method: 'POST',
          body: formData
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          imageUrl = uploadData.imageUrl;
        } else {
          alert('Image upload failed.');
          return;
        }
      }
      
      //  // Convert all courses to standardized format (uppercase course numbers, remove spaces)
      const coursesSeeking = formData.courses
        .filter(course => course.department && course.courseNumber)
        .map(course => `${course.department} ${course.courseNumber.toUpperCase().replace(/\s+/g, '')}`);
      
      // Update profile with new data and image URL
      const response = await fetch(`${API_URL}/api/users/${currentUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coursesSeeking: coursesSeeking,
          availability: sanitizeText(formData.availability).slice(0, 160),
          year: sanitizeText(formData.year).slice(0, 40),
          imageUrl: imageUrl,
          bio: sanitizeText(formData.bio).slice(0, 300)
        }),
      });
      const data = await response.json();
      if (response.ok) {
        const merged = data.user ? { ...data.user, bio: data.user.bio ?? formData.bio } : { ...currentUser, imageUrl, availability: formData.availability, year: formData.year, coursesSeeking: coursesSeeking, bio: formData.bio };
        setCurrentUser(merged);
        setEditMode(false);
        if (typeof refreshPeers === 'function') {
          refreshPeers();
        }
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="edit-profile-form">
      <h3 style={{marginTop: 0}}>Edit Profile</h3>
      <hr style={{margin: '0.5rem 0 1rem 0', border: 0, borderTop: '1px solid #eee'}} />
      <div className="form-group">
        <label>Courses Seeking:</label>
        {formData.courses.map((course, index) => (
          <div key={index} style={{ 
            border: '1px solid #ddd', 
            padding: '15px', 
            marginBottom: '10px', 
            borderRadius: '8px',
            backgroundColor: 'transparent'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--neon-blue)' }}>Course {index + 1}</span>
              {formData.courses.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCourse(index)}
                  style={{
                    background: '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ×
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>Department:</label>
                <select
                  value={course.department}
                  onChange={(e) => updateCourse(index, 'department', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--neon-blue)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    boxShadow: '0 0 5px var(--neon-blue)',
                    outline: 'none'
                  }}
                >
                  <option value="">Select a department</option>
                  {departments.map((dept, deptIndex) => (
                    <option key={deptIndex} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>Course Number:</label>
                <input
                  type="text"
                  value={course.courseNumber}
                  onChange={(e) => updateCourse(index, 'courseNumber', e.target.value)}
                  placeholder="e.g., 31, 1A, 101"
                  required
                  disabled={!course.department}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
            </div>
          </div>
        ))}
        
        {formData.courses.length < 4 && (
          <button
            type="button"
            onClick={addCourse}
            style={{
              background: 'var(--neon-blue)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              marginTop: '5px'
            }}
          >
            + Add Another Course
          </button>
        )}
      </div>
      <div className="form-group">
        <label>Availability:</label>
        <input
          type="text"
          value={formData.availability}
          onChange={e => setFormData({ ...formData, availability: e.target.value })}
          required
        />
      </div>
      <div className="form-group">
        <label>Year:</label>
        <input
          type="text"
          value={formData.year}
          onChange={e => setFormData({ ...formData, year: e.target.value })}
          required
        />
      </div>
      <div className="form-group">
        <label>Bio (optional):</label>
        <textarea
          rows="3"
          value={formData.bio}
          onChange={e => setFormData({ ...formData, bio: e.target.value })}
          placeholder="Tell others about your classes, study style, goals..."
        />
      </div>
      <div className="form-group">
        <label>Profile Picture:</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />
      </div>
      
      <div className="image-preview" style={{marginTop: '10px'}}>
        <img 
          src={imagePreview} 
          alt="Profile" 
          style={{
            width: '100px', 
            height: '100px', 
            objectFit: 'cover',
            borderRadius: '50%',
            border: '2px solid #ddd'
          }} 
        />
        {selectedImage && (
          <button 
            type="button" 
            onClick={handleRemoveImage}
            style={{
              marginLeft: '10px',
              padding: '5px 10px',
              background: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Remove
          </button>
        )}
      </div>
      <button type="submit" className="btn-primary" disabled={loading}>Save</button>
      <button type="button" className="btn-secondary" onClick={() => setEditMode(false)} disabled={loading} style={{marginLeft: '10px'}}>Cancel</button>
    </form>
  );
}

function MessagesModal({ conversations, currentUser, onClose, onSelectConversation, selectedConversation }) {
  const [peerInfo, setPeerInfo] = useState({}); // { userId: { name, email } }
  const [loadingPeers, setLoadingPeers] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchAllPeerInfo() {
      setLoadingPeers(true);
      const info = {};
      for (const conv of conversations) {
        const peerId = conv.users.find(id => id !== currentUser._id);
        if (peerId && !info[peerId]) {
          try {
            const res = await fetch(`${API_URL}/api/users/${peerId}`);
            if (res.ok) {
              const data = await res.json();
              info[peerId] = { 
                name: data.user.name, 
                email: data.user.email
              };
            } else {
              info[peerId] = { name: peerId, email: '' };
            }
          } catch {
            info[peerId] = { name: peerId, email: '' };
          }
        }
      }
      if (isMounted) {
        setPeerInfo(info);
        setLoadingPeers(false);
      }
    }
    fetchAllPeerInfo();
    return () => { isMounted = false; };
  }, [conversations, currentUser]);

  // Only show one conversation per unique peer
  const uniquePeers = {};
  conversations.forEach(conv => {
    const peerId = conv.users.find(id => id !== currentUser._id);
    if (peerId && !uniquePeers[peerId]) {
      uniquePeers[peerId] = conv;
    }
  });
  const uniqueConversations = Object.values(uniquePeers);

  return (
    <div className="chat-popup-overlay">
      <div className="chat-popup-modal">
        <button className="chat-popup-close" onClick={onClose}>&times;</button>
        <h2>Your Messages</h2>
        
        {/* Show group conversation if selected */}
        {selectedConversation && selectedConversation.type === 'group' && (
          <div style={{
            background: 'rgba(23, 23, 38, 0.8)',
            border: '2px solid var(--neon-blue)',
            borderRadius: '15px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <h3 style={{
              color: 'var(--neon-blue)',
              margin: '0 0 0.5rem 0',
              fontSize: '1.2rem'
            }}>
              🏠 {selectedConversation.name} (Group Chat)
            </h3>
            <p style={{
              color: '#e8e8e8',
              margin: '0',
              fontSize: '0.9rem'
            }}>
              Members: {selectedConversation.members.map(m => m.name || m).join(', ')}
            </p>
            <button
              onClick={() => onSelectConversation(selectedConversation, null)}
              style={{
                background: 'var(--neon-blue)',
                color: 'var(--bg-card)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginTop: '0.5rem',
                transition: 'all 0.3s ease'
              }}
            >
              💬 Open Group Chat
            </button>
          </div>
        )}
        
        {/* Individual conversations */}
        <h3 style={{
          color: 'var(--neon-blue)',
          margin: '1rem 0 0.5rem 0',
          fontSize: '1.1rem'
        }}>
          Individual Chats:
        </h3>
        
        {uniqueConversations.length === 0 ? (
          <div className="chat-empty">No individual conversations yet.</div>
        ) : loadingPeers ? (
          <div className="chat-loading">Loading conversations...</div>
        ) : (
          <div className="chat-messages-list">
            {uniqueConversations.map((conv, idx) => {
              const peerId = conv.users.find(id => id !== currentUser._id);
              const peer = peerInfo[peerId] || { name: peerId, email: '' };
              const unreadCount = conv.unreadCount?.[currentUser._id] || 0;
              const hasUnreadMessages = unreadCount > 0;
              
              return (
                <div
                  key={conv.id}
                  className="chat-message"
                  onClick={() => onSelectConversation(conv, { _id: peerId, name: peer.name, email: peer.email })}
                >
                  <div className="chat-message-content">
                    <div className="chat-message-sender">{peer.name}</div>
                    <div className="chat-message-email">{peer.email}</div>
                    {hasUnreadMessages && (
                      <div className="chat-message-unread-indicator">
                        <span className="unread-badge">
                          {unreadCount === 1 ? 'New message' : `${unreadCount} new messages`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ChatPopup 
function ChatPopup({ peer, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { // conversation setup
    let unsubscribe;
    let isMounted = true;
    setLoading(true);
    setError(null);
    
    console.log('Setting up chat for users:', currentUser._id, peer._id);
    
    getOrCreateConversation([currentUser._id, peer._id]) // run when new chat opened
      .then(async id => {
        if (!isMounted) return;
        console.log('Conversation ID:', id);
        setConversationId(id);
        // Mark all messages as read when opening chat
        await markConversationAsRead(id, currentUser._id);
        unsubscribe = listenForMessages(id, msgs => {
          console.log('Received messages update:', msgs.length, 'messages');
          if (isMounted) {
            setMessages(msgs);
            setLoading(false);
          }
        });
      })
      .catch(err => {
        console.error('Error setting up chat:', err);
        if (isMounted) {
          setError('Failed to load chat.');
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [peer, currentUser]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !conversationId) return;
    
    const messageText = input.trim();
    setInput(''); // Clear input immediately for better UX
    
    try {
      console.log('Sending message:', messageText, 'to conversation:', conversationId);
      await sendMessage(conversationId, currentUser._id, messageText); // send message to firebase
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message.');
      setInput(messageText); // Restore the message if sending failed
    }
  };

  return (
    <div className="chat-popup-overlay">
      <div className="chat-popup-modal">
        <button className="chat-popup-close" onClick={onClose}>&times;</button>
        <h2 style={{marginBottom: '1.2rem'}}>Chat with {peer.name || peer._id}</h2>
        <div className="chat-messages-container">
          {loading ? (
            <div className="chat-loading">Loading messages...</div>
          ) : error ? (
            <div className="chat-error">{error}</div>
          ) : (
            <div className="chat-messages-list">
              {messages.length === 0 ? (
                <div className="chat-empty">No messages yet. Say hi!</div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={
                      'chat-message' + (msg.senderId === currentUser._id ? ' chat-message-own' : '')
                    }
                  >
                    <span className="chat-message-sender">
                      {msg.senderId === currentUser._id ? 'You' : (peer.name || peer._id)}
                    </span>
                    <span className="chat-message-text">{msg.text}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <form className="chat-input-form" onSubmit={handleSend} autoComplete="off">
          <input
            type="text"
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading || !!error}
            autoFocus
          />
          <button type="submit" className="chat-send-btn" disabled={loading || !!error || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}



export default App
