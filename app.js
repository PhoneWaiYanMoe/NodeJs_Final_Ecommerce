const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const cartRoutes = require('./routes/cartRoutes');

dotenv.config();

// Set Mongoose strictQuery to false to suppress deprecation warning
mongoose.set('strictQuery', false);

const app = express();

// Middleware
app.use(cors({
    origin: 'https://frontend-u30c.onrender.com',
    credentials: true // Allow cookies/sessions
}));
app.use(express.json());

// Update session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: true, // Set to true to create a session for guests
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
}));

// Add logging middleware for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Session ID:', req.session.id);
    console.log('User ID:', req.session.userId);
    console.log('Session ID (guest):', req.session.sessionId);
    next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: true,
    tls: true
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/cart', cartRoutes);

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`CartAndCheckout service running on port ${PORT}`);
});
