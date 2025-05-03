// CartAndCheckout/models/Order.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  userId: { type: String, default: null },
  sessionId: { type: String, default: null },
  totalPrice: { type: Number, required: true },
  taxes: { type: Number, required: true },
  shippingFee: { type: Number, required: true },
  discountApplied: { type: Number, default: 0 },
  status: { type: String, default: 'completed' },
  shippingAddress: { type: String, required: true },
  paymentDetails: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);