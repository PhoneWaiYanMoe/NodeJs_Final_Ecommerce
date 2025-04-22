const express = require('express');
const router = express.Router();

// Get all discounts
router.get('/', (req, res) => {
    res.json({ message: 'Get all discounts endpoint' });
});

// Get discount by ID
router.get('/:id', (req, res) => {
    res.json({ message: 'Get discount by ID endpoint' });
});

// Create new discount
router.post('/', (req, res) => {
    res.json({ message: 'Create discount endpoint' });
});

// Update discount
router.put('/:id', (req, res) => {
    res.json({ message: 'Update discount endpoint' });
});

// Delete discount
router.delete('/:id', (req, res) => {
    res.json({ message: 'Delete discount endpoint' });
});

module.exports = router;