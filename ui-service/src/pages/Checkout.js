import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';

const Checkout = () => {
  const { user, setUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { cartSummary: initialCartSummary, discountCode } = location.state || {};
  const [cartSummary, setCartSummary] = useState(initialCartSummary);
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: ''
  });
  const [message, setMessage] = useState('');
  const [pointsInfo, setPointsInfo] = useState({
    available: 0,
    toApply: 0,
    value: 0,
    isApplied: false
  });
  const [isApplyingPoints, setIsApplyingPoints] = useState(false);
  const [confirmingPoints, setConfirmingPoints] = useState(false);

  const CART_API_URL = 'https://nodejs-final-ecommerce-1.onrender.com/cart';
  const PRODUCTS_API_URL = 'https://product-management-soyo.onrender.com/api/products';

  useEffect(() => {
    if (user) {
      fetchUserPoints();
    }
    if (!cartSummary || !cartSummary.items || cartSummary.items.length === 0) {
      fetchCartSummary();
    }
  }, [user, cartSummary]);

  const fetchUserPoints = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');
      const response = await axios.get(`${CART_API_URL}/points`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPointsInfo({
        available: response.data.points || 0,
        toApply: 0,
        value: response.data.pointsValue || 0,
        isApplied: false
      });
    } catch (error) {
      console.error('Error fetching user points:', error);
      setPointsInfo({
        available: 0,
        toApply: 0,
        value: 0,
        isApplied: false
      });
    }
  };

  const fetchCartSummary = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const params = { 
        discountCode,
        ...(pointsInfo.isApplied ? { pointsToApply: pointsInfo.toApply } : {})
      };
      
      console.log("Fetching cart summary with params:", params);
      
      const response = await axios.get(`${CART_API_URL}/summary`, {
        headers,
        params
      });

      if (response.data.message === "Cart is empty") {
        setCartSummary({ items: [] });
        setMessage("Your cart is empty. Please add items to proceed.");
      } else {
        setCartSummary(prev => ({
          ...response.data,
          pointsApplied: pointsInfo.isApplied ? pointsInfo.toApply : 0,
          pointsDiscountValue: pointsInfo.isApplied ? (pointsInfo.toApply * 0.01) : 0
        }));
      }
    } catch (error) {
      console.error("Error fetching cart summary:", error);
      setMessage("Failed to load cart summary. Please try again.");
    }
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentDetails({ ...paymentDetails, [name]: value });
  };

  const handlePointsChange = (e) => {
    const value = parseInt(e.target.value);
    if (isNaN(value) || value < 0) {
      setPointsInfo({...pointsInfo, toApply: 0});
    } else {
      const pointsToApply = Math.min(value, pointsInfo.available);
      setPointsInfo({...pointsInfo, toApply: pointsToApply});
    }
  };

  const handleApplyPoints = () => {
    if (pointsInfo.toApply <= 0) {
      setMessage('Please enter a valid number of points to apply');
      return;
    }
    
    setConfirmingPoints(true);
  };

  const confirmApplyPoints = async () => {
    setIsApplyingPoints(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');
      
      console.log(`Applying ${pointsInfo.toApply} points`);
      
      const response = await axios.post(
        `${CART_API_URL}/apply-points`,
        { pointsToApply: pointsInfo.toApply },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log("Apply points response:", response.data);
      
      setPointsInfo(prev => ({
        ...prev,
        isApplied: true,
        available: prev.available - pointsInfo.toApply
      }));
      
      if (response.data) {
        setCartSummary(prev => ({
          ...prev,
          ...response.data,
          pointsApplied: response.data.pointsApplied || pointsInfo.toApply,
          pointsDiscountValue: response.data.pointsDiscountValue || (pointsInfo.toApply * 0.01)
        }));
      }
      
      const discountValue = (response.data.pointsDiscountValue || (pointsInfo.toApply * 0.01)).toFixed(2);
      setMessage(`Applied ${pointsInfo.toApply} points to your order (-$${discountValue})`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error applying points:', error);
      setMessage(error.response?.data?.error || 'Failed to apply points. Please try again.');
      setPointsInfo(prev => ({ ...prev, isApplied: false }));
    } finally {
      setIsApplyingPoints(false);
      setConfirmingPoints(false);
    }
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

    if (!user) {
      navigate('/login', { state: { from: '/checkout', cartSummary, discountCode } });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');
      
      setMessage('Processing your order...');

      const checkoutData = { 
        paymentDetails, 
        discountCode
      };
      
      console.log("Sending checkout data:", checkoutData);

      const checkoutResponse = await axios.post(
        `${CART_API_URL}/checkout`,
        checkoutData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Checkout response:', checkoutResponse.data);

      const updatePromises = cartSummary.items.map(async (item) => {
        try {
          const productId = item.productId;
          const variantName = item.variantName;

          await axios.patch(
            `${PRODUCTS_API_URL}/${productId}/sales-count`,
            { quantity: item.quantity },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          await axios.post(
            `${PRODUCTS_API_URL}/update-stock`,
            {
              items: [
                {
                  productId: productId,
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

      await Promise.all(updatePromises);

      if (user && checkoutResponse.data.currentPoints !== undefined) {
        setUser({
          ...user,
          points: checkoutResponse.data.currentPoints
        });
      }

      let successMessage = `Checkout successful! Order ID: ${checkoutResponse.data.orderId}`;
      
      if (checkoutResponse.data.pointsUsed > 0) {
        successMessage += ` You redeemed ${checkoutResponse.data.pointsUsed} points.`;
      }
      
      if (checkoutResponse.data.pointsEarned > 0) {
        successMessage += ` You earned ${checkoutResponse.data.pointsEarned} new loyalty points!`;
      }
      
      setMessage(successMessage);
      
      setPointsInfo({
        available: checkoutResponse.data.currentPoints || 0,
        toApply: 0,
        value: (checkoutResponse.data.currentPoints || 0) * 0.01,
        isApplied: false
      });
      
      setTimeout(() => {
        navigate('/orders');
      }, 5000);
    } catch (error) {
      console.error('Error during checkout:', error);
      setMessage(error.response?.data?.error || 'Checkout failed. Please try again.');
      if (error.response?.status === 401) {
        navigate('/login', { state: { from: '/checkout', cartSummary, discountCode } });
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

  const formatProductDisplay = (item) => {
    return `${item.productId} (${item.variantName})`;
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
          <span style={{ color: '#D4AF37' }}>
            {user ? `Welcome, ${user.name}` : 'Guest'}
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
  
        {confirmingPoints && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: '#1A1A1A',
              padding: '30px',
              borderRadius: '10px',
              maxWidth: '500px',
              width: '90%',
              border: '1px solid #D4AF37'
            }}>
              <h3 style={{ fontSize: '20px', color: '#D4AF37', marginBottom: '20px', textAlign: 'center' }}>
                Confirm Points Redemption
              </h3>
              <p style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '20px', textAlign: 'center' }}>
                Are you sure you want to use <span style={{ color: '#55FF55', fontWeight: 'bold' }}>{pointsInfo.toApply} points</span> to
                reduce your order by <span style={{ color: '#D4AF37', fontWeight: 'bold' }}>${(pointsInfo.toApply * 0.01).toFixed(2)}</span>?
              </p>
              <p style={{ fontSize: '14px', color: '#FF5555', marginBottom: '20px', textAlign: 'center' }}>
                This will immediately deduct the points from your account.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px' }}>
                <button
                  onClick={() => setConfirmingPoints(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#333333',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApplyPoints}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#D4AF37',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
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
              borderRadius: '10px'
            }}>
              <h3 style={{
                fontSize: '24px',
                color: '#D4AF37',
                marginBottom: '15px'
              }}>
                Order Summary
              </h3>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                color: '#FFFFFF',
                fontFamily: "'Roboto', sans-serif",
                marginBottom: '15px'
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #D4AF37' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>
                      Product (Variant)
                    </th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>
                      Quantity
                    </th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>
                      Price
                    </th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cartSummary.items.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #333333' }}>
                      <td style={{ padding: '10px' }}>
                        {formatProductDisplay(item)}
                      </td>
                      <td style={{ padding: '10px' }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: '10px' }}>
                        ${item.price.toFixed(2)}
                      </td>
                      <td style={{ padding: '10px' }}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '15px' }}>
                Subtotal: ${cartSummary.subtotal?.toFixed(2) || '0.00'}
              </p>
              {cartSummary.discountApplied > 0 && (
                <p style={{ fontSize: '16px', color: '#D4AF37', marginBottom: '15px' }}>
                  Discount ({cartSummary.discountCode} - {cartSummary.discountPercentage}%): -$
                  {cartSummary.discountApplied?.toFixed(2) || '0.00'}
                </p>
              )}
              
              {user && (
                <div style={{ 
                  backgroundColor: '#222222', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  marginBottom: '15px',
                  border: '1px solid #D4AF37' 
                }}>
                  <h4 style={{ fontSize: '18px', color: '#D4AF37', marginBottom: '10px' }}>
                    Loyalty Points
                  </h4>
                  <p style={{ fontSize: '14px', color: '#E0E0E0', marginBottom: '10px' }}>
                    Available Points: {pointsInfo.available} (Value: ${pointsInfo.value.toFixed(2)})
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <input
                      type="number"
                      min="0"
                      max={pointsInfo.available}
                      value={pointsInfo.toApply}
                      onChange={handlePointsChange}
                      style={{
                        width: '80px',
                        padding: '8px',
                        backgroundColor: '#E0E0E0',
                        border: 'none',
                        borderRadius: '5px',
                        color: '#000000',
                        fontFamily: "'Roboto', sans-serif",
                        marginRight: '10px'
                      }}
                    />
                    <button
                      onClick={handleApplyPoints}
                      disabled={isApplyingPoints || pointsInfo.toApply === 0 || pointsInfo.isApplied}
                      style={{
                        padding: '8px 15px',
                        backgroundColor: (isApplyingPoints || pointsInfo.toApply === 0 || pointsInfo.isApplied) 
                          ? '#666666' 
                          : '#D4AF37',
                        color: '#000000',
                        border: 'none',
                        borderRadius: '5px',
                        fontFamily: "'Roboto', sans-serif",
                        cursor: (isApplyingPoints || pointsInfo.toApply === 0 || pointsInfo.isApplied) 
                          ? 'not-allowed' 
                          : 'pointer',
                        transition: 'background-color 0.3s'
                      }}
                    >
                      {isApplyingPoints 
                        ? 'Applying...' 
                        : pointsInfo.isApplied 
                          ? 'Points Applied' 
                          : 'Apply Points'}
                    </button>
                  </div>
                  {cartSummary.pointsApplied > 0 && (
                    <p style={{ fontSize: '16px', color: '#55FF55', marginBottom: '0' }}>
                      Points Discount: -${cartSummary.pointsDiscountValue?.toFixed(2) || '0.00'} ({cartSummary.pointsApplied} points)
                    </p>
                  )}
                </div>
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
  
              {user && (
                <p style={{ fontSize: '14px', color: '#55FF55', fontStyle: 'italic', marginBottom: '0' }}>
                  You'll earn approximately {Math.floor(cartSummary.total * 0.1)} points from this purchase!
                </p>
              )}
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
