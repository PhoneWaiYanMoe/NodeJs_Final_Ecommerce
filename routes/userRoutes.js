const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const User = require('../models/User');

const SECRET_KEY = process.env.JWT_SECRET || 'your-jwt-secret-key';

// Email setup with Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminSessionRequired = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(401).json({ error: 'Admin authentication required. Please log in as admin.' });
  }
  next();
};

const userSessionRequired = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User access required' });
  }
  next();
};

const STATIC_ADMIN = {
  email: 'admin@example.com',
  password: 'admin123',
};

// Generate a random temporary password
const generateTemporaryPassword = () => {
  return crypto.randomBytes(8).toString('hex'); // 16-character hex string
};

// Admin Routes
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }

  if (email !== STATIC_ADMIN.email || password !== STATIC_ADMIN.password) {
    return res.status(401).json({ message: 'Invalid admin credentials' });
  }

  const token = jwt.sign({ id: 'static-admin-id', email, role: 'admin' }, SECRET_KEY, { expiresIn: '24h' });
  const adminUser = {
    id: 'static-admin-id',
    email: STATIC_ADMIN.email,
    name: 'Admin',
    role: 'admin',
  };
  res.status(200).json({ user: adminUser, token });
});

router.post('/admin/logout', (req, res) => {
  res.status(200).json({ message: 'Admin logged out successfully' });
});

router.get('/admin/verify', verifyToken, adminSessionRequired, (req, res) => {
  res.status(200).json({ message: 'Admin session verified' });
});

router.get('/admin/users', verifyToken, adminSessionRequired, async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users.map(user => ({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      shippingAddress: user.shippingAddress,
      shippingAddressCollection: user.shippingAddressCollection,
    })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/admin/users', verifyToken, adminSessionRequired, async (req, res) => {
  const { email, password, name, role = 'user', shippingAddress } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      name,
      role,
      shippingAddress: shippingAddress || {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: '',
      },
      shippingAddressCollection: [],
    });
    const savedUser = await user.save();

    res.status(201).json({
      message: 'User created',
      id: savedUser._id.toString(),
      user: {
        id: savedUser._id.toString(),
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role,
        shippingAddress: savedUser.shippingAddress,
        shippingAddressCollection: savedUser.shippingAddressCollection,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/admin/users/:userId', verifyToken, adminSessionRequired, async (req, res) => {
  const { userId } = req.params;
  const { email, password, name, role, shippingAddress, shippingAddressCollection } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.email = email || user.email;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    user.name = name !== undefined ? name : user.name;
    user.role = role || user.role;
    if (shippingAddress) {
      user.shippingAddress = shippingAddress;
    }
    if (shippingAddressCollection) {
      user.shippingAddressCollection = shippingAddressCollection;
    }

    await user.save();
    res.status(200).json({
      message: 'User updated',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        shippingAddress: user.shippingAddress,
        shippingAddressCollection: user.shippingAddressCollection,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/admin/users/:userId', verifyToken, adminSessionRequired, async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// User Routes
router.post('/register', async (req, res) => {
  const { email, name, shippingAddress } = req.body;

  if (!email || !name || !shippingAddress) {
    return res.status(400).json({ message: 'Missing email, name, or shipping address' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const user = new User({
      email,
      password: hashedPassword,
      name,
      shippingAddress,
      shippingAddressCollection: [],
      role: 'user',
    });
    const savedUser = await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Temporary Password for LuxeLane',
      text: `Your temporary password is: ${temporaryPassword}. Please log in with this password.`,
    });

    const token = jwt.sign(
      { id: savedUser._id.toString(), email, role: 'user' },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful. A temporary password has been sent to your email.',
      user: {
        id: savedUser._id.toString(),
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role,
        shippingAddress: savedUser.shippingAddress,
        shippingAddressCollection: savedUser.shippingAddressCollection,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});




router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id.toString(), email, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
    res.status(200).json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        shippingAddress: user.shippingAddress,
        shippingAddressCollection: user.shippingAddressCollection,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  res.status(200).json({ message: 'User logged out successfully' });
});

router.post('/media-login', async (req, res) => {
  const { email } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, password: null, role: 'user' });
      await user.save();
    }

    const token = jwt.sign({ id: user._id.toString(), email, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
    res.status(200).json({
      message: 'Media login successful',
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        shippingAddress: user.shippingAddress,
        shippingAddressCollection: user.shippingAddressCollection,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/session', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(200).json({
        user: {
          id: req.user.id,
          email: req.user.email,
          name: 'Admin',
          role: 'admin',
        },
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    return res.status(200).json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        shippingAddress: user.shippingAddress,
        shippingAddressCollection: user.shippingAddressCollection,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Updated route for users to update their own profile
router.put('/profile', verifyToken, userSessionRequired, async (req, res) => {
  const { name, shippingAddressCollection, oldPassword, newPassword, confirmPassword } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update name if provided
    if (name !== undefined) {
      user.name = name;
    }

    // Handle shipping address collection (append new addresses and remove duplicates)
    if (shippingAddressCollection && Array.isArray(shippingAddressCollection)) {
      const uniqueAddresses = shippingAddressCollection.filter(newAddr =>
        !user.shippingAddressCollection.some(existingAddr =>
          existingAddr.street === newAddr.street &&
          existingAddr.city === newAddr.city &&
          existingAddr.state === newAddr.state &&
          existingAddr.zip === newAddr.zip &&
          existingAddr.country === newAddr.country
        )
      );
      if (uniqueAddresses.length > 0) {
        user.shippingAddressCollection = [...user.shippingAddressCollection, ...uniqueAddresses];
      }
    }

    // Handle password change
    if (oldPassword && newPassword && confirmPassword) {
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Old password is incorrect' });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'New password and confirmation do not match' });
      }
      if (newPassword === oldPassword) {
        return res.status(400).json({ message: 'New password cannot be the same as the old password' });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    } else if ((oldPassword || newPassword || confirmPassword) && !(oldPassword && newPassword && confirmPassword)) {
      return res.status(400).json({ message: 'All password fields (old, new, and confirm) are required for password change' });
    }

    await user.save();
    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        shippingAddress: user.shippingAddress,
        shippingAddressCollection: user.shippingAddressCollection,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

module.exports = router;
