// src/controllers/loyaltyController.js
const { LoyaltyProgram, LoyaltySettings } = require('../models/loyaltyModel');

// @desc    Get loyalty program settings
// @route   GET /api/loyalty/settings
// @access  Private/Admin
const getLoyaltySettings = async (req, res) => {
  try {
    const settings = await LoyaltySettings.getSettings();
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update loyalty program settings
// @route   PUT /api/loyalty/settings
// @access  Private/Admin
const updateLoyaltySettings = async (req, res) => {
  try {
    const settings = await LoyaltySettings.findOne();
    
    if (settings) {
      settings.pointsPerDollar = req.body.pointsPerDollar !== undefined ? req.body.pointsPerDollar : settings.pointsPerDollar;
      settings.pointsExpiration = req.body.pointsExpiration !== undefined ? req.body.pointsExpiration : settings.pointsExpiration;
      settings.isActive = req.body.isActive !== undefined ? req.body.isActive : settings.isActive;
      
      if (req.body.tiers && Array.isArray(req.body.tiers)) {
        settings.tiers = req.body.tiers;
      }
      
      const updatedSettings = await settings.save();
      res.json(updatedSettings);
    } else {
      // Create new settings if none exist
      const newSettings = await LoyaltySettings.create({
        pointsPerDollar: req.body.pointsPerDollar || 1,
        pointsExpiration: req.body.pointsExpiration || 365,
        tiers: req.body.tiers || [
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
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      });
      
      res.status(201).json(newSettings);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get user loyalty program
// @route   GET /api/loyalty/user/:userId
// @access  Private
const getUserLoyalty = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    let userLoyalty = await LoyaltyProgram.findOne({ userId });
    
    if (!userLoyalty) {
      // Create new loyalty program for user
      userLoyalty = await LoyaltyProgram.create({
        userId,
        points: 0,
        totalSpent: 0,
        currentTier: 'Bronze',
      });
    }
    
    // Get current tier details
    const settings = await LoyaltySettings.getSettings();
    const currentTierDetails = settings.tiers.find(tier => tier.name === userLoyalty.currentTier);
    
    // Get next tier if not already at highest
    const sortedTiers = [...settings.tiers].sort((a, b) => a.minPoints - b.minPoints);
    const currentTierIndex = sortedTiers.findIndex(tier => tier.name === userLoyalty.currentTier);
    const nextTier = currentTierIndex < sortedTiers.length - 1 ? sortedTiers[currentTierIndex + 1] : null;
    
    // Calculate points to next tier
    const pointsToNextTier = nextTier ? nextTier.minPoints - userLoyalty.points : 0;
    
    res.json({
      userId: userLoyalty.userId,
      points: userLoyalty.points,
      totalSpent: userLoyalty.totalSpent,
      currentTier: userLoyalty.currentTier,
      currentTierDetails,
      nextTier: nextTier ? {
        name: nextTier.name,
        minPoints: nextTier.minPoints,
        discountPercentage: nextTier.discountPercentage,
        pointsNeeded: pointsToNextTier,
        benefits: nextTier.benefits,
      } : null,
      pointsHistory: userLoyalty.pointsHistory,
      rewardsRedeemed: userLoyalty.rewardsRedeemed,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Add points to user's loyalty program
// @route   POST /api/loyalty/points/add
// @access  Private
const addLoyaltyPoints = async (req, res) => {
  try {
    const { userId, amount, orderId, reason } = req.body;
    
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'User ID and positive amount are required' });
    }
    
    // Get settings to calculate points
    const settings = await LoyaltySettings.getSettings();
    
    if (!settings.isActive) {
      return res.status(400).json({ message: 'Loyalty program is currently inactive' });
    }
    
    // Calculate points to add if amount is in dollars
    const pointsToAdd = Math.round(amount * settings.pointsPerDollar);
    
    // Find or create user loyalty program
    let userLoyalty = await LoyaltyProgram.findOne({ userId });
    
    if (!userLoyalty) {
      userLoyalty = await LoyaltyProgram.create({
        userId,
        points: 0,
        totalSpent: 0,
        currentTier: 'Bronze',
      });
    }
    
    // Add points and update total spent
    userLoyalty.points += pointsToAdd;
    userLoyalty.totalSpent += amount;
    
    // Add to points history
    userLoyalty.pointsHistory.push({
      points: pointsToAdd,
      reason: reason || 'Purchase',
      date: new Date(),
      orderId,
    });
    
    // Check if user should be upgraded to a new tier
    const eligibleTiers = settings.tiers.filter(tier => userLoyalty.points >= tier.minPoints);
    const highestEligibleTier = eligibleTiers.reduce((prev, current) => {
      return (prev.minPoints > current.minPoints) ? prev : current;
    }, { name: 'Bronze', minPoints: 0 });
    
    userLoyalty.currentTier = highestEligibleTier.name;
    
    const updatedLoyalty = await userLoyalty.save();
    
    res.json({
      userId: updatedLoyalty.userId,
      pointsAdded: pointsToAdd,
      newPointsTotal: updatedLoyalty.points,
      currentTier: updatedLoyalty.currentTier,
      tierDiscountPercentage: highestEligibleTier.discountPercentage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Redeem points for a reward
// @route   POST /api/loyalty/points/redeem
// @access  Private
const redeemLoyaltyPoints = async (req, res) => {
  try {
    const { userId, points, rewardId, rewardName } = req.body;
    
    if (!userId || !points || points <= 0 || !rewardId) {
      return res.status(400).json({ message: 'User ID, positive points amount, and reward ID are required' });
    }
    
    // Get user loyalty program
    const userLoyalty = await LoyaltyProgram.findOne({ userId });
    
    if (!userLoyalty) {
      return res.status(404).json({ message: 'User loyalty program not found' });
    }
    
    // Check if user has enough points
    if (userLoyalty.points < points) {
      return res.status(400).json({ 
        message: 'Insufficient points', 
        available: userLoyalty.points,
        requested: points 
      });
    }
    
    // Deduct points
    userLoyalty.points -= points;
    
    // Add to rewards redeemed
    userLoyalty.rewardsRedeemed.push({
      rewardId,
      points,
      date: new Date(),
    });
    
    // Check if tier should be downgraded
    const settings = await LoyaltySettings.getSettings();
    const eligibleTiers = settings.tiers.filter(tier => userLoyalty.points >= tier.minPoints);
    const highestEligibleTier = eligibleTiers.reduce((prev, current) => {
      return (prev.minPoints > current.minPoints) ? prev : current;
    }, { name: 'Bronze', minPoints: 0 });
    
    userLoyalty.currentTier = highestEligibleTier.name;
    
    const updatedLoyalty = await userLoyalty.save();
    
    res.json({
      userId: updatedLoyalty.userId,
      pointsRedeemed: points,
      newPointsTotal: updatedLoyalty.points,
      currentTier: updatedLoyalty.currentTier,
      rewardId,
      rewardName,
      date: new Date(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all user loyalty programs (for admin)
// @route   GET /api/loyalty/users
// @access  Private/Admin
const getAllUserLoyalty = async (req, res) => {
  try {
    const userLoyalty = await LoyaltyProgram.find({}).sort({ points: -1 });
    res.json(userLoyalty);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get user's discount based on loyalty tier
// @route   GET /api/loyalty/discount/:userId
// @access  Private
const getLoyaltyDiscount = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Get user loyalty program
    const userLoyalty = await LoyaltyProgram.findOne({ userId });
    
    if (!userLoyalty) {
      return res.status(404).json({ message: 'User loyalty program not found' });
    }
    
    // Get settings to determine discount
    const settings = await LoyaltySettings.getSettings();
    
    if (!settings.isActive) {
      return res.status(400).json({ message: 'Loyalty program is currently inactive' });
    }
    
    // Get current tier details
    const currentTierDetails = settings.tiers.find(tier => tier.name === userLoyalty.currentTier);
    
    if (!currentTierDetails) {
      return res.status(400).json({ message: 'Invalid tier' });
    }
    
    res.json({
      userId,
      currentTier: userLoyalty.currentTier,
      discountPercentage: currentTierDetails.discountPercentage,
      benefits: currentTierDetails.benefits,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getLoyaltySettings,
  updateLoyaltySettings,
  getUserLoyalty,
  addLoyaltyPoints,
  redeemLoyaltyPoints,
  getAllUserLoyalty,
  getLoyaltyDiscount,
};