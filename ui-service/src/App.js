import React, { createContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import LandingPage from './pages/LandingPage';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import AdminDashboard from './pages/AdminDashboard';
import Cart from './pages/Cart';
import Register from './pages/Register';
import Login from './pages/Login';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';

// Create Auth Context
export const AuthContext = createContext();

// Configure Axios defaults
axios.defaults.baseURL = 'https://nodejs-final-ecommerce.onrender.com/user';

// Add token to axios headers
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check session (token) on app load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await axios.get('/session');
          if (response.data.user) {
            setUser(response.data.user);
          } else {
            localStorage.removeItem('token');
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Session check failed:', err.message);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const loginUrl = email === 'admin@example.com' ? '/admin/login' : '/login';
      const response = await axios.post(loginUrl, { email, password });
      const { user, token } = response.data;
      if (token) {
        localStorage.setItem('token', token);
        setUser(user);
      }
      return response.data;
    } catch (err) {
      throw err.response?.data || { message: 'Login failed' };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await axios.post('/logout');
      localStorage.removeItem('token');
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err.message);
    }
  };

  // Protected Route Component
  const ProtectedRoute = ({ children, adminOnly }) => {
    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    if (adminOnly && (user.email !== 'admin@example.com' && user.role !== 'admin')) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute adminOnly={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/cart" element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          } />
          <Route path="/checkout" element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          } />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;