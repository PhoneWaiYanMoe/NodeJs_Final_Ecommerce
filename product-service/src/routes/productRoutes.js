import express from 'express';
import { authenticateAdmin } from '../middleware/auth.js'; // Import the middleware
import {
<<<<<<< Updated upstream
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
=======
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
>>>>>>> Stashed changes
} from '../controllers/productController.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/best-sellers', getBestSellers);
router.get('/:id', getProductById);
<<<<<<< Updated upstream
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
=======
router.get('/:id/reviews', getReviews);
router.post('/:id/review', addReview);
router.post('/update-stock', updateStock);

// Admin-only routes (protected with authenticateAdmin)
router.post('/', authenticateAdmin, createProduct);
router.put('/:id', authenticateAdmin, updateProduct);
router.delete('/:id', authenticateAdmin, deleteProduct);
router.post('/:id/inventory', authenticateAdmin, updateInventory);

>>>>>>> Stashed changes
export default router;