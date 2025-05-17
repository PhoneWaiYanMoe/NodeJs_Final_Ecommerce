const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const CartItem = require('../models/CartItem');
const Order = require('../models/Order');
const DiscountCode = require('../models/DiscountCode');
const User = require('../models/User');
const PointsTransaction = require('../models/PointsTransaction');

// Constants
const TAX_RATE = 0.1; // 10% tax
const SHIPPING_FEE = 5.0;
const POINTS_RATE = 0.1; // 10% of purchase goes to points
const POINTS_VALUE = 0.01; // Each point is worth $0.01
const SECRET_KEY = process.env.JWT_SECRET || 'your-jwt-secret-key';

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to require admin role
const adminRequired = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Middleware to require user (no guest access)
const userRequired = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'User access required' });
  }
  next();
};

// Middleware that allows either a logged-in user or a guest session
const userOrGuestAllowed = (req, res, next) => {
  console.log('userOrGuestAllowed middleware called');
  
  // If there's a valid token, process it
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      req.user = decoded;
      console.log('User authenticated:', req.user.id);
      next();
    } catch (err) {
      console.log('Invalid token, treating as guest');
      handleGuestSession(req, res, next);
    }
  } else {
    console.log('No token, treating as guest');
    handleGuestSession(req, res, next);
  }
};

// Helper to get cart identifier (userId for logged-in users, sessionId for guests)
const getCartIdentifier = (req) => {
  if (req.user) {
    return { userId: req.user.id };
  } else {
    return { sessionId: req.sessionId };
  }
};

// Helper function to handle guest sessions
const handleGuestSession = (req, res, next) => {
  // Get sessionId from query params, body, or create a new one
  let sessionId = req.query.sessionId || req.body.sessionId;
  
  // If no sessionId provided, generate a new one
  if (!sessionId) {
    sessionId = uuidv4();
    console.log('Generated new sessionId:', sessionId);
  } else {
    console.log('Using provided sessionId:', sessionId);
  }
  
  // Store in request for use in route handlers
  req.sessionId = sessionId;
  next();
};

// Determine if a request is from a guest
const isGuest = (req) => {
  return !req.user;
};

// Add to Cart - Allow both logged-in users and guests
router.post('/add', userOrGuestAllowed, async (req, res) => {
  console.log("Cart Add Request Body:", req.body);
  const { product_id, variantName, quantity = 1, price } = req.body;

  if (!product_id || !price) {
    return res.status(400).json({ error: 'Missing product_id or price' });
  }

  if (!mongoose.Types.ObjectId.isValid(product_id)) {
    return res.status(400).json({ error: 'Invalid product_id format' });
  }

  try {
    const cartIdentifier = getCartIdentifier(req);
    
    // Log the variant name being processed
    console.log(`Processing cart add: Product ID: ${product_id}, Variant: ${variantName || 'Default'}`);
    
    // Find existing cart item with the same product and variant
    let cartItem = await CartItem.findOne({ 
      ...cartIdentifier, 
      productId: product_id, 
      variantName: variantName || 'Default' // Use Default as fallback
    });

    if (cartItem) {
      console.log(`Found existing cart item, updating quantity from ${cartItem.quantity} to ${cartItem.quantity + quantity}`);
      cartItem.quantity += quantity;
      await cartItem.save();
    } else {
      console.log(`Creating new cart item with variant: ${variantName || 'Default'}`);
      cartItem = new CartItem({
        ...cartIdentifier,
        productId: product_id,
        variantName: variantName || 'Default', // Ensure variantName is explicitly set
        quantity,
        price,
      });
      await cartItem.save();
    }

    // Return the sessionId for guest users to use in future requests
    const responseData = { 
      message: 'Item added to cart',
      cartItem: {
        id: cartItem._id,
        productId: cartItem.productId,
        variantName: cartItem.variantName,
        quantity: cartItem.quantity,
        price: cartItem.price
      }
    };
    
    if (!req.user) {
      responseData.sessionId = req.sessionId;
    }

    res.status(201).json(responseData);
  } catch (err) {
    console.error("Error adding item to cart:", err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Update Cart Item Quantity - Allow both logged-in users and guests
router.put('/update/:itemId', userOrGuestAllowed, async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity < 1) {
    return res.status(400).json({ error: 'Invalid quantity' });
  }

  try {
    const cartIdentifier = getCartIdentifier(req);
    const cartItem = await CartItem.findOne({ _id: itemId, ...cartIdentifier });

    if (!cartItem) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    res.status(200).json({ message: 'Cart updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove Item from Cart - Allow both logged-in users and guests
router.delete('/remove/:itemId', userOrGuestAllowed, async (req, res) => {
  const { itemId } = req.params;

  try {
    const cartIdentifier = getCartIdentifier(req);
    const cartItem = await CartItem.findOneAndDelete({ _id: itemId, ...cartIdentifier });

    if (!cartItem) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    res.status(200).json({ message: 'Item removed from cart' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cart Summary - Allow both logged-in users and guests
router.get('/summary', userOrGuestAllowed, async (req, res) => {
  try {
    console.log('DIRECT FIX: Cart summary request with query params:', req.query);
    
    const cartIdentifier = getCartIdentifier(req);
    const cartItems = await CartItem.find(cartIdentifier);

    if (!cartItems.length) {
      return res.status(200).json({ 
        message: 'Cart is empty',
        isGuest: !req.user // Add flag to indicate if user is guest
      });
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discountAmount = 0;
    let appliedDiscountCode = null;
    let discountPercentage = 0;
    let pointsApplied = 0;
    let pointsDiscountValue = 0;
    let availablePoints = 0;

    // Get discount code if provided
    const { discountCode } = req.query;
    if (discountCode) {
      const discount = await DiscountCode.findOne({ code: discountCode });
      if (discount && discount.timesUsed < discount.usageLimit) {
        discountAmount = (discount.discountPercentage / 100) * subtotal;
        appliedDiscountCode = discount.code;
        discountPercentage = discount.discountPercentage;
      }
    }

    // Get user points if logged in
    if (req.user) {
      const user = await User.findById(req.user.id);
      if (user) {
        availablePoints = user.points || 0;
        
        // IMPORTANT: Check for points application in database
        const pointsApplication = await mongoose.connection.collection('cartPointsApplications')
          .findOne({ userId: req.user.id });
        
        if (pointsApplication) {
          pointsApplied = pointsApplication.pointsApplied;
          pointsDiscountValue = pointsApplication.pointsDiscountValue;
          console.log(`Found applied points in database: ${pointsApplied} points (${pointsDiscountValue} value)`);
        }
      }
    }

    // Calculate totals with applied points
    const afterDiscounts = subtotal - discountAmount - pointsDiscountValue;
    const taxes = afterDiscounts * TAX_RATE;
    const total = afterDiscounts + taxes + SHIPPING_FEE;

    console.log('Cart summary calculation:', {
      subtotal,
      discountAmount,
      pointsApplied,
      pointsDiscountValue,
      afterDiscounts,
      taxes,
      total
    });

    res.status(200).json({
      items: cartItems.map(item => ({
        id: item._id.toString(),
        productId: item.productId.toString(),
        variantName: item.variantName || 'Default',
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: parseFloat(subtotal.toFixed(2)),
      discountApplied: parseFloat(discountAmount.toFixed(2)),
      discountCode: appliedDiscountCode,
      discountPercentage: discountPercentage,
      availablePoints: availablePoints,
      pointsApplied: pointsApplied,
      pointsDiscountValue: parseFloat(pointsDiscountValue.toFixed(2)),
      taxes: parseFloat(taxes.toFixed(2)),
      shippingFee: SHIPPING_FEE,
      total: parseFloat(total.toFixed(2)),
      isGuest: !req.user // Add flag to indicate if user is guest
    });
  } catch (err) {
    console.error("Error getting cart summary:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Apply Discount Code - Allow both logged-in users and guests
router.post('/apply-discount', userOrGuestAllowed, async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Discount code is required' });
  }

  try {
    const discount = await DiscountCode.findOne({ code });

    if (!discount) {
      return res.status(404).json({ error: 'Invalid discount code' });
    }

    if (discount.timesUsed >= discount.usageLimit) {
      return res.status(400).json({ error: 'Discount code usage limit reached' });
    }

    const cartIdentifier = getCartIdentifier(req);
    const cartItems = await CartItem.find(cartIdentifier);

    if (!cartItems.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    discount.timesUsed += 1;
    await discount.save();

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = (discount.discountPercentage / 100) * subtotal;
    const taxes = (subtotal - discountAmount) * TAX_RATE;
    const total = (subtotal - discountAmount) + taxes + SHIPPING_FEE;

    res.status(200).json({
      subtotal: parseFloat(subtotal.toFixed(2)),
      discountApplied: parseFloat(discountAmount.toFixed(2)),
      taxes: parseFloat(taxes.toFixed(2)),
      shippingFee: SHIPPING_FEE,
      total: parseFloat(total.toFixed(2)),
      discountCode: code,
      discountPercentage: discount.discountPercentage,
      isGuest: !req.user // Add flag to indicate if user is guest
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Checkout Process - Require user login
router.post('/checkout', [verifyToken, userRequired], async (req, res) => {
  const { paymentDetails, discountCode } = req.body;

  if (!paymentDetails) {
    return res.status(400).json({ error: 'Missing paymentDetails' });
  }

  try {
    console.log(`Checkout - User ID: ${req.user.id}, Discount Code: ${discountCode}`);

    // Get user data
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    
    const originalPoints = user.points || 0;
    console.log('User found with original points:', originalPoints);

    // Get applied points from the database
    let pointsUsed = 0;
    let pointsDiscountValue = 0;
    
    // Check if there's an existing points application record
    const pointsApplication = await mongoose.connection.collection('cartPointsApplications')
      .findOne({ userId: req.user.id });
    
    if (pointsApplication) {
      pointsUsed = pointsApplication.pointsApplied;
      pointsDiscountValue = pointsApplication.pointsDiscountValue;
      console.log(`Found applied points in database: ${pointsUsed} points (${pointsDiscountValue} value)`);
    }
    
    // Validate points
    if (pointsUsed > 0) {
      // Double-check that the user still has these points
      if (pointsUsed > originalPoints) {
        return res.status(400).json({ 
          error: `Not enough points available. You have ${originalPoints} points but trying to use ${pointsUsed}.` 
        });
      }
      console.log(`User is redeeming ${pointsUsed} points worth $${pointsDiscountValue.toFixed(2)}`);
    }

    const cartIdentifier = { userId: req.user.id };
    const cartItems = await CartItem.find(cartIdentifier);

    if (!cartItems.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const orderItems = cartItems.map(item => ({
      productId: item.productId,
      variantName: item.variantName || 'Default',
      quantity: item.quantity,
      price: item.price,
    }));

    // Calculate order totals
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    console.log('Calculated subtotal:', subtotal);
    
    // Apply discount code if provided
    let discountAmount = 0;
    let appliedDiscountCode = null;
    if (discountCode) {
      const discount = await DiscountCode.findOne({ code: discountCode });
      if (discount && discount.timesUsed < discount.usageLimit) {
        discountAmount = (discount.discountPercentage / 100) * subtotal;
        appliedDiscountCode = discount.code;
        discount.timesUsed += 1;
        await discount.save();
        console.log('Applied discount code:', discountCode, 'Amount:', discountAmount);
      }
    }
    
    // Calculate final totals WITH the points discount
    const afterDiscounts = subtotal - discountAmount - pointsDiscountValue;
    const taxes = afterDiscounts * TAX_RATE;
    const total = afterDiscounts + taxes + SHIPPING_FEE;
    
    console.log('Order totals:', {
      subtotal,
      discountAmount,
      pointsDiscountValue,
      afterDiscounts,
      taxes,
      total
    });

    // FIXED: Calculate points earned from this purchase (based on total BEFORE points discount)
    // This ensures users earn points on their actual spending, not after their own points discount
    const pointsEarned = Math.floor((subtotal - discountAmount) * POINTS_RATE);
    console.log('Points earned from purchase:', pointsEarned);
    
    // CRITICAL: Process points properly - first make a transaction to record history
    if (pointsUsed > 0) {
      // Record the points redemption transaction
      await recordPointsTransaction(
        req.user.id,
        -pointsUsed,
        'Points redeemed for purchase discount'
      );
    }
    
    // CRITICAL FIX: Update user points correctly
    // First subtract used points
    let updatedPoints = Math.max(0, originalPoints - pointsUsed);
    
    // Then add earned points
    updatedPoints += pointsEarned;
    
    // Record the points earned transaction
    if (pointsEarned > 0) {
      await recordPointsTransaction(
        req.user.id,
        pointsEarned,
        'Points earned from purchase'
      );
    }
    
    // Update user record with new points total
    user.points = updatedPoints;
    await user.save();
    
    console.log('Points update summary:', {
      originalPoints,
      pointsUsed,
      pointsEarned,
      finalPoints: user.points
    });
    
    // Create and save the order with the correct pointsUsed value
    const order = new Order({
      userId: req.user.id,
      items: orderItems,
      totalPrice: total, // This reflects the price AFTER points discount
      taxes,
      shippingFee: SHIPPING_FEE,
      discountApplied: discountAmount,
      discountCode: appliedDiscountCode,
      pointsUsed, // Set the points used from our database record
      pointsEarned,
      statusHistory: [{ status: 'ordered', updatedAt: new Date() }],
      shippingAddress: user.shippingAddress,
      paymentDetails,
    });
    
    const savedOrder = await order.save();
    console.log('Order saved with ID:', savedOrder._id.toString());
    
    // Clean up the cart points application record
    await mongoose.connection.collection('cartPointsApplications').deleteMany({ userId: req.user.id });
    console.log('Cleaned up cart points application record');
    
    // Clear the cart
    await CartItem.deleteMany(cartIdentifier);
    console.log('Cart items deleted');

    // Return complete information
    res.status(201).json({ 
      message: 'Checkout successful', 
      orderId: savedOrder._id.toString(),
      pointsEarned,
      pointsUsed,
      originalPoints,
      currentPoints: user.points,
      totalPrice: total
    });
  } catch (err) {
    console.error('Error during checkout:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Updated apply-points endpoint
router.post('/apply-points', [verifyToken, userRequired], async (req, res) => {
  const { pointsToApply } = req.body;
  
  // Validate input
  if (!pointsToApply || pointsToApply <= 0 || isNaN(parseInt(pointsToApply))) {
    return res.status(400).json({ error: 'Invalid points value' });
  }

  try {
    console.log(`Applying ${pointsToApply} points for user ${req.user.id}`);
    
    // Find the user and get their current points
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has enough points
    const userPoints = user.points || 0;
    console.log(`User current points: ${userPoints}`);
    
    if (pointsToApply > userPoints) {
      return res.status(400).json({ error: `Not enough points available. You have ${userPoints} points.` });
    }
    
    // Get cart items to calculate proper discount
    const cartItems = await CartItem.find({ userId: req.user.id });
    if (!cartItems.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    // Calculate cart subtotal
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Check for any already applied discount code
    let discountAmount = 0;
    const discountCode = req.query.discountCode;
    if (discountCode) {
      const discount = await DiscountCode.findOne({ code: discountCode });
      if (discount && discount.timesUsed < discount.usageLimit) {
        discountAmount = (discount.discountPercentage / 100) * subtotal;
      }
    }
    
    // Calculate maximum points that can be applied
    const afterCodeDiscount = subtotal - discountAmount;
    const maxPointsValue = afterCodeDiscount; // Can't apply more points than the remaining amount
    const maxPointsToApply = Math.floor(maxPointsValue / POINTS_VALUE);
    console.log(`Max points that can be applied: ${maxPointsToApply}`);
    
    // Limit points to what's available and what can be applied
    const actualPointsApplied = Math.min(parseInt(pointsToApply), maxPointsToApply, userPoints);
    console.log(`Actually applying points: ${actualPointsApplied}`);
    
    // Calculate points discount value (1 point = $0.01)
    const pointsDiscountValue = actualPointsApplied * POINTS_VALUE;
    
    // Calculate new totals
    const afterDiscounts = subtotal - discountAmount - pointsDiscountValue;
    const taxes = afterDiscounts * TAX_RATE;
    const total = afterDiscounts + taxes + SHIPPING_FEE;
    
    // Record the applied points to the cart
    const cartPointsApplication = {
      userId: req.user.id,
      pointsApplied: actualPointsApplied,
      pointsDiscountValue,
      appliedAt: new Date()
    };
    
    // Store the points application record in MongoDB
    // First, check if there's an existing record and remove it
    await mongoose.connection.collection('cartPointsApplications').deleteMany({ userId: req.user.id });
    
    // Then add the new record
    await mongoose.connection.collection('cartPointsApplications').insertOne(cartPointsApplication);
    console.log(`Recorded points application in database: ${actualPointsApplied} points`);
    
    // Return the updated cart summary with points applied
    res.status(200).json({
      subtotal: parseFloat(subtotal.toFixed(2)),
      discountApplied: parseFloat(discountAmount.toFixed(2)),
      pointsApplied: actualPointsApplied,
      pointsDiscountValue: parseFloat(pointsDiscountValue.toFixed(2)),
      taxes: parseFloat(taxes.toFixed(2)),
      shippingFee: SHIPPING_FEE,
      total: parseFloat(total.toFixed(2))
    });
  } catch (err) {
    console.error('Error applying points:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Helper function to record points transactions
async function recordPointsTransaction(userId, points, reason, orderId = null) {
  try {
    const transaction = new PointsTransaction({
      userId,
      points, // Can be positive (earned) or negative (used)
      reason,
      orderId: orderId || null,
      createdAt: new Date()
    });
    
    await transaction.save();
    console.log(`Recorded points transaction: ${points} points for user ${userId}`);
    return transaction;
  } catch (err) {
    console.error('Error recording points transaction:', err);
    // Don't throw error - this is a non-critical operation
    return null;
  }
}

// Get User Points - Require user login
router.get('/points', [verifyToken, userRequired], async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ 
      points: user.points || 0,
      pointsValue: parseFloat(((user.points || 0) * POINTS_VALUE).toFixed(2))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fetch Points Transaction History - Require user login
router.get('/points-history', [verifyToken, userRequired], async (req, res) => {
  try {
    const transactions = await PointsTransaction.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
      
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      currentPoints: user?.points || 0,
      pointsValue: parseFloat(((user?.points || 0) * POINTS_VALUE).toFixed(2)),
      transactions: transactions.map(t => ({
        id: t._id.toString(),
        points: t.points,
        reason: t.reason,
        orderId: t.orderId,
        date: t.createdAt
      }))
    });
  } catch (err) {
    console.error('Error fetching points history:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fetch User's Order History - Require user login
router.get('/orders', [verifyToken, userRequired], async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    const formattedOrders = orders.map(order => ({
      orderId: order._id.toString(),
      items: Array.isArray(order.items) ? order.items.map(item => ({
        productId: item.productId.toString(),
        variantName: item.variantName || 'Default',
        quantity: item.quantity,
        price: item.price,
      })) : [],
      totalPrice: order.totalPrice,
      taxes: order.taxes,
      shippingFee: order.shippingFee,
      discountApplied: order.discountApplied,
      discountCode: order.discountCode,
      pointsUsed: order.pointsUsed || 0,
      pointsEarned: order.pointsEarned || 0,
      statusHistory: order.statusHistory || [],
      currentStatus: order.statusHistory && order.statusHistory.length > 0 ? order.statusHistory[order.statusHistory.length - 1].status : 'ordered',
      shippingAddress: order.shippingAddress || {},
      paymentDetails: order.paymentDetails ? {
        cardNumber: `**** **** **** ${order.paymentDetails.cardNumber.slice(-4)}`,
        expiryDate: order.paymentDetails.expiryDate,
      } : { cardNumber: 'N/A', expiryDate: 'N/A' },
      createdAt: order.createdAt,
    }));

    res.status(200).json(formattedOrders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fetch All Orders for Admin
router.get('/admin/orders', [verifyToken, adminRequired], async (req, res) => {
  try {
    const { startDate, endDate, interval } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else {
      const now = new Date();
      const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
      query.createdAt = { $gte: yearAgo };
    }

    let orders = await Order.find(query).sort({ createdAt: -1 }).lean();

    // Aggregate stats based on interval
    const stats = orders.reduce((acc, order) => {
      const date = new Date(order.createdAt);
      let key;
      switch (interval || 'year') {
        case 'year':
          key = date.getFullYear().toString();
          break;
        case 'quarter':
          key = `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
          break;
        case 'month':
          key = date.toLocaleString('default', { year: 'numeric', month: '2-digit' });
          break;
        case 'week':
          const week = Math.floor((date - new Date(date.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000)) + 1;
          key = `${date.getFullYear()}-W${week}`;
          break;
        default:
          key = date.getFullYear().toString();
      }

      if (!acc[key]) {
        acc[key] = { ordersCount: 0, totalRevenue: 0, totalProfit: 0 };
      }
      acc[key].ordersCount += 1;
      acc[key].totalRevenue += order.totalPrice;
      acc[key].totalProfit += order.totalPrice - (order.taxes + order.shippingFee) - (order.items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 0.7); // 70% cost assumption
      return acc;
    }, {});

    const formattedOrders = orders.map(order => ({
      orderId: order._id.toString(),
      userId: order.userId,
      items: Array.isArray(order.items) ? order.items.map(item => ({
        productId: item.productId.toString(),
        variantName: item.variantName || 'Default',
        quantity: item.quantity,
        price: item.price,
      })) : [],
      totalPrice: order.totalPrice,
      taxes: order.taxes,
      shippingFee: order.shippingFee,
      discountApplied: order.discountApplied,
      discountCode: order.discountCode,
      pointsUsed: order.pointsUsed || 0,
      pointsEarned: order.pointsEarned || 0,
      statusHistory: order.statusHistory || [],
      currentStatus: order.statusHistory && order.statusHistory.length > 0 ? order.statusHistory[order.statusHistory.length - 1].status : 'ordered',
      shippingAddress: order.shippingAddress || {},
      paymentDetails: order.paymentDetails ? {
        cardNumber: `**** **** **** ${order.paymentDetails.cardNumber.slice(-4)}`,
        expiryDate: order.paymentDetails.expiryDate,
      } : { cardNumber: 'N/A', expiryDate: 'N/A' },
      createdAt: order.createdAt,
    }));

    res.status(200).json({ orders: formattedOrders, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Order Status
router.put('/admin/orders/:orderId/status', [verifyToken, adminRequired], async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  if (!['ordered', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // If the order is being cancelled, refund points
    if (status === 'cancelled' && order.userId) {
      const currentStatus = order.statusHistory[order.statusHistory.length - 1].status;
      
      // Only refund if not already cancelled
      if (currentStatus !== 'cancelled') {
        const user = await User.findById(order.userId);
        
        if (user) {
          // Refund points used in the order
          if (order.pointsUsed) {
            user.points = (user.points || 0) + (order.pointsUsed || 0);
          }
          
          // Remove points earned from the order
          if (order.pointsEarned) {
            user.points = Math.max(0, (user.points || 0) - (order.pointsEarned || 0));
          }
          
          await user.save();
        }
      }
    }

    order.statusHistory.push({ status, updatedAt: new Date() });
    await order.save();

    res.status(200).json({ message: 'Order status updated', orderId, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Create Discount Code
router.post('/admin/discount', [verifyToken, adminRequired], async (req, res) => {
  const { code, discount_percentage, usageLimit = 10 } = req.body;

  if (!code || !discount_percentage) {
    return res.status(400).json({ error: 'Missing code or discount_percentage' });
  }

  if (code.length !== 5 || !/^[a-zA-Z0-9]+$/.test(code)) {
    return res.status(400).json({ error: 'Code must be a 5-character alphanumeric string' });
  }

  if (usageLimit > 10) {
    return res.status(400).json({ error: 'Usage limit cannot exceed 10' });
  }

  try {
    const existingDiscount = await DiscountCode.findOne({ code });
    if (existingDiscount) {
      return res.status(400).json({ error: 'Discount code already exists' });
    }

    const discount = new DiscountCode({ code, discountPercentage: discount_percentage, usageLimit });
    await discount.save();

    res.status(201).json({ message: 'Discount code created', code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: List All Discount Codes with Details
router.get('/admin/discounts', [verifyToken, adminRequired], async (req, res) => {
  try {
    const discounts = await DiscountCode.find().lean();

    const discountDetails = await Promise.all(discounts.map(async (discount) => {
      const ordersWithDiscount = await Order.find({ discountCode: discount.code }).lean();
      const appliedOrders = ordersWithDiscount.map(order => ({
        orderId: order._id.toString(),
        totalPrice: order.totalPrice,
        createdAt: order.createdAt,
      }));

      return {
        code: discount.code,
        discountPercentage: discount.discountPercentage,
        usageLimit: discount.usageLimit,
        timesUsed: discount.timesUsed,
        appliedOrders,
      };
    }));

    res.status(200).json(discountDetails);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

// Helper function to send order confirmation email

// Helper function to send order confirmation email 
const sendOrderConfirmationEmail = async (user, order) => { 
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) { 
    console.log('Email credentials not configured, skipping confirmation email'); 
    return; 
  } 

  try { 
    // Set up nodemailer transporter 
    const transporter = nodemailer.createTransport({ 
      service: 'gmail', 
      auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
      }, 
    }); 

    // Format the order items for email 
    const itemsHtml = order.items.map(item => ` 
      <tr> 
        <td style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">${item.productId} (${item.variantName})</td> 
        <td style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">${item.quantity}</td> 
        <td style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">$${item.price.toFixed(2)}</td> 
        <td style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">$${(item.price * item.quantity).toFixed(2)}</td> 
      </tr> 
    `).join(''); 

    // Format the address for email 
    const address = order.shippingAddress; 
    const formattedAddress = `${address.street}, ${address.city}, ${address.state}, ${address.zip}, ${address.country}`; 

    // Calculate order summary values 
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0); 
    const discountAmount = order.discountApplied || 0; 
    const taxes = order.taxes || 0; 
    const shipping = order.shippingFee || 0; 

    // Send the order confirmation email 
    await transporter.sendMail({ 
      from: process.env.EMAIL_USER, 
      to: user.email, 
      subject: `LuxeLane Order Confirmation #${order._id}`, 
      html: ` 
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;"> 
          <div style="text-align: center; margin-bottom: 20px;"> 
            <h1 style="color: #D4AF37;">LuxeLane</h1> 
            <p style="font-style: italic;">Elevate Your Everyday</p> 
          </div> 
          
          <div style="background-color: #f8f8f8; padding: 20px; border-left: 4px solid #D4AF37; margin-bottom: 20px;"> 
            <h2 style="margin-top: 0; color: #333;">Order Confirmation</h2> 
            <p>Dear ${user.name},</p> 
            <p>Thank you for your order. We're pleased to confirm that we've received your order and it's being processed.</p> 
            <p><strong>Order ID:</strong> ${order._id}</p> 
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p> 
            <p><strong>Status:</strong> ${order.statusHistory[order.statusHistory.length-1].status}</p> 
          </div> 
          
          <h3 style="color: #D4AF37;">Order Summary</h3> 
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;"> 
            <thead> 
              <tr style="background-color: #f2f2f2;"> 
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Product</th> 
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Quantity</th> 
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Price</th> 
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Total</th> 
              </tr> 
            </thead> 
            <tbody> 
              ${itemsHtml} 
            </tbody> 
          </table> 
          
          <div style="background-color: #f8f8f8; padding: 15px; margin-bottom: 20px;"> 
            <table style="width: 100%;"> 
              <tr> 
                <td style="padding: 5px;">Subtotal:</td> 
                <td style="padding: 5px; text-align: right;">$${subtotal.toFixed(2)}</td> 
              </tr> 
              ${discountAmount > 0 ? ` 
              <tr> 
                <td style="padding: 5px;">Discount${order.discountCode ? ` (${order.discountCode})` : ''}:</td> 
                <td style="padding: 5px; text-align: right; color: #D4AF37;">-$${discountAmount.toFixed(2)}</td> 
              </tr> 
              ` : ''} 
              ${order.pointsUsed > 0 ? ` 
              <tr> 
                <td style="padding: 5px;">Points Applied (${order.pointsUsed} points):</td> 
                <td style="padding: 5px; text-align: right; color: #D4AF37;">-$${(order.pointsUsed * 0.01).toFixed(2)}</td> 
              </tr> 
              ` : ''} 
              <tr> 
                <td style="padding: 5px;">Taxes:</td> 
                <td style="padding: 5px; text-align: right;">$${taxes.toFixed(2)}</td> 
              </tr> 
              <tr> 
                <td style="padding: 5px;">Shipping:</td> 
                <td style="padding: 5px; text-align: right;">$${shipping.toFixed(2)}</td> 
              </tr> 
              <tr style="font-weight: bold;"> 
                <td style="padding: 5px; border-top: 1px solid #ddd;">Total:</td> 
                <td style="padding: 5px; text-align: right; border-top: 1px solid #ddd;">$${order.totalPrice.toFixed(2)}</td> 
              </tr> 
              ${order.pointsEarned > 0 ? ` 
              <tr> 
                <td style="padding: 5px; color: #55AA55;">Points Earned:</td> 
                <td style="padding: 5px; text-align: right; color: #55AA55;">+${order.pointsEarned} points</td> 
              </tr> 
              ` : ''} 
            </table> 
          </div> 
          
          <div style="margin-bottom: 20px;"> 
            <h3 style="color: #D4AF37;">Shipping Address</h3> 
            <p style="background-color: #f8f8f8; padding: 10px;">${formattedAddress}</p> 
          </div> 
          
          <div style="margin-bottom: 20px;"> 
            <h3 style="color: #D4AF37;">Payment Information</h3> 
            <p>Card ending in: ${order.paymentDetails.cardNumber.slice(-4)}</p> 
          </div> 
          
          <p>Thank you for shopping with LuxeLane. If you have any questions about your order, please contact our customer service.</p> 
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #777; font-size: 12px;"> 
            <p>&copy; 2025 LuxeLane. All rights reserved.</p> 
          </div> 
        </div> 
      ` 
    }); 

    console.log(`Order confirmation email sent to ${user.email} for order ${order._id}`); 
  } catch (err) { 
    console.error('Error sending order confirmation email:', err); 
    // Don't throw the error to prevent checkout failure 
  } 
};
