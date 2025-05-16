const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pointsTransactionSchema = new Schema({
  userId: { type: String, required: true, index: true },
  orderId: { type: String, index: true }, // Optional - linked to order if applicable
  points: { type: Number, required: true }, // Positive for earned, negative for spent
  reason: { type: String, required: true }, // e.g., "Order purchase", "Order refund", "Manual adjustment"
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PointsTransaction', pointsTransactionSchema);
