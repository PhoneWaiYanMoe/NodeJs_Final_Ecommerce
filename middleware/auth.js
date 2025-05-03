// CartAndCheckout/middleware/auth.js
// Static admin credentials (in memory, not stored in MongoDB)
const STATIC_ADMIN = {
    email: 'admin@example.com',
    password: 'admin123',
  };
  
  const adminRequired = (req, res, next) => {
    if (!req.session.adminEmail) {
      return res.status(401).json({ error: 'Admin authentication required. Please log in as admin.' });
    }
    if (req.session.adminEmail !== STATIC_ADMIN.email) {
      return res.status(403).json({ error: 'Invalid admin session.' });
    }
    next();
  };
  
  const userOrGuestRequired = (req, res, next) => {
    // If neither userId nor sessionId exists, start a guest session
    if (!req.session.userId && !req.session.sessionId) {
      req.session.sessionId = require('uuid').v4(); // Start a guest session
    }
    next();
  };
  
  const userRequired = (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'User authentication required for checkout. Please log in.' });
    }
    next();
  };
  
  module.exports = { adminRequired, userOrGuestRequired, userRequired, STATIC_ADMIN };