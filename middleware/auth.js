// AccountManagerService/middleware/auth.js
const mongoose = require('mongoose');
const User = require('../models/User');

// Static admin credentials (in memory, not stored in MongoDB)
const STATIC_ADMIN = {
  email: 'admin@example.com',
  password: 'admin123',
};

const adminSessionRequired = (req, res, next) => {
  if (!req.session.adminEmail) {
    return res.status(401).json({ error: 'Admin authentication required. Please log in as admin.' });
  }
  if (req.session.adminEmail !== STATIC_ADMIN.email) {
    return res.status(403).json({ error: 'Invalid admin session.' });
  }
  next();
};

const userSessionRequired = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'User authentication required. Please log in.' });
  }

  User.findById(req.session.userId)
    .then(user => {
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      req.user = user;
      next();
    })
    .catch(err => res.status(500).json({ error: 'Server error' }));
};

module.exports = { adminSessionRequired, userSessionRequired, STATIC_ADMIN };