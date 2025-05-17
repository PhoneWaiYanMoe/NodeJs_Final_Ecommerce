import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../App';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';

const CART_API_URL = "https://nodejs-final-ecommerce-1.onrender.com/cart";

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  // Check if we came from checkout
  const checkoutRedirect = localStorage.getItem('checkoutRedirect') === 'true';

  const migrateGuestCart = async (token) => {
    try {
      const sessionId = localStorage.getItem('guestSessionId');
      if (!sessionId) return;

      // Migrate cart items from guest session to user account
      await axios.post(`${CART_API_URL}/migrate-cart`, 
        { sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Clear guest session ID after migration
      localStorage.removeItem('guestSessionId');
    } catch (error) {
      console.error('Error migrating cart:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await login(formData.email, formData.password);
      const user = response.user;
      const token = response.token;

      // Try to migrate the guest cart if we have a session ID
      await migrateGuestCart(token);
      
      // Clear checkout redirect flag
      localStorage.removeItem('checkoutRedirect');

      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (checkoutRedirect) {
        // If we came from checkout, go back to checkout
        navigate('/checkout');
      } else {
        navigate('/products');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      setError(error.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Make a call to the backend to verify and login with Google credentials
      const response = await axios.post('https://nodejs-final-ecommerce.onrender.com/user/google-login', {
        credential: credentialResponse.credential
      });
      
      // Set token in local storage
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        
        // Try to migrate guest cart
        await migrateGuestCart(response.data.token);
        
        // Clear checkout redirect flag
        localStorage.removeItem('checkoutRedirect');
        
        // Update context with user data
        if (response.data.user) {
          // Update user in context (handled by App.js useEffect for token)
          
          // Redirect based on user role
          if (response.data.user.role === 'admin') {
            navigate('/admin/dashboard');
          } else if (checkoutRedirect) {
            navigate('/checkout');
          } else {
            navigate('/products');
          }
        }
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('Google login error:', error);
      setError(error.response?.data?.message || 'Social login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoveryEmailChange = (e) => {
    setRecoveryEmail(e.target.value);
  };

  const toggleForgotPasswordMode = () => {
    setForgotPasswordMode(!forgotPasswordMode);
    setError('');
    setSuccess('');
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!recoveryEmail) {
      setError('Please enter your email address.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recoveryEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await axios.post('https://nodejs-final-ecommerce.onrender.com/user/forgot-password', {
        email: recoveryEmail
      });
      
      setSuccess('Password reset email sent! Check your inbox for a temporary password.');
      setRecoveryEmail('');
      
      setTimeout(() => {
        setForgotPasswordMode(false);
        setSuccess('');
      }, 5000);
      
    } catch (error) {
      console.error('Error requesting password reset:', error);
      if (error.response?.status === 404) {
        setError('Email not found. Please check your email or register a new account.');
      } else {
        setError(error.response?.data?.message || 'Failed to request password reset. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#000000',
        color: '#FFFFFF',
        minHeight: '100vh',
        fontFamily: "'Playfair Display', serif",
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          backgroundColor: '#1A1A1A',
          padding: '40px',
          borderRadius: '10px',
          width: '400px',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
        }}
      >
        <h2
          style={{
            fontSize: '24px',
            color: '#D4AF37',
            textAlign: 'center',
            marginBottom: '20px',
          }}
        >
          {forgotPasswordMode ? 'Reset Password' : 'Login'}
        </h2>
        {checkoutRedirect && (
          <p
            style={{
              color: '#D4AF37',
              textAlign: 'center',
              marginBottom: '15px',
            }}
          >
            Please log in to complete your checkout
          </p>
        )}
        {success && (
          <p
            style={{
              color: '#55FF55',
              textAlign: 'center',
              marginBottom: '15px',
            }}
          >
            {success}
          </p>
        )}
        {error && (
          <p
            style={{
              color: '#FF5555',
              textAlign: 'center',
              marginBottom: '15px',
            }}
          >
            {error}
          </p>
        )}
        {forgotPasswordMode ? (
          <div>
            <input
              type="email"
              placeholder="Enter your email"
              value={recoveryEmail}
              onChange={handleRecoveryEmailChange}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '20px',
                backgroundColor: '#E0E0E0',
                border: 'none',
                borderRadius: '5px',
                color: '#000000',
                fontFamily: "'Roboto', sans-serif",
              }}
            />
            <button
              onClick={handleForgotPassword}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: isSubmitting ? '#666666' : '#D4AF37',
                color: '#000000',
                border: 'none',
                borderRadius: '5px',
                fontFamily: "'Roboto', sans-serif",
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s',
              }}
              onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#E0E0E0')}
              onMouseLeave={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#D4AF37')}
            >
              {isSubmitting ? 'Sending...' : 'Reset Password'}
            </button>
          </div>
        ) : (
          <div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '15px',
                backgroundColor: '#E0E0E0',
                border: 'none',
                borderRadius: '5px',
                color: '#000000',
                fontFamily: "'Roboto', sans-serif",
              }}
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '20px',
                backgroundColor: '#E0E0E0',
                border: 'none',
                borderRadius: '5px',
                color: '#000000',
                fontFamily: "'Roboto', sans-serif",
              }}
            />
            <button
              onClick={handleLogin}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#D4AF37',
                color: '#000000',
                border: 'none',
                borderRadius: '5px',
                fontFamily: "'Roboto', sans-serif",
                cursor: 'pointer',
                transition: 'background-color 0.3s',
                marginBottom: '15px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D4AF37')}
            >
              Login
            </button>

            {/* Google Login Button */}
            <div className="social-login" style={{ marginBottom: '15px' }}>
              <div 
                style={{ 
                  width: '100%', 
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '10px'
                }}
              >
                <GoogleLogin
                  onSuccess={handleGoogleLogin}
                  onError={() => {
                    setError('Google login failed. Please try again.');
                  }}
                  theme="filled_black"
                  text="signin_with"
                  shape="rectangular"
                  width="100%"
                />
              </div>
            </div>

            <p
              style={{
                textAlign: 'center',
                marginTop: '15px',
                color: '#E0E0E0',
              }}
            >
              {forgotPasswordMode ? (
                <span>
                  Remember your password?{' '}
                  <a href="#" onClick={toggleForgotPasswordMode} style={{ color: '#D4AF37' }}>
                    Back to Login
                  </a>
                </span>
              ) : (
                <>
                  <span>
                    <a href="#" onClick={toggleForgotPasswordMode} style={{ color: '#D4AF37' }}>
                      Forgot Password?
                    </a>
                  </span>
                  <br />
                  <span>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: '#D4AF37' }}>
                      Register
                    </Link>
                  </span>
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
