// src/models/userModel.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    registeredDate: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
    },
    // This is a simplified model for admin management purposes
    // In a real implementation, you'd likely fetch this data from a user service
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;