const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

const SECRET_KEY = process.env.JWT_SECRET || 'your-jwt-secret-key';

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
    password: 'admin123'
};

// ======================
// Admin Routes
// ======================

// Static Admin Login
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
        role: 'admin'
    };
    res.status(200).json({ user: adminUser, token });
});

// Admin Logout (client-side only, stateless)
router.post('/admin/logout', (req, res) => {
    res.status(200).json({ message: 'Admin logged out successfully' });
});

// Admin: Verify token
router.get('/admin/verify', verifyToken, adminSessionRequired, (req, res) => {
    res.status(200).json({ message: 'Admin session verified' });
});

// Admin: Get all users
router.get('/admin/users', verifyToken, adminSessionRequired, async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users.map(user => ({
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role
        })));
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Create user
router.post('/admin/users', verifyToken, adminSessionRequired, async (req, res) => {
    const { email, password, name, role = 'user' } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Missing email or password' });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword, name, role });
        const savedUser = await user.save();

        res.status(201).json({ message: 'User created', id: savedUser._id.toString() });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Update user
router.put('/admin/users/:userId', verifyToken, adminSessionRequired, async (req, res) => {
    const { userId } = req.params;
    const { email, password, name, role } = req.body;

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

        await user.save();
        res.status(200).json({ message: 'User updated' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Delete user
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

// ======================
// User Routes
// ======================

// Register
router.post('/register', async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Missing email or password' });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword, name, role: 'user' });
        const savedUser = await user.save();

        const token = jwt.sign({ id: savedUser._id.toString(), email, role: 'user' }, SECRET_KEY, { expiresIn: '24h' });
        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: savedUser._id.toString(),
                email: savedUser.email,
                name: savedUser.name,
                role: savedUser.role
            },
            token
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
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
                role: user.role
            },
            token
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Logout (client-side only, stateless)
router.post('/logout', (req, res) => {
    res.status(200).json({ message: 'User logged out successfully' });
});

// Media Login (simulated OAuth)
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
                role: user.role
            },
            token
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Check Session (Verify Token)
router.get('/session', verifyToken, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            return res.status(200).json({
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    name: 'Admin',
                    role: 'admin'
                }
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
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
