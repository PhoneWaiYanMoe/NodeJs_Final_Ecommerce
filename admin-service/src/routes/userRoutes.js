const express = require('express');
const router = express.Router();

// Get all users
router.get('/', (req, res) => {
    res.json({ message: 'Get all users endpoint' });
});

// Get user by ID
router.get('/:id', (req, res) => {
    res.json({ message: 'Get user by ID endpoint' });
});

// Update user
router.put('/:id', (req, res) => {
    res.json({ message: 'Update user endpoint' });
});

// Delete user
router.delete('/:id', (req, res) => {
    res.json({ message: 'Delete user endpoint' });
});

module.exports = router;