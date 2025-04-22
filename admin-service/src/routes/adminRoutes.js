const express = require('express');
const router = express.Router();

// Admin routes
router.get('/', (req, res) => {
    res.json({ message: 'Admin routes working' });
});

// Add admin
router.post('/', (req, res) => {
    res.json({ message: 'Create admin endpoint' });
});

// Update admin
router.put('/:id', (req, res) => {
    res.json({ message: 'Update admin endpoint' });
});

// Delete admin
router.delete('/:id', (req, res) => {
    res.json({ message: 'Delete admin endpoint' });
});

module.exports = router;