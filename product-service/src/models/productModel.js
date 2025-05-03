import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    userId: { type: String, default: null },
    userName: { type: String, default: 'Anonymous' },
    comment: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, default: null },
    createdAt: { type: Date, default: Date.now }
});

const variantSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "Color: Black"
    stock: { type: Number, required: true },
    price: { type: Number, required: true }
});

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: { type: String, required: true },
    description: { type: String, required: true },
    images: [{ type: String, required: true }], // Use "images" (plural), require at least 1 for now
    variants: { type: [variantSchema], required: true }, // Require variants
    category: { type: String, required: true },
    tags: [{ type: String }],
    reviews: [reviewSchema],
    averageRating: { type: Number, default: 0 }, // Add averageRating
    salesCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now } // Add createdAt
});

export default mongoose.model('Product', productSchema);