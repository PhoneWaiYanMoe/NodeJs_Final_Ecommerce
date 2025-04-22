const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Middleware to verify JWT
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('Authentication failed: No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log('Authentication failed: Invalid token');
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.userId = decoded.userId;
    next();
  });
};

// View profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      console.log('Profile fetch failed: User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    console.log(`Profile fetched for user: ${user.email}`);
    res.json(user);
  } catch (error) {
    console.log('Profile fetch failed:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(req.userId, { name }, { new: true }).select('-password');
    console.log(`Profile updated for user: ${user.email}, new name: ${name}`);
    res.json({ message: 'Profile updated', user });
  } catch (error) {
    console.log('Profile update failed:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Add address
router.post('/address', authenticate, async (req, res) => {
  try {
    const { street, city, zipCode, country } = req.body;
    const user = await User.findById(req.userId);
    user.addresses.push({ street, city, zipCode, country });
    await user.save();
    console.log(`Address added for user: ${user.email}, address: ${street}, ${city}`);
    res.json({ message: 'Address added', user: user });
  } catch (error) {
    console.log('Address addition failed:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Update address
router.put('/address/:index', authenticate, async (req, res) => {
  try {
    const { index } = req.params;
    const { street, city, zipCode, country } = req.body;
    const update = { $set: {} };
    update.$set[`addresses.${index}`] = { street, city, zipCode, country };
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select('-password');
    console.log(`Address updated for user: ${user.email}, index: ${index}, new address: ${street}, ${city}`);
    res.json({ message: 'Address updated', user });
  } catch (error) {
    console.log('Address update failed:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Delete address
router.delete('/address/:index', authenticate, async (req, res) => {
  try {
    const { index } = req.params;
    await User.findByIdAndUpdate(req.userId, {
      $unset: { [`addresses.${index}`]: 1 },
    });
    const user = await User.findByIdAndUpdate(req.userId, { $pull: { addresses: null } }, { new: true }).select('-password');
    console.log(`Address deleted for user: ${user.email}, index: ${index}`);
    res.json({ message: 'Address deleted', user });
  } catch (error) {
    console.log('Address deletion failed:', error.message);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;