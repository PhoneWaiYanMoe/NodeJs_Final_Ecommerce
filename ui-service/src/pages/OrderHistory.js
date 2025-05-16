import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';

const OrderHistory = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const ORDERS_API_URL = 'https://nodejs-final-ecommerce-1.onrender.com/cart/orders';

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const response = await axios.get(ORDERS_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    }
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedOrder(null);
  };

  const handleAuthAction = async () => {
    if (user) {
      await logout();
      navigate('/login');
    } else {
      navigate('/login');
    }
  };

  const formattedOrders = orders.map(order => ({
    orderId: order._loid.toString(),
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
    pointsEarned: order.pointsEarned || 0,  // Added this line
    pointsUsed: order.pointsUsed || 0,      // Added this line
    statusHistory: order.statusHistory || [],
    currentStatus: order.statusHistory && order.statusHistory.length > 0 ? order.statusHistory[order.statusHistory.length - 1].status : 'ordered',
    shippingAddress: order.shippingAddress || {},
    paymentDetails: order.paymentDetails ? {
      cardNumber: `**** **** **** ${order.paymentDetails.cardNumber.slice(-4)}`,
      expiryDate: order.paymentDetails.expiryDate,
    } : { cardNumber: 'N/A', expiryDate: 'N/A' },
    createdAt: order.createdAt,
  }));

  return (
    <div style={{
      backgroundColor: '#000000',
      color: '#FFFFFF',
      minHeight: '100vh',
      fontFamily: "'Playfair Display', serif",
    }}>
      <header style={{
        backgroundColor: '#000000',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #D4AF37',
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
              margin: 0,
            }}>
              LuxeLane
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#E0E0E0',
              margin: 0,
            }}>
              Elevate Your Everyday.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '16px', color: '#D4AF37' }}>
            Hello {user ? user.name : 'Guest'}
          </span>
          <Link to="/products">
            <button
              style={{
                padding: '10px 20px',
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
                transition: 'background-color 0.3s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D4AF37')}
            >
              Cart
            </button>
          </Link>
          <Link to="/orders">
            <button
              style={{
                padding: '10px 20px',
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
              Order History
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
              transition: 'background-color 0.3s',
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
          marginBottom: '40px',
        }}>
          Order History
        </h1>

        {orders.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: '18px', color: '#E0E0E0' }}>
            No orders found.
          </p>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxWidth: '800px',
            margin: '0 auto',
          }}>
            {formattedOrders.map((order) => (
              <div
                key={order.orderId}
                style={{
                  backgroundColor: '#1A1A1A',
                  padding: '20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'transform 0.3s',
                }}
                onClick={() => handleOrderClick(order)}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
              >
                <h3 style={{ fontSize: '20px', color: '#D4AF37', marginBottom: '10px' }}>
                  Order ID: {order.orderId}
                </h3>
                <p style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '5px' }}>
                  Date: {new Date(order.createdAt).toLocaleDateString()}
                </p>
                <p style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '5px' }}>
                  Total: ${order.totalPrice.toFixed(2)}
                </p>
                <p style={{ fontSize: '16px', color: '#D4AF37', marginBottom: '5px' }}>
                  Status: {order.currentStatus.charAt(0).toUpperCase() + order.currentStatus.slice(1)}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {modalOpen && selectedOrder && (
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
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#1A1A1A',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative',
          }}>
            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: '#D4AF37',
                color: '#000000',
                border: 'none',
                borderRadius: '5px',
                padding: '5px 10px',
                cursor: 'pointer',
                fontFamily: "'Roboto', sans-serif",
              }}
            >
              Close
            </button>
            <h2 style={{ fontSize: '24px', color: '#D4AF37', marginBottom: '20px' }}>
              Order Details - ID: {selectedOrder.orderId}
            </h2>
            <p style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '10px' }}>
              <strong>Date:</strong> {new Date(selectedOrder.createdAt).toLocaleDateString()}
            </p>
            <p style={{ fontSize: '16px', color: '#D4AF37', marginBottom: '10px' }}>
              <strong>Current Status:</strong> {selectedOrder.currentStatus.charAt(0).toUpperCase() + selectedOrder.currentStatus.slice(1)}
            </p>
            <h3 style={{ fontSize: '18px', color: '#D4AF37', marginBottom: '10px' }}>
              Status History
            </h3>
            <ul style={{ listStyleType: 'none', padding: 0, marginBottom: '20px' }}>
              {selectedOrder.statusHistory.map((status, index) => (
                <li key={index} style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '5px' }}>
                  {status.status.charAt(0).toUpperCase() + status.status.slice(1)} - {new Date(status.updatedAt).toLocaleString()}
                </li>
              ))}
            </ul>
            <h3 style={{ fontSize: '18px', color: '#D4AF37', marginBottom: '10px' }}>
              Items
            </h3>
            <ul style={{ listStyleType: 'none', padding: 0, marginBottom: '20px' }}>
              {selectedOrder.items.map((item, index) => (
                <li key={index} style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '10px' }}>
                  Product ID: {item.productId} | Variant: {item.variantName} | Quantity: {item.quantity} | Price: ${item.price.toFixed(2)}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '10px' }}>
              <strong>Subtotal:</strong> ${(selectedOrder.totalPrice - selectedOrder.taxes - selectedOrder.shippingFee + selectedOrder.discountApplied).toFixed(2)}
            </p>
            {selectedOrder.discountApplied > 0 && (
              <p style={{ fontSize: '16px', color: '#D4AF37', marginBottom: '10px' }}>
                <strong>Discount ({selectedOrder.discountCode}):</strong> -${selectedOrder.discountApplied.toFixed(2)}
              </p>
            )}
            <p style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '10px' }}>
              <strong>Taxes:</strong> ${selectedOrder.taxes.toFixed(2)}
            </p>
            <p style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '10px' }}>
              <strong>Shipping Fee:</strong> ${selectedOrder.shippingFee.toFixed(2)}
            </p>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#D4AF37', marginBottom: '20px' }}>
              <strong>Total:</strong> ${selectedOrder.totalPrice.toFixed(2)}
            </p>

            {/* Points Information */}
            {selectedOrder.pointsEarned > 0 || selectedOrder.pointsUsed > 0 ? (
              <div style={{ 
                backgroundColor: '#222222', 
                padding: '15px', 
                borderRadius: '8px', 
                marginBottom: '20px' 
              }}>
                <h3 style={{ fontSize: '18px', color: '#D4AF37', marginBottom: '10px' }}>
                  Loyalty Points
                </h3>
                {selectedOrder.pointsEarned > 0 && (
                  <p style={{ fontSize: '16px', color: '#55FF55', marginBottom: '5px' }}>
                    <strong>Points Earned:</strong> +{selectedOrder.pointsEarned}
                  </p>
                )}
                {selectedOrder.pointsUsed > 0 && (
                  <p style={{ fontSize: '16px', color: '#FF7F7F', marginBottom: '5px' }}>
                    <strong>Points Used:</strong> -{selectedOrder.pointsUsed}
                  </p>
                )}
              </div>
            ) : null}

            <h3 style={{ fontSize: '18px', color: '#D4AF37', marginBottom: '10px' }}>
              Shipping Address
            </h3>
            <p style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '20px' }}>
              {selectedOrder.shippingAddress.street}, {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}, {selectedOrder.shippingAddress.zip}, {selectedOrder.shippingAddress.country}
            </p>
            <h3 style={{ fontSize: '18px', color: '#D4AF37', marginBottom: '10px' }}>
              Payment Details
            </h3>
            <p style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '10px' }}>
              <strong>Card Number:</strong> {selectedOrder.paymentDetails.cardNumber}
            </p>
            <p style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '10px' }}>
              <strong>Expiry Date:</strong> {selectedOrder.paymentDetails.expiryDate}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
