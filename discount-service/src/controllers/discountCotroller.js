// src/controllers/discountController.js
const Discount = require('../models/discountModel');

// @desc    Create a new discount code
// @route   POST /api/discounts
// @access  Private/Admin
const createDiscount = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      startDate,
      endDate,
      usageLimit,
      productCategories,
      specificProducts,
      excludedProducts,
      userGroups,
      specificUsers,
      firstTimeOnly,
    } = req.body;

    // Check if code already exists
    const discountExists = await Discount.findOne({ code });
    if (discountExists) {
      return res.status(400).json({ message: 'Discount code already exists' });
    }

    // Create discount
    const discount = await Discount.create({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minPurchaseAmount: minPurchaseAmount || 0,
      maxDiscountAmount: maxDiscountAmount || null,
      startDate: startDate || new Date(),
      endDate,
      usageLimit: usageLimit || null,
      productCategories: productCategories || [],
      specificProducts: specificProducts || [],
      excludedProducts: excludedProducts || [],
      userGroups: userGroups || [],
      specificUsers: specificUsers || [],
      firstTimeOnly: firstTimeOnly || false,
    });

    res.status(201).json(discount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all discounts
// @route   GET /api/discounts
// @access  Private/Admin
const getDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find({});
    res.json(discounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get discount by ID
// @route   GET /api/discounts/:id
// @access  Private/Admin
const getDiscountById = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (discount) {
      res.json(discount);
    } else {
      res.status(404).json({ message: 'Discount not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update discount
// @route   PUT /api/discounts/:id
// @access  Private/Admin
const updateDiscount = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);

    if (discount) {
      discount.code = req.body.code ? req.body.code.toUpperCase() : discount.code;
      discount.description = req.body.description || discount.description;
      discount.discountType = req.body.discountType || discount.discountType;
      discount.discountValue = req.body.discountValue !== undefined ? req.body.discountValue : discount.discountValue;
      discount.minPurchaseAmount = req.body.minPurchaseAmount !== undefined ? req.body.minPurchaseAmount : discount.minPurchaseAmount;
      discount.maxDiscountAmount = req.body.maxDiscountAmount !== undefined ? req.body.maxDiscountAmount : discount.maxDiscountAmount;
      discount.startDate = req.body.startDate || discount.startDate;
      discount.endDate = req.body.endDate || discount.endDate;
      discount.isActive = req.body.isActive !== undefined ? req.body.isActive : discount.isActive;
      discount.usageLimit = req.body.usageLimit !== undefined ? req.body.usageLimit : discount.usageLimit;
      discount.productCategories = req.body.productCategories || discount.productCategories;
      discount.specificProducts = req.body.specificProducts || discount.specificProducts;
      discount.excludedProducts = req.body.excludedProducts || discount.excludedProducts;
      discount.userGroups = req.body.userGroups || discount.userGroups;
      discount.specificUsers = req.body.specificUsers || discount.specificUsers;
      discount.firstTimeOnly = req.body.firstTimeOnly !== undefined ? req.body.firstTimeOnly : discount.firstTimeOnly;

      const updatedDiscount = await discount.save();
      res.json(updatedDiscount);
    } else {
      res.status(404).json({ message: 'Discount not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete discount
// @route   DELETE /api/discounts/:id
// @access  Private/Admin
const deleteDiscount = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);

    if (discount) {
      await discount.deleteOne();
      res.json({ message: 'Discount removed' });
    } else {
      res.status(404).json({ message: 'Discount not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Validate discount code
// @route   POST /api/discounts/validate
// @access  Public
const validateDiscount = async (req, res) => {
  try {
    const { code, orderAmount, products = [], userId } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Discount code is required' });
    }

    // Find discount code
    const discount = await Discount.findOne({ code: code.toUpperCase() });

    if (!discount) {
      return res.status(404).json({ message: 'Discount code not found' });
    }

    // Check if discount is valid
    if (!discount.isValid()) {
      if (new Date() < discount.startDate) {
        return res.status(400).json({ message: 'Discount code is not active yet' });
      }
      if (new Date() > discount.endDate) {
        return res.status(400).json({ message: 'Discount code has expired' });
      }
      if (!discount.isActive) {
        return res.status(400).json({ message: 'Discount code is inactive' });
      }
      if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) {
        return res.status(400).json({ message: 'Discount code usage limit reached' });
      }

      return res.status(400).json({ message: 'Discount code is invalid' });
    }

    // Check minimum purchase amount
    if (orderAmount < discount.minPurchaseAmount) {
      return res.status(400).json({
        message: `Minimum purchase amount of $${discount.minPurchaseAmount} required for this discount`,
        minPurchaseAmount: discount.minPurchaseAmount,
      });
    }

    // Check user restrictions if userId is provided
    if (userId && discount.specificUsers.length > 0) {
      if (!discount.specificUsers.includes(userId)) {
        return res.status(400).json({ message: 'Discount code is not valid for this user' });
      }
    }

    // Check product restrictions if products are provided
    if (products.length > 0 && discount.specificProducts.length > 0) {
      const productIds = products.map(p => p.id);
      const validProducts = productIds.filter(id => discount.specificProducts.includes(id));
      
      if (validProducts.length === 0) {
        return res.status(400).json({ message: 'Discount code is not valid for these products' });
      }
    }

    // Calculate discount amount
    const discountAmount = discount.calculateDiscount(orderAmount, products, userId);

    // Return discount details
    res.json({
      isValid: true,
      discountCode: discount.code,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      discountAmount: discountAmount,
      minPurchaseAmount: discount.minPurchaseAmount,
      maxDiscountAmount: discount.maxDiscountAmount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Apply discount and increment usage count
// @route   POST /api/discounts/apply
// @access  Public
const applyDiscount = async (req, res) => {
  try {
    const { code, orderAmount, orderId, products = [], userId } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Discount code is required' });
    }

    // Find discount code
    const discount = await Discount.findOne({ code: code.toUpperCase() });

    if (!discount) {
      return res.status(404).json({ message: 'Discount code not found' });
    }

    // Check if discount is valid
    if (!discount.isValid()) {
      return res.status(400).json({ message: 'Discount code is invalid' });
    }

    // Calculate discount amount
    const discountAmount = discount.calculateDiscount(orderAmount, products, userId);

    if (discountAmount <= 0) {
      return res.status(400).json({ message: 'No discount applicable' });
    }

    // Increment usage count
    discount.usageCount += 1;
    await discount.save();

    // Return applied discount
    res.json({
      discountCode: discount.code,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      discountAmount: discountAmount,
      orderId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Generate a bulk of random discount codes
// @route   POST /api/discounts/generate-bulk
// @access  Private/Admin
const generateBulkDiscounts = async (req, res) => {
  try {
    const {
      prefix,
      count,
      discountType,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      startDate,
      endDate,
      usageLimit,
      description,
    } = req.body;

    if (!prefix || !count || count <= 0 || count > 100) {
      return res.status(400).json({ 
        message: 'Invalid parameters. Prefix is required and count must be between 1 and 100.' 
      });
    }

    const generatedCodes = [];
    const errors = [];

    // Generate random codes
    for (let i = 0; i < count; i++) {
      // Create a unique code with prefix and random alphanumeric characters
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `${prefix}${randomPart}`;
      
      try {
        // Create discount
        const discount = await Discount.create({
          code,
          description: description || `Generated discount code ${code}`,
          discountType: discountType || 'percentage',
          discountValue: discountValue || 10,
          minPurchaseAmount: minPurchaseAmount || 0,
          maxDiscountAmount: maxDiscountAmount || null,
          startDate: startDate || new Date(),
          endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
          usageLimit: usageLimit || 1, // Default single use
        });
        
        generatedCodes.push(discount);
      } catch (error) {
        errors.push({ code, error: error.message });
      }
    }

    res.status(201).json({
      generatedCount: generatedCodes.length,
      errorCount: errors.length,
      generatedCodes,
      errors,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  createDiscount,
  getDiscounts,
  getDiscountById,
  updateDiscount,
  deleteDiscount,
  validateDiscount,
  applyDiscount,
  generateBulkDiscounts,
};