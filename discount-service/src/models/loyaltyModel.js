// src/models/loyaltyModel.js
const mongoose = require('mongoose');

const loyaltyTierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  minPoints: {
    type: Number,
    required: true,
  },
  discountPercentage: {
    type: Number,
    required: true,
  },
  benefits: [
    {
      type: String,
    },
  ],
});

const loyaltyProgramSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    points: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    currentTier: {
      type: String,
      default: 'Bronze',
    },
    pointsHistory: [
      {
        points: {
          type: Number,
          required: true,
        },
        reason: {
          type: String,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        orderId: {
          type: String,
        },
      },
    ],
    rewardsRedeemed: [
      {
        rewardId: {
          type: String,
        },
        points: {
          type: Number,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const loyaltySettingsSchema = new mongoose.Schema(
  {
    pointsPerDollar: {
      type: Number,
      default: 1,
    },
    pointsExpiration: {
      type: Number,
      default: 365, // days
    },
    tiers: [loyaltyTierSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure single document for settings
loyaltySettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    // Create default settings if none exist
    settings = await this.create({
      pointsPerDollar: 1,
      pointsExpiration: 365,
      tiers: [
        {
          name: 'Bronze',
          minPoints: 0,
          discountPercentage: 0,
          benefits: ['Welcome Gift'],
        },
        {
          name: 'Silver',
          minPoints: 1000,
          discountPercentage: 5,
          benefits: ['Welcome Gift', 'Free Shipping'],
        },
        {
          name: 'Gold',
          minPoints: 5000,
          discountPercentage: 10,
          benefits: ['Welcome Gift', 'Free Shipping', 'Priority Support'],
        },
        {
          name: 'Platinum',
          minPoints: 10000,
          discountPercentage: 15,
          benefits: [
            'Welcome Gift',
            'Free Shipping',
            'Priority Support',
            'Exclusive Offers',
          ],
        },
      ],
    });
  }
  return settings;
};

const LoyaltyProgram = mongoose.model('LoyaltyProgram', loyaltyProgramSchema);
const LoyaltySettings = mongoose.model('LoyaltySettings', loyaltySettingsSchema);

module.exports = { LoyaltyProgram, LoyaltySettings };