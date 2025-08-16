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

// CORS middleware
app.use(cors());

// json parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Backend is running!' });
});



// import user routes
const userRoutes = require('./routes/userRoutes');

// use user routes
app.use('/api/users', userRoutes);

app.listen(PORT, () => {
    console.log(`API available at: http://localhost:${PORT}/api/test`);
}); 
