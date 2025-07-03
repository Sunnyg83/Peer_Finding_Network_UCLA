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
const PORT = process.env.PORT || 5000;

// cors + json parser
app.use(cors());
app.use(express.json());

// test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

app.listen(PORT, () => {
    console.log(`API available at: http://localhost:${PORT}/api/test`);
}); 
