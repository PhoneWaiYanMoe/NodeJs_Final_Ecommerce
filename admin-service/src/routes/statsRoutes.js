const express = require('express');
const router = express.Router();

// Get dashboard stats
router.get('/dashboard', (req, res) => {
    res.json({ message: 'Get dashboard statistics endpoint' });
});

// Get sales stats
router.get('/sales', (req, res) => {
    res.json({ message: 'Get sales statistics endpoint' });
});

// Get user stats
router.get('/users', (req, res) => {
    res.json({ message: 'Get user statistics endpoint' });
});

module.exports = router;