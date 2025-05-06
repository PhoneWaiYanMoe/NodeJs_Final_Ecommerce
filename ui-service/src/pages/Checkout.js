import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';

const Checkout = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [shippingAddress, setShippingAddress] = useState({
        street: '',
        city: '',
        state: '',
        zip: '',
        country: ''
    });
    const [paymentDetails, setPaymentDetails] = useState({
        cardNumber: '',
        expiryDate: '',
        cvv: ''
    });
    const [message, setMessage] = useState('');

    const CART_API_URL = 'https://nodejs-final-ecommerce-1.onrender.com/cart';

    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    const handleShippingChange = (e) => {
        const { name, value } = e.target;
        setShippingAddress({ ...shippingAddress, [name]: value });
    };

    const handlePaymentChange = (e) => {
        const { name, value } = e.target;
        setPaymentDetails({ ...paymentDetails, [name]: value });
    };

    const handleCheckout = async () => {
        if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zip || !shippingAddress.country) {
            setMessage('Please fill in all shipping address fields.');
            return;
        }
        if (!paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv) {
            setMessage('Please fill in all payment details.');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No token found');

            const response = await axios.post(
                `${CART_API_URL}/checkout`,
                {
                    shippingAddress,
                    paymentDetails
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setMessage(`Checkout successful! Order ID: ${response.data.orderId}`);
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
            {/* Header */}
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

            {/* Main Content */}
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
                    {/* Shipping Address */}
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
                            Shipping Address
                        </h3>
                        <input
                            type="text"
                            name="street"
                            placeholder="Street Address"
                            value={shippingAddress.street}
                            onChange={handleShippingChange}
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
                            name="city"
                            placeholder="City"
                            value={shippingAddress.city}
                            onChange={handleShippingChange}
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
                            name="state"
                            placeholder="State"
                            value={shippingAddress.state}
                            onChange={handleShippingChange}
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
                            name="zip"
                            placeholder="ZIP Code"
                            value={shippingAddress.zip}
                            onChange={handleShippingChange}
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
                            name="country"
                            placeholder="Country"
                            value={shippingAddress.country}
                            onChange={handleShippingChange}
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

                    {/* Payment Details */}
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

                    {/* Submit Button */}
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
