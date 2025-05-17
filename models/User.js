const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
<<<<<<< HEAD
  password: { type: String }, // Optional for social login users
  name: { type: String, required: true },
  role: { type: String, default: 'user' },
  points: { type: Number, default: 0 }, // Adding points field
  googleId: { type: String, unique: true, sparse: true }, // For Google login
  facebookId: { type: String, unique: true, sparse: true }, // For future Facebook login
  profilePicture: { type: String }, // Profile picture URL from social login
=======
  password: { type: String }, // Optional initially
  name: { type: String, required: true },
  points: { type: Number, default: 0 }, // Adding points field
  role: { type: String, default: 'user' }, // user or admin
>>>>>>> origin/CartAndCheckout
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true },
  },
<<<<<<< HEAD
  shippingAddressCollection: [{
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true },
  }],
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  loginMethod: { type: String, enum: ['password', 'google', 'facebook'], default: 'password' }
=======
  createdAt: { type: Date, default: Date.now },
>>>>>>> origin/CartAndCheckout
});

module.exports = mongoose.model('User', userSchema);
