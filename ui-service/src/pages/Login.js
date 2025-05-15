import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../App';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

const CART_API_URL = "https://nodejs-final-ecommerce-1.onrender.com/cart";

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
          Login
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
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D4AF37')}
          >
            Login
          </button>
          <p
            style={{
              textAlign: 'center',
              marginTop: '15px',
              color: '#E0E0E0',
            }}
          >
            Don’t have an account? <Link to="/register" style={{ color: '#D4AF37' }}>Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
