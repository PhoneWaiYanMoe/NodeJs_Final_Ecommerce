import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import Product from './src/models/productModel.js';

const migrate = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Fetch all products
        const products = await Product.find();

        for (const product of products) {
            // 1. Rename image to images
            if (product.image) {
                product.images = [product.image];
                product.image = undefined;
            } else if (!product.images || product.images.length === 0) {
                product.images = ['https://via.placeholder.com/150']; // Default image if none exists
            }

            // 2. Remove top-level stock (since we're using variants.stock)
            product.stock = undefined;

            // 3. Add missing fields
            if (!product.brand) {
                product.brand = 'Unknown'; // Default brand
            }
            if (!product.tags) {
                product.tags = [];
            }
            if (!product.salesCount) {
                product.salesCount = 0;
            }
            if (!product.createdAt) {
                product.createdAt = new Date();
            }

            // 4. Calculate averageRating
            if (product.reviews && product.reviews.length > 0) {
                const totalRating = product.reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
                const ratedReviews = product.reviews.filter(review => review.rating).length;
                product.averageRating = ratedReviews > 0 ? totalRating / ratedReviews : 0;
            } else {
                product.averageRating = 0;
            }

            // 5. Ensure variants match the schema
            if (!product.variants || product.variants.length === 0) {
                product.variants = [
                    { name: 'Default', stock: 10, price: product.price || 1000 }
                ];
            } else {
                product.variants = product.variants.map(variant => ({
                    name: variant.name || 'Default',
                    stock: variant.stock || 0,
                    price: variant.price || product.price || 1000
                }));
            }

            // Remove top-level price if it exists
            product.price = undefined;

            // Save the updated product
            await product.save();
        }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();