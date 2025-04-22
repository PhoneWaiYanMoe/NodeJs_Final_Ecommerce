// Load environment variables first
const dotenv = require('dotenv');
const path = require('path');

// Configure dotenv with the explicit path
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Then require other modules
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5002;

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const discountRoutes = require('./routes/discountRoutes');
const loyaltyRoutes = require('./routes/loyaltyRoutes');

// Use routes
app.use('/api/discounts', discountRoutes);
app.use('/api/loyalty', loyaltyRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Discount Service API is running');
});

// Add global error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Start the server with error handling and clickable link
app.listen(PORT, () => {
  console.log(`Discount Service running on port ${PORT}`);
  console.log(`Server is running at \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
}).on('error', (error) => {
  console.error('Server failed to start:', error);
});

module.exports = app; // For testing purposes