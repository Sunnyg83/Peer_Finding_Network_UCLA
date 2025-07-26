const express = require('express');
const cors = require('cors');
const matchRoutes = require('./routes/matchRoutes');

const app = express();
const PORT = process.env.PORT || 5002;

// Enhanced CORS middleware (explicit origin, methods, headers)
const corsOptions = {
  origin: [
    'http://127.0.0.1:5173', 
    'http://localhost:5173',
    'https://peer-finding-network-ucla.vercel.app', 
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Explicitly handle preflight OPTIONS requests
app.options('*', cors(corsOptions));

app.use(express.json());

// Health check route - respond immediately
app.get('/', (req, res) => {
  res.json({ message: 'Peer Matching Service is running!', status: 'healthy' });
});

// Health check route for Railway
app.get('/health', (req, res) => {
  res.json({ message: 'Peer Matching Service is running!', status: 'healthy' });
});

app.use('/api', matchRoutes);

// Signal handling for graceful shutdown
process
  .on('SIGTERM', shutdown('SIGTERM'))
  .on('SIGINT', shutdown('SIGINT'))
  .on('uncaughtException', shutdown('uncaughtException'));

function shutdown(signal) {
  return (err) => {
    console.log(`${signal}...`);
    if (err) console.error(err.stack || err);
    setTimeout(() => {
      console.log('...waited 5s, exiting.');
      process.exit(err ? 1 : 0);
    }, 5000).unref();
  };
}

app.listen(PORT, () => {
  console.log(`Peer Matching Service running on port ${PORT}`);
});
