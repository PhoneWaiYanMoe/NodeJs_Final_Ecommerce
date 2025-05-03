const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const dotenv = require('dotenv');
const cartRoutes = require('./routes/cartRoutes');

dotenv.config();

// Set Mongoose strictQuery to false to suppress deprecation warning
mongoose.set('strictQuery', false);

const app = express();

// Middleware
app.use(cors({
    origin: '*', // Allow requests from any origin for now
    credentials: true // Allow cookies/sessions
}));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }, // Secure cookies in production
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
app.use('/cart', cartRoutes);

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`CartAndCheckout service running on port ${PORT}`);
});