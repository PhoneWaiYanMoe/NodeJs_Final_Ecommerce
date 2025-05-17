
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartItemSchema = new Schema({
  userId: { type: String, default: null }, // For logged-in users
  sessionId: { type: String, default: null }, // For guest users
  productId: { type: Schema.Types.ObjectId, required: true }, // MongoDB ObjectID
  variantName: { type: String, required: true }, // Changed default: null to required: true
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true },
});

module.exports = mongoose.model('CartItem', cartItemSchema);
