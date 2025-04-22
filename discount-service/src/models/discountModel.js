// src/models/discountModel.js
const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    discountType: {
      type: String,
      required: true,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minPurchaseAmount: {
      type: Number,
      default: 0,
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageLimit: {
      type: Number,
      default: null, // null means unlimited
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    productCategories: [
      {
        type: String,
      },
    ],
    specificProducts: [
      {
        type: String, // product IDs
      },
    ],
    excludedProducts: [
      {
        type: String, // product IDs
      },
    ],
    userGroups: [
      {
        type: String, // user group IDs or names
      },
    ],
    specificUsers: [
      {
        type: String, // user IDs
      },
    ],
    firstTimeOnly: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Method to check if discount is valid
discountSchema.methods.isValid = function () {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.startDate &&
    now <= this.endDate &&
    (this.usageLimit === null || this.usageCount < this.usageLimit)
  );
};

// Method to calculate discount amount
discountSchema.methods.calculateDiscount = function (orderAmount, products = [], user = null) {
  // Check validity
  if (!this.isValid()) {
    return 0;
  }

  // Check minimum purchase amount
  if (orderAmount < this.minPurchaseAmount) {
    return 0;
  }

  // Calculate discount amount
  let discountAmount = 0;
  
  if (this.discountType === 'percentage') {
    discountAmount = (orderAmount * this.discountValue) / 100;
  } else {
    discountAmount = this.discountValue;
  }

  // Apply max discount limit if set
  if (this.maxDiscountAmount !== null && discountAmount > this.maxDiscountAmount) {
    discountAmount = this.maxDiscountAmount;
  }

  return discountAmount;
};

const Discount = mongoose.model('Discount', discountSchema);

module.exports = Discount;