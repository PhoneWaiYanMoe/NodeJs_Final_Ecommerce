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
  const { product_id, variantName = null, quantity = 1, price } = req.body;

  if (!product_id || !price) {
    return res.status(400).json({ error: 'Missing product_id or price' });
  }

  if (!mongoose.Types.ObjectId.isValid(product_id)) {
    return res.status(400).json({ error: 'Invalid product_id format' });
  }

  try {
    const cartIdentifier = getCartIdentifier(req);
    let cartItem = await CartItem.findOne({ ...cartIdentifier, productId: product_id, variantName });

    if (cartItem) {
      cartItem.quantity += quantity;
      await cartItem.save();
    } else {
      cartItem = new CartItem({
        ...cartIdentifier,
        productId: product_id,
        variantName,
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

    const { discountCode } = req.query;
    if (discountCode) {
      const discount = await DiscountCode.findOne({ code: discountCode });
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
        variantName: item.variantName || 'Default',
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
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Checkout Process
router.post('/checkout', [verifyToken, userRequired], async (req, res) => {
  const { paymentDetails, discountCode } = req.body;

  if (!paymentDetails) {
    return res.status(400).json({ error: 'Missing paymentDetails' });
  }

  try {
    console.log(`Checkout - User ID: ${req.user.id}, Discount Code: ${discountCode}`);

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const cartIdentifier = getCartIdentifier(req);
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

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discountAmount = 0;
    let appliedDiscountCode = null;

    if (discountCode) {
      const discount = await DiscountCode.findOne({ code: discountCode });
      if (discount && discount.timesUsed < discount.usageLimit) {
        discountAmount = (discount.discountPercentage / 100) * subtotal;
        appliedDiscountCode = discount.code;
        discount.timesUsed += 1;
        await discount.save();
      }
    }

    const taxes = (subtotal - discountAmount) * TAX_RATE;
    const total = (subtotal - discountAmount) + taxes + SHIPPING_FEE;

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

    await CartItem.deleteMany(cartIdentifier);

    res.status(201).json({ message: 'Checkout successful', orderId: savedOrder._id.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Fetch User's Order History
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
