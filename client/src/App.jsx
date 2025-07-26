import { useState, useEffect } from 'react'
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
      <div className="landing-container">
        {/* Start/Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">Peer Network</h1>
            <h2 className="hero-subtitle">Connect with UCLA Students in Your Classes</h2>
            <p className="hero-description">
              Struggling to find study partners? Need help understanding course material? 
              Peer Network connects you with fellow UCLA students taking the same classes. 
              Find study groups, get homework help, and make friends who share your academic journey.
            </p>
            <div className="cta-buttons">
              <button className="cta-primary" onClick={() => setShowLanding(false)}>
                Get Started Now
              </button>
              <button className="cta-secondary" onClick={scrollToFeatures}>
                Learn More
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features-section" className="features-section">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎓</div>
              <h3 className="feature-title">Find Study Partners</h3>
              <p className="feature-description">
                Connect with students in your exact classes. Find study groups, 
                homework partners, and classmates who can help you succeed.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3 className="feature-title">Real-Time Chat</h3>
              <p className="feature-description">
                Chat instantly with your study partners. Share notes, ask questions, 
                and collaborate on assignments in real-time.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🤝</div>
              <h3 className="feature-title">Build Friendships</h3>
              <p className="feature-description">
                More than just study partners - make lasting friendships with 
                students who share your academic interests and goals.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3 className="feature-title">Instant Matching</h3>
              <p className="feature-description" style={{paddingBottom: '1.7rem'}}>
                Get matched with compatible study partners instantly. No waiting, just direct connections.
              </p>
              <div style={{marginTop: '1rem'}}>
                <span style={{background:'#FFD100', color:'#17408B', borderRadius: '8px', padding:'0.3em 0.8em', fontWeight:600, fontSize:'0.95rem', display:'inline-block'}}>
                  Coming soon: Personalized study groups
                </span>
              </div>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3 className="feature-title">Safe & Secure</h3>
              <p className="feature-description" style={{paddingBottom: '3.2rem'}}>
                UCLA student verification <b>coming soon!</b> For now, anyone can join and connect.
              </p>
              <div style={{marginTop: '1rem'}}>
                <span style={{background:'#FFD100', color:'#17408B', borderRadius: '8px', padding:'0.3em 0.8em', fontWeight:600, fontSize:'0.95rem', display:'inline-block'}}>
                  Coming soon: UCLA student verification
                </span>
              </div>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3 className="feature-title">Always Available</h3>
              <p className="feature-description" style={{paddingBottom: '1.7rem'}}>
                Access your study network anytime, anywhere. 
                Perfect for late-night study sessions and last-minute questions.
              </p>
              <div style={{marginTop: '1rem'}}>
                <span style={{background:'#FFD100', color:'#17408B', borderRadius: '8px', padding:'0.3em 0.8em', fontWeight:600, fontSize:'0.95rem', display:'inline-block'}}>
                  Coming soon: Mobile app & notifications
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats-section">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Available</div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <p>© 2025 Peer Network. Connecting UCLA students, one class at a time.</p>
        </footer>
      </div>
    );
  };

  // Only show landing if not logged in and showLanding is true
  if (!isLoggedIn && showLanding) {
    const isLight = theme === 'light';
    return (
      <>
        <button 
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
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <LandingPage />
      </>
    );
  }

  return (
    <div className="centered-viewport">
       {/* Toggle button logic */}
      <button 
        className="theme-toggle" 
        onClick={toggleTheme}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
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
          <p>Connect with study partners, form study groups, and ace your courses. Built by Bruins, for Bruins!</p>
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
    </div>
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
    <div className="dashboard">
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
            <p><strong>Email:</strong> {currentUser?.email}</p>
            <p><strong>Courses Seeking:</strong> {currentUser?.coursesSeeking?.join(', ')}</p>
            <p><strong>Availability:</strong> {currentUser?.availability}</p>
            <p><strong>Year:</strong> {currentUser?.year}</p>
            <button onClick={() => setEditMode(true)} className="btn-primary" style={{marginTop: '10px'}}>Edit Profile</button>
          </>
        )}
      </div>

      <div className="peer-finding">
        <h3>Find Study Partners</h3>
        <button 
          onClick={findPeers} 
          className="btn-primary"
          disabled={loading}
        >
          {loading ? 'Finding Peers...' : 'Find Peers'}
        </button>

        {hasSearched && (
          peers.length > 0 ? (
            <div className="peers-list">
              <h4>Potential Study Partners:</h4>
              {peers.map((peer, index) => (
                <div key={index} className="peer-card">
                  <h5>{peer.name}</h5>
                  <p><strong>Courses:</strong> {peer.coursesSeeking?.join(', ')}</p>
                  <p><strong>Availability:</strong> {peer.availability}</p>
                  <p><strong>Email:</strong> {peer.email}</p>
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
    </div>
  )
}

function EditProfileForm({ currentUser, setCurrentUser, setEditMode, refreshPeers, clearPeers }) {
  const [formData, setFormData] = useState({
    coursesSeeking: currentUser.coursesSeeking.join(', '),
    availability: currentUser.availability,
    year: currentUser.year,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/users/${currentUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coursesSeeking: formData.coursesSeeking.split(',').map(c => c.trim()),
          availability: formData.availability,
          year: formData.year,
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
    getOrCreateConversation([currentUser._id, peer._id]) // run when new chat opened
      .then(async id => {
        if (!isMounted) return;
        setConversationId(id);
        // Mark all messages as read when opening chat
        await markConversationAsRead(id, currentUser._id);
        unsubscribe = listenForMessages(id, msgs => {
          setMessages(msgs);
          setLoading(false);
        });
      })
      .catch(err => {
        setError('Failed to load chat.');
        setLoading(false);
      });
    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [peer, currentUser]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !conversationId) return;
    try {
      await sendMessage(conversationId, currentUser._id, input.trim()); // send message to firebase
      setInput('');
    } catch (err) {
      setError('Failed to send message.');
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
