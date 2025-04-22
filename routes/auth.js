const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, name });
    await user.save();
    console.log(`User registered successfully: ${email}`);
    res.status(201).json({ message: 'User registered' });
  } catch (error) {
    console.log('Registration failed:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log(`Login failed for ${email}: Invalid credentials`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log(`User logged in successfully: ${email}`);
    res.json({ token, redirect: '/main?token=' + token });
  } catch (error) {
    console.log('Login failed:', error.message);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;