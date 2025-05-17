import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    image: { type: String },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Category', categorySchema); 