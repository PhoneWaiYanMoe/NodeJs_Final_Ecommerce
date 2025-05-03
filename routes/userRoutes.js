const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const {
    adminSessionRequired,
    userSessionRequired,
    STATIC_ADMIN
} = require('../middleware/auth');

// ======================
// Admin Routes
// ======================

// Static Admin Login
router.post('/admin/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Missing email or password' });
    }

    if (email !== STATIC_ADMIN.email || password !== STATIC_ADMIN.password) {
        return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    req.session.adminEmail = email;
    const adminUser = {
        id: 'static-admin-id',
        email: STATIC_ADMIN.email,
        name: 'Admin',
        role: 'admin'
    };
    res.status(200).json({ user: adminUser });
});

// Admin Logout
router.post('/admin/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed', error: err.message });
        }
        res.status(200).json({ message: 'Admin logged out successfully' });
    });
});

// Admin: Verify session
router.get('/admin/verify', adminSessionRequired, (req, res) => {
    res.status(200).json({ message: 'Admin session verified' });
});

// Admin: Get all users
router.get('/admin/users', adminSessionRequired, async (req, res) => {
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
router.post('/admin/users', adminSessionRequired, async (req, res) => {
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
router.put('/admin/users/:userId', adminSessionRequired, async (req, res) => {
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
router.delete('/admin/users/:userId', adminSessionRequired, async (req, res) => {
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

        req.session.userId = savedUser._id.toString();
        res.status(201).json({ 
            message: 'Registration successful',
            user: {
                id: savedUser._id.toString(),
                email: savedUser.email,
                name: savedUser.name,
                role: savedUser.role
            }
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

        req.session.userId = user._id.toString();
        res.status(200).json({
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

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed', error: err.message });
        }
        res.status(200).json({ message: 'User logged out successfully' });
    });
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

        req.session.userId = user._id.toString();
        res.status(200).json({ 
            message: 'Media login successful',
            user: {
                id: user._id.toString(),
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Check Session
router.get('/session', async (req, res) => {
    try {
        if (req.session.adminEmail) {
            return res.status(200).json({
                user: {
                    id: 'static-admin-id',
                    email: STATIC_ADMIN.email,
                    name: 'Admin',
                    role: 'admin'
                }
            });
        }

        if (req.session.userId) {
            const user = await User.findById(req.session.userId);
            if (!user) {
                req.session.destroy(err => {
                    if (err) console.error('Session destroy error:', err);
                });
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
        }

        res.status(401).json({ message: 'Not authenticated' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
