import { useState, useEffect } from 'react'
import './App.css'
import { API_URL } from './config'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState('login')
  // track current theme
  const [theme, setTheme] = useState('dark')
  // Landing page state
  const [showLanding, setShowLanding] = useState(true)

  const [chatPeer, setChatPeer] = useState(null)

  // Load default from storage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  // Only show landing if not logged in and showLanding is true
  if (!isLoggedIn && showLanding) {
    return (
      <div className="landing-viewport">
        <button 
          className="theme-toggle" 
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className="landing-content">
          <img src="/UCLA_Landing.jpeg" alt="UCLA Logo" className="ucla-logo" />
          <h1 className="landing-title">Welcome to the UCLA Study Network</h1>
          <p className="landing-subtitle">Find your perfect study partner, join groups, and ace your courses.<br/>Built by Bruins, for Bruins.</p>
          <ul className="landing-features">
            <li>🔍 Match with peers in your classes</li>
            <li>🤝 Form or join study groups</li>
            <li>📅 Share your availability</li>
            <li>🌙 Beautiful dark & light mode</li>
            <li>🚀 Easy to join, just enter your email!</li>
          </ul>
          <button className="get-started-btn" onClick={() => setShowLanding(false)}>
            Get Started
          </button>
        </div>
        <footer className="landing-footer">&copy; {new Date().getFullYear()} UCLA Study Network. All rights reserved.</footer>
      </div>
    )
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
        {/* Chat popup modal */}
        {chatPeer && (
          <ChatPopup peer={chatPeer} onClose={() => setChatPeer(null)} />
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

// Simple ChatPopup modal (UI only for now)
function ChatPopup({ peer, onClose }) {
  return (
    <div className="chat-popup-overlay">
      <div className="chat-popup-modal">
        <button className="chat-popup-close" onClick={onClose}>&times;</button>
        <h2 style={{marginBottom: '1.2rem'}}>Chat with {peer.name}</h2>
        <div style={{marginTop: '2rem', color: '#888', textAlign: 'center', fontSize: '1.1rem'}}>
          Chat UI coming soon...
        </div>
      </div>
    </div>
  );
}

export default App
