import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';

const Checkout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { cartSummary, discountCode } = location.state || {};
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: ''
  });
  const [message, setMessage] = useState('');

  const CART_API_URL = 'https://nodejs-final-ecommerce-1.onrender.com/cart';
  const PRODUCTS_API_URL = 'https://product-management-soyo.onrender.com/api/products';

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Use the cartSummary from location.state if available, otherwise fetch it
    if (!cartSummary || !cartSummary.items || cartSummary.items.length === 0) {
      fetchCartSummary();
    }
  }, [user, navigate, cartSummary]);

  const fetchCartSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const response = await axios.get(`${CART_API_URL}/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { discountCode }, // Pass discountCode to apply it
      });

      if (response.data.message === 'Cart is empty') {
        setCartSummary({ items: [] });
        setMessage('Your cart is empty. Please add items to proceed.');
      } else {
        setCartSummary(response.data);
      }
    } catch (error) {
      console.error('Error fetching cart summary:', error);
      setMessage('Failed to load cart summary. Please try again.');
    }
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentDetails({ ...paymentDetails, [name]: value });
  };

  const handleCheckout = async () => {
    if (!cartSummary || !cartSummary.items || cartSummary.items.length === 0) {
      setMessage('Your cart is empty. Please add items to proceed.');
      return;
    }

    if (!paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv) {
      setMessage('Please fill in all payment details.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      // Process the checkout with discountCode
      const checkoutResponse = await axios.post(
        `${CART_API_URL}/checkout`,
        { paymentDetails, discountCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // After successful checkout, update salesCount and stock for each product
      const updatePromises = cartSummary.items.map(async (item) => {
        try {
          // Update salesCount
          await axios.patch(
            `${PRODUCTS_API_URL}/${item.productId}/sales-count`,
            { quantity: item.quantity },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          // Fetch the product to get its variants
          const productResponse = await axios.get(`${PRODUCTS_API_URL}/${item.productId}`);
          const product = productResponse.data;

          // For simplicity, assume we're using the first variant (e.g., "Color: Black")
          // If your cart supports selecting variants, you should include variantName in cart items
          const variantName = product.variants[0]?.name || null;

          if (!variantName) {
            console.error(`No variants found for product ${item.productId}`);
            return;
          }

          // Update stock using the existing update-stock endpoint
          await axios.post(
            `${PRODUCTS_API_URL}/update-stock`,
            {
              items: [
                {
                  productId: item.productId,
                  variantName: variantName,
                  quantity: item.quantity,
                },
              ],
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (error) {
          console.error(`Error updating product ${item.productId}:`, error);
        }
      });

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      setMessage(`Checkout successful! Order ID: ${checkoutResponse.data.orderId}`);
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('Error during checkout:', error);
      setMessage(error.response?.data?.error || 'Checkout failed. Please try again.');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleAuthAction = async () => {
    if (user) {
      await logout();
      navigate('/login');
    } else {
      navigate('/login');
    }
  };

  return (
    <div style={{
      backgroundColor: '#000000',
      color: '#FFFFFF',
      minHeight: '100vh',
      fontFamily: "'Playfair Display', serif"
    }}>
      <header style={{
        backgroundColor: '#000000',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #D4AF37'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/logo.png"
            alt="LuxeLane Logo"
            style={{ width: '50px', height: '50px', marginRight: '15px' }}
          />
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#D4AF37',
              margin: 0
            }}>
              LuxeLane
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#E0E0E0',
              margin: 0
            }}>
              Elevate Your Everyday.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '16px', color: '#D4AF37' }}>
            Hello {user ? user.name : 'Guest'}
          </span>
          <Link to="/">
            <button
              style={{
                padding: '10px 20px',
                backgroundColor: '#D4AF37',
                color: '#000000',
                border: 'none',
                borderRadius: '5px',
                fontFamily: "'Roboto', sans-serif",
                cursor: 'pointer',
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D4AF37')}
            >
              Products
            </button>
          </Link>
          <Link to="/cart">
            <button
              style={{
                padding: '10px 20px',
                backgroundColor: '#D4AF37',
                color: '#000000',
                border: 'none',
                borderRadius: '5px',
                fontFamily: "'Roboto', sans-serif",
                cursor: 'pointer',
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D4AF37')}
            >
              Cart
            </button>
          </Link>
          <button
            onClick={handleAuthAction}
            style={{
              padding: '10px 20px',
              backgroundColor: '#D4AF37',
              color: '#000000',
              border: 'none',
              borderRadius: '5px',
              fontFamily: "'Roboto', sans-serif",
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D4AF37')}
          >
            {user ? 'Logout' : 'Login'}
          </button>
        </div>
      </header>

      <main style={{ padding: '40px' }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 'bold',
          color: '#D4AF37',
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          Checkout
        </h1>

        {message && (
          <p style={{
            fontSize: '16px',
            color: message.includes('failed') ? '#FF5555' : '#D4AF37',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            {message}
          </p>
        )}

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '30px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          {cartSummary && cartSummary.items && cartSummary.items.length > 0 && (
            <div style={{
              backgroundColor: '#1A1A1A',
              padding: '20px',
              borderRadius: '10xpath: /cart/summarypx'
            }}>
              <h3 style={{
                fontSize: '24px',
                color: '#D4AF37',
                marginBottom: '15px'
              }}>
                Order Summary
              </h3>
              <p style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '15px' }}>
                Subtotal: ${cartSummary.subtotal?.toFixed(2) || '0.00'}
              </p>
              {cartSummary.discountApplied > 0 && (
                <p style={{ fontSize: '16px', color: '#D4AF37', marginBottom: '15px' }}>
                  Discount ({discountCode} - {cartSummary.discountPercentage}%): -$
                  {cartSummary.discountApplied?.toFixed(2) || '0.00'}
                </p>
              )}
              <p style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '15px' }}>
                Taxes: ${cartSummary.taxes?.toFixed(2) || '0.00'}
              </p>
              <p style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '15px' }}>
                Shipping Fee: ${cartSummary.shippingFee?.toFixed(2) || '0.00'}
              </p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#D4AF37', marginBottom: '20px' }}>
                Total: ${cartSummary.total?.toFixed(2) || '0.00'}
              </p>
            </div>
          )}

          <div style={{
            backgroundColor: '#1A1A1A',
            padding: '20px',
            borderRadius: '10px'
          }}>
            <h3 style={{
              fontSize: '24px',
              color: '#D4AF37',
              marginBottom: '15px'
            }}>
              Payment Details
            </h3>
            <input
              type="text"
              name="cardNumber"
              placeholder="Card Number"
              value={paymentDetails.cardNumber}
              onChange={handlePaymentChange}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#E0E0E0',
                border: 'none',
                borderRadius: '5px',
                color: '#000000',
                fontFamily: "'Roboto', sans-serif",
                marginBottom: '10px'
              }}
            />
            <input
              type="text"
              name="expiryDate"
              placeholder="Expiry Date (MM/YY)"
              value={paymentDetails.expiryDate}
              onChange={handlePaymentChange}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#E0E0E0',
                border: 'none',
                borderRadius: '5px',
                color: '#000000',
                fontFamily: "'Roboto', sans-serif",
                marginBottom: '10px'
              }}
            />
            <input
              type="text"
              name="cvv"
              placeholder="CVV"
              value={paymentDetails.cvv}
              onChange={handlePaymentChange}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#E0E0E0',
                border: 'none',
                borderRadius: '5px',
                color: '#000000',
                fontFamily: "'Roboto', sans-serif",
                marginBottom: '10px'
              }}
            />
          </div>

          <button
            onClick={handleCheckout}
            style={{
              padding: '10px 20px',
              backgroundColor: '#D4AF37',
              color: '#000000',
              border: 'none',
              borderRadius: '5px',
              fontFamily: "'Roboto', sans-serif",
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D4AF37')}
          >
            Complete Checkout
          </button>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
