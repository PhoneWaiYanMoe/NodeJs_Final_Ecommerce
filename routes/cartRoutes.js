const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const CartItem = require('../models/CartItem');
const Order = require('../models/Order');
const DiscountCode = require('../models/DiscountCode');
const User = require('../models/User');

// Constants
const TAX_RATE = 0.1; // 10% tax
const SHIPPING_FEE = 5.0;
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

// Helper to get cart identifier (userId only, no sessionId for guests)
const getCartIdentifier = (req) => {
  return { userId: req.user.id };
};

// Add to Cart
router.post('/add', [verifyToken, userRequired], async (req, res) => {
  const { product_id, quantity = 1, price } = req.body;

  if (!product_id || !price) {
    return res.status(400).json({ error: 'Missing product_id or price' });
  }

  // Validate product_id as a MongoDB ObjectID
  if (!mongoose.Types.ObjectId.isValid(product_id)) {
    return res.status(400).json({ error: 'Invalid product_id format. Must be a valid MongoDB ObjectID.' });
  }

  try {
    const cartIdentifier = getCartIdentifier(req);
    let cartItem = await CartItem.findOne({ ...cartIdentifier, productId: product_id });

    if (cartItem) {
      cartItem.quantity += quantity;
      await cartItem.save();
    } else {
      cartItem = new CartItem({
        ...cartIdentifier,
        productId: product_id,
        quantity,
        price,
      });
      await cartItem.save();
    }

    res.status(201).json({ message: 'Item added to cart' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Cart Item Quantity
router.put('/update/:itemId', [verifyToken, userRequired], async (req, res) => {
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

// Remove Item from Cart
router.delete('/remove/:itemId', [verifyToken, userRequired], async (req, res) => {
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

// Cart Summary
router.get('/summary', [verifyToken, userRequired], async (req, res) => {
  try {
    const cartIdentifier = getCartIdentifier(req);
    const cartItems = await CartItem.find(cartIdentifier);

    if (!cartItems.length) {
      return res.status(200).json({ message: 'Cart is empty' });
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discountAmount = 0;
    let appliedDiscountCode = null;
    let discountPercentage = 0;

    // Check if a discount code is applied
    if (req.user.discountCode) {
      const discount = await DiscountCode.findOne({ code: req.user.discountCode });
      if (discount && discount.timesUsed < discount.usageLimit) {
        discountAmount = (discount.discountPercentage / 100) * subtotal;
        appliedDiscountCode = discount.code;
        discountPercentage = discount.discountPercentage;
      }
    }

    const taxes = (subtotal - discountAmount) * TAX_RATE;
    const total = (subtotal - discountAmount) + taxes + SHIPPING_FEE;

    res.status(200).json({
      items: cartItems.map(item => ({
        id: item._id.toString(),
        productId: item.productId.toString(),
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: parseFloat(subtotal.toFixed(2)),
      discountApplied: parseFloat(discountAmount.toFixed(2)),
      discountCode: appliedDiscountCode,
      discountPercentage: discountPercentage,
      taxes: parseFloat(taxes.toFixed(2)),
      shippingFee: SHIPPING_FEE,
      total: parseFloat(total.toFixed(2)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Apply Discount Code
router.post('/apply-discount', [verifyToken, userRequired], async (req, res) => {
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

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = (discount.discountPercentage / 100) * subtotal;
    const taxes = (subtotal - discountAmount) * TAX_RATE;
    const total = (subtotal - discountAmount) + taxes + SHIPPING_FEE;

    // Store discount code in the request object for use in checkout
    req.user.discountCode = code;

    res.status(200).json({
      subtotal: parseFloat(subtotal.toFixed(2)),
      discountApplied: parseFloat(discountAmount.toFixed(2)),
      taxes: parseFloat(taxes.toFixed(2)),
      shippingFee: SHIPPING_FEE,
      total: parseFloat(total.toFixed(2)),
      discountCode: code,
      discountPercentage: discount.discountPercentage,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Checkout Process
router.post('/checkout', [verifyToken, userRequired], async (req, res) => {
  const { paymentDetails } = req.body;

  if (!paymentDetails) {
    return res.status(400).json({ error: 'Missing paymentDetails' });
  }

  try {
    // Fetch user to get shipping address
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(400).json({ error: 'User shipping address not found. Please update your profile in the user service.' });
    }

    const cartIdentifier = getCartIdentifier(req);
    const cartItems = await CartItem.find(cartIdentifier);

    if (!cartItems.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Map cart items to order items
    const orderItems = cartItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price
    }));

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discountAmount = 0;
    let appliedDiscountCode = null;

    if (req.user.discountCode) {
      const discount = await DiscountCode.findOne({ code: req.user.discountCode });
      if (discount && discount.timesUsed < discount.usageLimit) {
        discountAmount = (discount.discountPercentage / 100) * subtotal;
        discount.timesUsed += 1;
        await discount.save();
        appliedDiscountCode = discount.code;
      } else {
        // Clear discountCode if invalid or usage limit reached
        delete req.user.discountCode;
      }
    }

    const taxes = (subtotal - discountAmount) * TAX_RATE;
    const total = (subtotal - discountAmount) + taxes + SHIPPING_FEE;

    // Create order
    const order = new Order({
      userId: req.user.id,
      items: orderItems,
      totalPrice: total,
      taxes,
      shippingFee: SHIPPING_FEE,
      discountApplied: discountAmount,
      discountCode: appliedDiscountCode,
      statusHistory: [{ status: 'ordered', updatedAt: new Date() }],
      shippingAddress: user.shippingAddress,
      paymentDetails,
    });
    const savedOrder = await order.save();

    // Clear cart
    await CartItem.deleteMany(cartIdentifier);

    // Clear discount
    delete req.user.discountCode;

    res.status(201).json({ message: 'Checkout successful', orderId: savedOrder._id.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
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
        createdAt: discount.createdAt,
        appliedOrders,
      };
    }));

    res.status(200).json(discountDetails);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get Detailed Order Information for a Specific Discount Code
router.get('/admin/discount/:code/orders', [verifyToken, adminRequired], async (req, res) => {
  const { code } = req.params;

  try {
    const discount = await DiscountCode.findOne({ code }).lean();
    if (!discount) {
      return res.status(404).json({ error: 'Discount code not found' });
    }

    const orders = await Order.find({ discountCode: code }).lean();
    const relevantOrders = orders.map(order => ({
      orderId: order._id.toString(),
      userId: order.userId,
      totalPrice: order.totalPrice,
      taxes: order.taxes,
      shippingFee: order.shippingFee,
      discountApplied: order.discountApplied,
      shippingAddress: order.shippingAddress,
      paymentDetails: order.paymentDetails,
      createdAt: order.createdAt,
    }));

    res.status(200).json({
      code: discount.code,
      discountPercentage: discount.discountPercentage,
      usageLimit: discount.usageLimit,
      timesUsed: discount.timesUsed,
      createdAt: discount.createdAt,
      orders: relevantOrders,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
