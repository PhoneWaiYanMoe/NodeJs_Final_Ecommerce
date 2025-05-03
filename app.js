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

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: true,
    tls: true
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit if MongoDB fails to connect
    });

// Middleware
const allowedOrigins = [
    'https://149f-2401-d800-2820-2662-e85c-630b-971a-8bac.ngrok-free.app',
    'https://d5d2-2401-d800-2820-2662-65e1-172b-8529-78fd.ngrok-free.app',
    'http://localhost:3000'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Basic logging
app.use((req, res, next) => {
    console.log(`Request: ${req.method} ${req.url}`);
    console.log('Incoming cookies:', req.headers.cookie);
    next();
});

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'none',
        domain: 'nodejs-final-ecommerce.onrender.com', // Explicitly set domain
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Log session creation and force save
app.use((req, res, next) => {
    if (!req.session.test) {
        req.session.test = 'Session test value';
        req.session.save(err => {
            if (err) {
                console.error('Session save error:', err);
            } else {
                console.log('Session initialized and saved:', req.session);
            }
        });
    }
    next();
});

// Test route to verify session
app.get('/test-session', (req, res) => {
    console.log('Session in /test-session:', req.session);
    if (req.session.test) {
        res.status(200).json({ message: 'Session working', value: req.session.test });
    } else {
        res.status(400).json({ message: 'Session not found' });
    }
});

// Routes
app.use('/user', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`AccountManagerService running on port ${PORT}`);
});
