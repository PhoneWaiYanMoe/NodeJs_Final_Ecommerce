const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
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
    'https://a46f-2402-800-62a9-bd95-5d7f-313e-f077-afe4.ngrok-free.app',
    'https://frontend-u30c.onrender.com',
    'http://localhost:3000',
    'https://product-management-soyo.onrender.com',
    'https://nodejs-final-ecommerce-1.onrender.com'
];

// Explicitly handle OPTIONS requests for CORS preflight
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS request for:', req.url);
        const origin = req.headers.origin;
        if (allowedOrigins.includes(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.header('Access-Control-Allow-Credentials', 'true');
            return res.status(200).json({});
        }
    }
    next();
});

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, origin);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', POST, 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Log requests and Authorization header for debugging
app.use((req, res, next) => {
    console.log(`Request: ${req.method} ${req.url}`);
    console.log('Authorization header:', req.headers.authorization);
    next();
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
