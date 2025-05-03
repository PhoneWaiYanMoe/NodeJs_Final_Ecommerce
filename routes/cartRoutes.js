// CartAndCheckout/routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const CartItem = require('../models/CartItem');
const Order = require('../models/Order');
const DiscountCode = require('../models/DiscountCode');
const { adminRequired, userOrGuestRequired, userRequired, STATIC_ADMIN } = require('../middleware/auth');

// Constants
const TAX_RATE = 0.1; // 10% tax
const SHIPPING_FEE = 5.0;

// Helper to get cart identifier
const getCartIdentifier = (req) => {
  if (req.session.userId) {
    return { userId: req.session.userId };
  }
  return { sessionId: req.session.sessionId };
};

// Admin Login
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  if (email !== STATIC_ADMIN.email || password !== STATIC_ADMIN.password) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  req.session.adminEmail = email;
  res.status(200).json({ message: 'Admin login successful' });
});

// Admin Logout
router.post('/admin/logout', (req, res) => {
  delete req.session.adminEmail;
  res.status(200).json({ message: 'Admin logged out successfully' });
});

// Add to Cart
router.post('/add', userOrGuestRequired, async (req, res) => {
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
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Cart Item Quantity
router.put('/update/:itemId', userOrGuestRequired, async (req, res) => {
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
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove Item from Cart
router.delete('/remove/:itemId', userOrGuestRequired, async (req, res) => {
  const { itemId } = req.params;

  try {
    const cartIdentifier = getCartIdentifier(req);
    const cartItem = await CartItem.findOneAndDelete({ _id: itemId, ...cartIdentifier });

    if (!cartItem) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    res.status(200).json({ message: 'Item removed from cart' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Cart Summary
router.get('/summary', userOrGuestRequired, async (req, res) => {
  try {
    const cartIdentifier = getCartIdentifier(req);
    const cartItems = await CartItem.find(cartIdentifier);

    if (!cartItems.length) {
      return res.status(200).json({ message: 'Cart is empty' });
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxes = subtotal * TAX_RATE;
    const total = subtotal + taxes + SHIPPING_FEE;

    res.status(200).json({
      items: cartItems.map(item => ({
        id: item._id.toString(),
        productId: item.productId.toString(),
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxes: parseFloat(taxes.toFixed(2)),
      shippingFee: SHIPPING_FEE,
      total: parseFloat(total.toFixed(2)),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Apply Discount Code
router.post('/apply-discount', userOrGuestRequired, async (req, res) => {
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

    req.session.discountCode = code;

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
    res.status(500).json({ error: 'Server error' });
  }
});

// Checkout Process
router.post('/checkout', userOrGuestRequired, userRequired, async (req, res) => {
  const { shippingAddress, paymentDetails } = req.body;

  if (!shippingAddress || !paymentDetails) {
    return res.status(400).json({ error: 'Missing shippingAddress or paymentDetails' });
  }

  try {
    const cartIdentifier = getCartIdentifier(req);
    const cartItems = await CartItem.find(cartIdentifier);

    if (!cartItems.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discountAmount = 0;

    if (req.session.discountCode) {
      const discount = await DiscountCode.findOne({ code: req.session.discountCode });
      if (discount && discount.timesUsed < discount.usageLimit) {
        discountAmount = (discount.discountPercentage / 100) * subtotal;
        discount.timesUsed += 1;
        await discount.save();
      }
    }

    const taxes = (subtotal - discountAmount) * TAX_RATE;
    const total = (subtotal - discountAmount) + taxes + SHIPPING_FEE;

    // Create order
    const order = new Order({
      ...cartIdentifier,
      totalPrice: total,
      taxes,
      shippingFee: SHIPPING_FEE,
      discountApplied: discountAmount,
      shippingAddress,
      paymentDetails,
    });
    const savedOrder = await order.save();

    // Clear cart
    await CartItem.deleteMany(cartIdentifier);

    // Clear session discount
    delete req.session.discountCode;

    res.status(201).json({ message: 'Checkout successful', orderId: savedOrder._id.toString() });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Create Discount Code
router.post('/admin/discount', adminRequired, async (req, res) => {
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
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;