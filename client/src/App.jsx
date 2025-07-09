import { useState } from 'react'
import './App.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState('login')

  return (
    <div className="centered-viewport">
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
          <Dashboard currentUser={currentUser} setIsLoggedIn={setIsLoggedIn} />
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
      const response = await fetch('http://127.0.0.1:5001/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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
        coursesSeeking: formData.coursesSeeking.split(',').map(course => course.trim())
      });
      const response = await fetch('http://127.0.0.1:5001/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
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

function Dashboard({ currentUser, setIsLoggedIn }) {
  const [peers, setPeers] = useState([])
  const [loading, setLoading] = useState(false)

  const handleLogout = () => {
    setIsLoggedIn(false)
    setCurrentUser(null)
  }

  const findPeers = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://127.0.0.1:5001/api/users/peers', {
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

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Welcome, {currentUser?.name}!</h2>
        <button onClick={handleLogout} className="btn-secondary">Logout</button>
      </div>

      <div className="user-info">
        <h3>Your Profile</h3>
        <p><strong>Email:</strong> {currentUser?.email}</p>
        <p><strong>Courses Seeking:</strong> {currentUser?.coursesSeeking?.join(', ')}</p>
        <p><strong>Availability:</strong> {currentUser?.availability}</p>
        <p><strong>Year:</strong> {currentUser?.year}</p>
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

        {peers.length > 0 && (
          <div className="peers-list">
            <h4>Potential Study Partners:</h4>
            {peers.map((peer, index) => (
              <div key={index} className="peer-card">
                <h5>{peer.name}</h5>
                <p><strong>Courses:</strong> {peer.coursesSeeking?.join(', ')}</p>
                <p><strong>Availability:</strong> {peer.availability}</p>
                <p><strong>Email:</strong> {peer.email}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
