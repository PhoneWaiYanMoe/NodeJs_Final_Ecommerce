// CartAndCheckout/models/DiscountCode.js
const mongoose = require('mongoose');

const discountCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discountPercentage: { type: Number, required: true },
  usageLimit: { type: Number, required: true },
  timesUsed: { type: Number, default: 0 },
});

module.exports = mongoose.model('DiscountCode', discountCodeSchema);