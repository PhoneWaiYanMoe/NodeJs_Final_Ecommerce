import express from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { createCategory, getCategories, deleteCategory } from '../controllers/categoryController.js';

const router = express.Router();

// Public endpoint
router.get('/', getCategories);

// Admin-only endpoints
router.post('/', authenticateAdmin, createCategory);
router.delete('/:id', authenticateAdmin, deleteCategory);

export default router;