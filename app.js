const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');

dotenv.config();

// Set Mongoose strictQuery to false to suppress deprecation warning
mongoose.set('strictQuery', false);

const app = express();

// Middleware
app.use(cors({
    origin: ['https://62e0-171-250-182-137.ngrok-free.app', 'http://localhost:3000'], // Allow Ngrok and local dev
    credentials: true // Allow cookies/sessions
}));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', // Ensure a secret is set
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, // Required for HTTPS (Ngrok uses HTTPS)
        httpOnly: true, // Prevent client-side JS from accessing the cookie
        sameSite: 'none', // Required for cross-origin cookies
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

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
app.use('/user', userRoutes);

// Start server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`AccountManagerService running on port ${PORT}`);
});
