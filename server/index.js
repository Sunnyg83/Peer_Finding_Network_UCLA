// starts the server
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const mongoose = require('mongoose');

// connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

// create express app + port
const app = express();
const PORT = process.env.PORT || 5001;

// Enhanced CORS middleware (explicit origin, methods, headers)
const corsOptions = {
  origin: [
    'http://127.0.0.1:5173', 
    'http://localhost:5173',
    'https://peer-finding-network-ucla.vercel.app',
    'https://peerfindingnetworkucla-production.up.railway.app',
    'https://peerfindingnetworkucla.railway.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Explicitly handle preflight OPTIONS requests
app.options('*', cors(corsOptions));

// json parser
app.use(express.json());

// import user routes
const userRoutes = require('./routes/userRoutes');

// root health check for Railway
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// use user routes
app.use('/api/users', userRoutes);

// Start server
const server = app.listen(PORT, () => {
    console.log(`API available at: http://localhost:${PORT}/api/test`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
}); 
