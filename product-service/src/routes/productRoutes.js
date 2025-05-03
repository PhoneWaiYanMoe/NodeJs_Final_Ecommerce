import express from 'express';
import { authenticateAdmin } from '../middleware/auth.js'; // Import the middleware
import {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    addReview,
    getReviews,
    updateStock,
    getBestSellers,
    getCategories,
    updateInventory
} from '../controllers/productController.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/best-sellers', getBestSellers);
router.get('/:id', getProductById);
router.get('/:id/reviews', getReviews);
router.post('/:id/review', addReview);
router.post('/update-stock', updateStock);

// Admin-only routes (protected with authenticateAdmin)
router.post('/', authenticateAdmin, createProduct);
router.put('/:id', authenticateAdmin, updateProduct);
router.delete('/:id', authenticateAdmin, deleteProduct);
router.post('/:id/inventory', authenticateAdmin, updateInventory);

export default router;