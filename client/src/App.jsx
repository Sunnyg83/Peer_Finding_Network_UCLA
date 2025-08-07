import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'
import { API_URL } from './config'
import { getOrCreateConversation, sendMessage, listenForMessages, getUserConversations, getUnreadCountForUser, markConversationAsRead } from './firebaseChatModel';

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

  const [chatPeer, setChatPeer] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0);

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
              Peer Network
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
              Peer Network connects you with fellow UCLA students taking the same classes. 
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
                title: "Real-Time Chat",
                description: "Chat instantly with your study partners. Share notes, ask questions, and collaborate on assignments in real-time."
              },
              {
                icon: "🤝",
                title: "Build Friendships",
                description: "More than just study partners - make lasting friendships with students who share your academic interests and goals."
              },
              {
                icon: "⚡",
                title: "Instant Matching",
                description: "Get matched with compatible study partners instantly. No waiting, just direct connections.",
                comingSoon: "Coming soon: Personalized study groups"
              },
              {
                icon: "🔒",
                title: "Safe & Secure",
                description: "UCLA student verification coming soon! For now, anyone can join and connect.",
                comingSoon: "Coming soon: UCLA student verification"
              },
              {
                icon: "📱",
                title: "Always Available",
                description: "Access your study network anytime, anywhere. Perfect for late-night study sessions and last-minute questions.",
                comingSoon: "Coming soon: Mobile app & notifications"
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
                <p className="feature-description" style={{paddingBottom: feature.comingSoon ? '1.7rem' : '0'}}>
                  {feature.description}
                </p>
                {feature.comingSoon && (
                  <motion.div 
                    style={{marginTop: '1rem'}}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    viewport={{ once: true }}
                  >
                    <span style={{
                      background:'#FFD100', 
                      color:'#17408B', 
                      borderRadius: '8px', 
                      padding:'0.3em 0.8em', 
                      fontWeight:600, 
                      fontSize:'0.95rem', 
                      display:'inline-block'
                    }}>
                      {feature.comingSoon}
                    </span>
                  </motion.div>
                )}
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
            <span className="unread-dot" />
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
                const count = await getUnreadCountForUser(currentUser._id);
                setUnreadCount(count);
              }
            }}
          />
        )}
        {showMessagesModal && (
          <MessagesModal
            conversations={conversations}
            currentUser={currentUser}
            onClose={() => setShowMessagesModal(false)}
            onSelectConversation={(conv, peer) => {
              setShowMessagesModal(false);
              setChatPeer(peer);
            }}
          />
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
    coursesSeeking: '',
    availability: '',
    year: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      console.log('Submitting registration:', {
        ...formData,
        email: formData.email.toLowerCase(),
        coursesSeeking: formData.coursesSeeking.split(',').map(course => course.trim())
      });
      const response = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          email: formData.email.toLowerCase(),
          coursesSeeking: formData.coursesSeeking.split(',').map(course => course.trim())
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
        <label>Courses Seeking (comma-separated):</label>
        <input
          type="text"
          value={formData.coursesSeeking}
          onChange={(e) => setFormData({...formData, coursesSeeking: e.target.value})}
          placeholder="e.g., CS 31, Math 32A, Physics 1A"
          required
        />
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

function Dashboard({ currentUser, setIsLoggedIn, setCurrentUser, setChatPeer }) {
  const [peers, setPeers] = useState([])
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleLogout = () => {
    setIsLoggedIn(false)
    setCurrentUser(null)
  }

  const findPeers = async () => {
    setLoading(true)
    setHasSearched(true)
    try {
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
        const data = await response.json()
        setPeers(data.peers)
      }
    } catch (error) {
      console.error('Error finding peers:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearPeers = () => {
    setPeers([])
    setHasSearched(false)
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
            onClick={findPeers} 
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
            className="btn-primary"
            disabled={true}
            style={{ 
              flex: '1',  // Take up half the space
              fontSize: '16px',  // Bigger font
              padding: '12px 20px',  // More padding
              height: 'auto',  // Match height
              minHeight: '61px',  // Same height as Find Peers
              opacity: 0.6,
              cursor: 'not-allowed',
              position: 'relative'
            }}
            title="Coming soon!"
          >
            Find Study Group
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: '#FFD100',
              color: '#17408B',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold'
            }}>
              🔒
            </span>
          </button>
        </div>

        {hasSearched && (
          peers.length > 0 ? (
            <div className="peers-list">
              <h4>Potential Study Partners:</h4>
              {peers.map((peer, index) => (
                <div key={index} className="peer-card">
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
                    <div>
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
  const [formData, setFormData] = useState({
    coursesSeeking: currentUser.coursesSeeking.join(', '),
    availability: currentUser.availability,
    year: currentUser.year,
  });
  const [loading, setLoading] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(
    currentUser.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTAgODBDMTAgNjUgMjAgNTUgMzUgNTVINjVDODAgNTUgOTAgNjUgOTAgODBWNzBIMFY4MFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo='
  );

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
  const handleSubmit = async (e) => {
    e.preventDefault();
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
      
      // Update profile with new data and image URL
      const response = await fetch(`${API_URL}/api/users/${currentUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coursesSeeking: formData.coursesSeeking.split(',').map(c => c.trim()),
          availability: formData.availability,
          year: formData.year,
          imageUrl: imageUrl
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setCurrentUser(data.user);
        setEditMode(false);
        clearPeers(); // Clear the peer list after update
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
        <label>Courses Seeking (comma-separated):</label>
        <input
          type="text"
          value={formData.coursesSeeking}
          onChange={e => setFormData({ ...formData, coursesSeeking: e.target.value })}
          required
        />
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

function MessagesModal({ conversations, currentUser, onClose, onSelectConversation }) {
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
              info[peerId] = { name: data.user.name, email: data.user.email };
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
      uniquePeers[peerId] = conv; // change map to array
    }
  });
  const uniqueConversations = Object.values(uniquePeers);

  return (
    <div className="chat-popup-overlay">
      <div className="chat-popup-modal" style={{ minWidth: 320, minHeight: 200 }}>
        <button className="chat-popup-close" onClick={onClose}>&times;</button>
        <h2 style={{marginBottom: '1.2rem'}}>Your Messages</h2>
        {uniqueConversations.length === 0 ? (
          <div className="chat-empty">No conversations yet.</div>
        ) : loadingPeers ? (
          <div className="chat-loading">Loading names...</div>
        ) : (
          <div className="chat-messages-list">
            {uniqueConversations.map((conv, idx) => {
              const peerId = conv.users.find(id => id !== currentUser._id);
              const peer = peerInfo[peerId] || { name: peerId, email: '' };
              return (
                <div key={conv.id}>
                  <div
                    className="chat-message"
                    style={{ cursor: 'pointer', background: '#eee', color: '#222', marginBottom: 0 }}
                    onClick={() => onSelectConversation(conv, { _id: peerId, name: peer.name, email: peer.email })}
                  >
                    <span className="chat-message-sender">{peer.name}</span>
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>{peer.email}</span>
                  </div>
                  {idx < uniqueConversations.length - 1 && (
                    <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '8px 0' }} />
                  )}
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
