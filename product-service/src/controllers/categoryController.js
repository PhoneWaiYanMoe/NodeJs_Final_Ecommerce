import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';

// Add a new category (admin-only)
export const createCategory = async (req, res) => {
    const { name, description, image } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Category name is required' });
    }

    try {
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ message: 'Category already exists' });
        }

        const category = new Category({
            name,
            description,
            image
        });

        await category.save();
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: 'Error creating category', error: error.message });
    }
};

// Get all categories (public)
export const getCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching categories', error: error.message });
    }
};

// Delete a category and reassign products (admin-only)
export const deleteCategory = async (req, res) => {
    const { id } = req.params;
    const { reassignCategoryId } = req.body; // ID of the category to reassign products to

    try {
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // If reassignCategoryId is provided, ensure it exists
        let reassignCategory = null;
        if (reassignCategoryId) {
            reassignCategory = await Category.findById(reassignCategoryId);
            if (!reassignCategory) {
                return res.status(400).json({ message: 'Reassign category not found' });
            }
        }

        // Reassign products to the new category or set to null
        await Product.updateMany(
            { category: category.name },
            { category: reassignCategory ? reassignCategory.name : null }
        );

        // Delete the category
        await Category.findByIdAndDelete(id);
        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting category', error: error.message });
    }
};