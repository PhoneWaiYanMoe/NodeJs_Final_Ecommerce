const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // Add this import
const connectDB = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

app.get('/', async (req, res) => {
  console.log('[App] Handling request to root route');
  let user = null;
  let message = null;
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (token) {
    try {
      console.log('[App] Verifying token for root route');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await require('./models/User').findById(decoded.userId).select('-password');
      console.log('[App] User fetched for root route:', user ? user.email : 'Not found');
    } catch (error) {
      console.log('[App] Token verification failed for root route:', error.message);
      message = 'Invalid or expired token';
    }
  }
  res.render('index', { user, message });
});

app.get('/main', async (req, res) => {
  console.log('[App] Handling request to /main route');
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) {
    console.log('[App] Access to main page denied: No token provided');
    return res.redirect('/?message=' + encodeURIComponent('Please login to access the main page'));
  }
  try {
    console.log('[App] Verifying token for /main route');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[App] Token decoded, userId:', decoded.userId);
    const user = await require('./models/User').findById(decoded.userId).select('-password');
    if (!user) {
      console.log('[App] Access to main page denied: User not found');
      return res.redirect('/?message=' + encodeURIComponent('User not found'));
    }
    console.log(`[App] User ${user.email} accessed the main page`);
    res.render('main', { user, message: null });
  } catch (error) {
    console.log('[App] Access to main page failed:', error.message);
    res.redirect('/?message=' + encodeURIComponent('Invalid or expired token'));
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`User Service running on port ${PORT}`));