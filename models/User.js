const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Optional initially
  name: { type: String, required: true },
  points: { type: Number, default: 0 }, // Adding points field
  role: { type: String, default: 'user' }, // user or admin
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true },
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
