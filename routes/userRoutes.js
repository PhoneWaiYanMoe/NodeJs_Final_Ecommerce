const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/User');

const SECRET_KEY = process.env.JWT_SECRET || 'your-jwt-secret-key';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Email setup with Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminSessionRequired = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(401).json({ error: 'Admin authentication required. Please log in as admin.' });
  }
  next();
};

const userSessionRequired = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User access required' });
  }
  next();
};

const STATIC_ADMIN = {
  email: 'admin@example.com',
  password: 'admin123',
};

// Generate a random temporary password
const generateTemporaryPassword = () => {
  return crypto.randomBytes(8).toString('hex'); // 16-character hex string
};

// Admin Routes
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }

  if (email !== STATIC_ADMIN.email || password !== STATIC_ADMIN.password) {
    return res.status(401).json({ message: 'Invalid admin credentials' });
  }

  const token = jwt.sign({ id: 'static-admin-id', email, role: 'admin' }, SECRET_KEY, { expiresIn: '24h' });
  const adminUser = {
    id: 'static-admin-id',
    email: STATIC_ADMIN.email,
    name: 'Admin',
    role: 'admin',
  };
  res.status(200).json({ user: adminUser, token });
});

router.post('/admin/logout', (req, res) => {
  res.status(200).json({ message: 'Admin logged out successfully' });
});

router.get('/admin/verify', verifyToken, adminSessionRequired, (req, res) => {
  res.status(200).json({ message: 'Admin session verified' });
});

router.get('/admin/users', verifyToken, adminSessionRequired, async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users.map(user => ({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      shippingAddress: user.shippingAddress,
      shippingAddressCollection: user.shippingAddressCollection,
    })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/admin/users', verifyToken, adminSessionRequired, async (req, res) => {
  const { email, password, name, role = 'user', shippingAddress } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      name,
      role,
      shippingAddress: shippingAddress || {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: '',
      },
      shippingAddressCollection: [],
    });
    const savedUser = await user.save();

    res.status(201).json({
      message: 'User created',
      id: savedUser._id.toString(),
      user: {
        id: savedUser._id.toString(),
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role,
        shippingAddress: savedUser.shippingAddress,
        shippingAddressCollection: savedUser.shippingAddressCollection,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/admin/users/:userId', verifyToken, adminSessionRequired, async (req, res) => {
  const { userId } = req.params;
  const { email, password, name, role, shippingAddress, shippingAddressCollection } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.email = email || user.email;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    user.name = name !== undefined ? name : user.name;
    user.role = role || user.role;
    if (shippingAddress) {
      user.shippingAddress = shippingAddress;
    }
    if (shippingAddressCollection) {
      user.shippingAddressCollection = shippingAddressCollection;
    }

    await user.save();
    res.status(200).json({
      message: 'User updated',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        shippingAddress: user.shippingAddress,
        shippingAddressCollection: user.shippingAddressCollection,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/admin/users/:userId', verifyToken, adminSessionRequired, async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// User Routes
router.post('/register', async (req, res) => {
  const { email, name, shippingAddress } = req.body;

  if (!email || !name || !shippingAddress) {
    return res.status(400).json({ message: 'Missing email, name, or shipping address' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const user = new User({
      email,
      password: hashedPassword,
      name,
      shippingAddress,
      shippingAddressCollection: [],
      role: 'user',
    });
    const savedUser = await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Temporary Password for LuxeLane',
      text: `Your temporary password is: ${temporaryPassword}. Please log in and set a new password at /setup-password.`,
    });

    const token = jwt.sign(
      { id: savedUser._id.toString(), email, role: 'user' },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful. A temporary password has been sent to your email.',
      user: {
        id: savedUser._id.toString(),
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role,
        shippingAddress: savedUser.shippingAddress,
        shippingAddressCollection: savedUser.shippingAddressCollection,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

router.post('/setup-password', verifyToken, async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.status(200).json({ message: 'Password set successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id.toString(), email, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
    res.status(200).json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        shippingAddress: user.shippingAddress,
        shippingAddressCollection: user.shippingAddressCollection,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  res.status(200).json({ message: 'User logged out successfully' });
});

// Google OAuth Login
router.post('/google-login', async (req, res) => {
  const { credential } = req.body;
  
  if (!credential) {
    return res.status(400).json({ message: 'Missing Google credential' });
  }

  try {
    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (user) {
      // If user exists but doesn't have googleId, update it
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Create new user with Google data
      user = new User({
        email,
        name,
        googleId,
        password: null, // Social login users don't have passwords
        role: 'user',
        profilePicture: picture,
        shippingAddress: {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: '',
        },
        shippingAddressCollection: [],
      });
      await user.save();
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id.toString(), email, role: user.role },
      SECRET_KEY,
      { expiresIn: '24h' }
    );
    
    // Return user data and token
    res.status(200).json({
      message: 'Google login successful',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        shippingAddress: user.shippingAddress,
        shippingAddressCollection: user.shippingAddressCollection,
      },
      token,
    });
    
  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ 
      message: 'Failed to authenticate with Google', 
      details: err.message 
    });
  }
});

router.get('/session', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(200).json({
        user: {
          id: req.user.id,
          email: req.user.email,
          name: 'Admin',
          role: 'admin',
        },
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    return res.status(200).json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        shippingAddress: user.shippingAddress,
        shippingAddressCollection: user.shippingAddressCollection,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Updated route for users to update their own profile
router.put('/profile', verifyToken, userSessionRequired, async (req, res) => {
  const { name, shippingAddressCollection, oldPassword, newPassword, confirmPassword, setDefaultAddressIndex } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update name if provided
    if (name !== undefined) {
      user.name = name;
    }

    // Handle shipping address collection (replace with the full updated array)
    if (shippingAddressCollection && Array.isArray(shippingAddressCollection)) {
      user.shippingAddressCollection = shippingAddressCollection;
    }

    // Handle setting default address
    if (setDefaultAddressIndex !== undefined && user.shippingAddressCollection[setDefaultAddressIndex]) {
      user.shippingAddress = { ...user.shippingAddressCollection[setDefaultAddressIndex] };
    }

    // Handle password change for regular users only (not social login users)
    if (oldPassword && newPassword && confirmPassword) {
      // For social login users who don't have a password
      if (!user.password) {
        return res.status(400).json({ message: 'Social login users cannot change password this way. Please use the forgot password feature instead.' });
      }
      
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Old password is incorrect' });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'New password and confirmation do not match' });
      }
      if (newPassword === oldPassword) {
        return res.status(400).json({ message: 'New password cannot be the same as the old password' });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    } else if ((oldPassword || newPassword || confirmPassword) && !(oldPassword && newPassword && confirmPassword)) {
      return res.status(400).json({ message: 'All password fields (old, new, and confirm) are required for password change' });
    }

    await user.save();
    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        shippingAddress: user.shippingAddress,
        shippingAddressCollection: user.shippingAddressCollection,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// Add this route to help with token verification for other services
router.get('/verify-token', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        console.log("No token provided in request");
        return res.status(401).json({ message: 'No token provided' });
    }
    
    try {
        console.log("Verifying token in account service:", token.substring(0, 10) + "...");
        const decoded = jwt.verify(token, SECRET_KEY);
        console.log("Decoded token:", decoded);
        
        // First check if admin
        if (decoded.role === 'admin') {
            const adminResponse = {
                userId: decoded.id,
                fullName: 'Admin',
                name: 'Admin', // Adding name field for consistency
                role: 'admin'
            };
            console.log("Returning admin response:", adminResponse);
            return res.status(200).json(adminResponse);
        }
        
        // Verify user in database
        User.findById(decoded.id)
            .then(user => {
                if (!user) {
                    console.log("User not found for id:", decoded.id);
                    return res.status(404).json({ message: 'User not found' });
                }
                
                const userResponse = {
                    userId: user._id.toString(),
                    fullName: user.name,
                    name: user.name, // Adding name field for consistency
                    role: user.role
                };
                console.log("Returning user response:", userResponse);
                return res.status(200).json(userResponse);
            })
            .catch(err => {
                console.error("Database error in verify-token:", err);
                return res.status(500).json({ message: 'Database error', error: err.message });
            });
    } catch (err) {
        console.error("Token verification error:", err);
        res.status(401).json({ message: 'Invalid token', error: err.message });
    }
});

// Password reset functionality
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    // For admin account - special case
    if (email === STATIC_ADMIN.email) {
      return res.status(400).json({
        message: 'Cannot reset admin password. Please use the default credentials.'
      });
    }

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email address' });
    }

    // Generate new temporary password
    const temporaryPassword = generateTemporaryPassword();
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    
    // Update user's password in the database
    user.password = hashedPassword;
    await user.save();

    // Set up nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send the password reset email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Password Reset for LuxeLane',
      text: `Your account password has been reset. Your new temporary password is: ${temporaryPassword}
      
Please log in with this password and then update it in your profile settings.

If you did not request this password reset, please contact support immediately.

The LuxeLane Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #D4AF37;">LuxeLane</h1>
            <p style="font-style: italic;">Elevate Your Everyday</p>
          </div>
          
          <div style="background-color: #f8f8f8; padding: 20px; border-left: 4px solid #D4AF37; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #333;">Password Reset</h2>
            <p>Your account password has been reset. Your new temporary password is:</p>
            <p style="font-family: monospace; font-size: 18px; background-color: #eeeeee; padding: 10px; text-align: center; font-weight: bold;">${temporaryPassword}</p>
            <p>Please log in with this password and then update it in your profile settings for security.</p>
          </div>
          
          <p>If you did not request this password reset, please contact support immediately.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #777; font-size: 12px;">
            <p>The LuxeLane Team</p>
          </div>
        </div>
      `
    });

    // Return success message
    res.status(200).json({
      message: 'Password reset successful. Check your email for the new temporary password.'
    });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({
      message: 'Server error during password reset',
      details: err.message
    });
  }
});

module.exports = router;
