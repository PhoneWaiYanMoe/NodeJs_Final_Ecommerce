import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Cart = () => {
    const navigate = useNavigate();
    const [cartSummary, setCartSummary] = useState(null);
    const [discountCode, setDiscountCode] = useState('');
    const [checkoutData, setCheckoutData] = useState({
        shippingAddress: '123 Main St, City, Country',
        paymentDetails: 'Credit Card: **** **** **** 1234'
    });
    const [error, setError] = useState('');

    const CART_API_URL = 'https://nodejs-final-ecommerce-1.onrender.com/cart';
    const ACCOUNT_API_URL = 'https://nodejs-final-ecommerce.onrender.com/user'; // Replace with actual ngrok URL

    // Fetch cart summary
    useEffect(() => {
        const fetchCartSummary = async () => {
            try {
                const response = await axios.get(`${CART_API_URL}/summary`, {
                    headers: {
                        'ngrok-skip-browser-warning': 'true'
                    }
                });
                setCartSummary(response.data);
            } catch (error) {
                console.error('Error fetching cart summary:', error);
                setError('Failed to load cart.');
            }
        };
        fetchCartSummary();
    }, []);

    // Add item to cart
    const handleAddToCart = async () => {
        try {
            const productId = '507f1f77bcf86cd799439011'; // Replace with a real product ID from product-service
            const quantity = 1;
            const price = 10.0; // Should fetch from product-service

            await axios.post(`${CART_API_URL}/add`, {
                product_id: productId,
                quantity,
                price
            }, {
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            // Refresh cart summary
            const response = await axios.get(`${CART_API_URL}/summary`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            setCartSummary(response.data);
        } catch (error) {
            console.error('Error adding to cart:', error);
            setError('Failed to add item to cart.');
        }
    };

    // Update item quantity
    const handleUpdateQuantity = async (itemId, newQuantity) => {
        try {
            await axios.put(`${CART_API_URL}/update/${itemId}`, {
                quantity: newQuantity
            }, {
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            // Refresh cart summary
            const response = await axios.get(`${CART_API_URL}/summary`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            setCartSummary(response.data);
        } catch (error) {
            console.error('Error updating quantity:', error);
            setError('Failed to update quantity.');
        }
    };

    // Remove item from cart
    const handleRemoveItem = async (itemId) => {
        try {
            await axios.delete(`${CART_API_URL}/remove/${itemId}`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            // Refresh cart summary
            const response = await axios.get(`${CART_API_URL}/summary`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            setCartSummary(response.data);
        } catch (error) {
            console.error('Error removing item:', error);
            setError('Failed to remove item.');
        }
    };

    // Apply discount code
    const handleApplyDiscount = async () => {
        try {
            await axios.post(`${CART_API_URL}/apply-discount`, {
                code: discountCode
            }, {
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            // Refresh cart summary
            const response = await axios.get(`${CART_API_URL}/summary`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            setCartSummary(response.data);
            setError('');
        } catch (error) {
            console.error('Error applying discount:', error);
            setError(error.response?.data?.message || 'Invalid or expired discount code.');
        }
    };

    // Handle checkout
    const handleCheckout = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            // Simulate payment (hardcoded success for now)
            const paymentSuccess = true;
            if (!paymentSuccess) {
                throw new Error('Payment failed');
            }

            await axios.post(`${CART_API_URL}/checkout`, checkoutData, {
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            // Clear cart and redirect
            setCartSummary(null);
            alert('Checkout successful! Order management will be implemented in the next step.');
            navigate('/products');
        } catch (error) {
            console.error('Error during checkout:', error);
            setError(error.response?.data?.message || 'Checkout failed. Please try again.');
        }
    };

    // Handle logout
    const handleLogout = async () => {
        try {
            await axios.post(`${ACCOUNT_API_URL}/logout`, {}, {
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            localStorage.removeItem('user');
            navigate('/login');
        } catch (error) {
            console.error('Error logging out:', error);
            setError('Failed to logout.');
        }
    };

    return (
        <div style={{
            backgroundColor: '#000000',
            color: '#FFFFFF',
            minHeight: '100vh',
            fontFamily: "'Playfair Display', serif",
            padding: '20px'
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
                        src="/logo_placeholder.png"
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
                <div>
                    <Link to="/products" style={{
                        padding: '10px 20px',
                        backgroundColor: '#D4AF37',
                        color: '#000000',
                        borderRadius: '5px',
                        textDecoration: 'none',
                        fontFamily: "'Roboto', sans-serif",
                        marginRight: '10px'
                    }}>
                        Back to Products
                    </Link>
                    {localStorage.getItem('user') ? (
                        <button
                            onClick={handleLogout}
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
                            Logout
                        </button>
                    ) : (
                        <Link to="/login" style={{
                            padding: '10px 20px',
                            backgroundColor: '#D4AF37',
                            color: '#000000',
                            borderRadius: '5px',
                            textDecoration: 'none',
                            fontFamily: "'Roboto', sans-serif"
                        }}>
                            Login
                        </Link>
                    )}
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
                    Your Cart
                </h1>

                {error && (
                    <p style={{
                        color: '#FF5555',
                        textAlign: 'center',
                        marginBottom: '20px'
                    }}>
                        {error}
                    </p>
                )}

                {/* Cart Items */}
                <div style={{
                    backgroundColor: '#1A1A1A',
                    padding: '30px',
                    borderRadius: '10px',
                    marginBottom: '30px'
                }}>
                    {!cartSummary || !cartSummary.items || cartSummary.items.length === 0 ? (
                        <p style={{ color: '#E0E0E0' }}>Your cart is empty.</p>
                    ) : (
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            color: '#FFFFFF',
                            fontFamily: "'Roboto', sans-serif"
                        }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #D4AF37' }}>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Product ID</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Quantity</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Price</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Total</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cartSummary.items.map((item) => (
                                    <tr key={item._id} style={{ borderBottom: '1px solid #333333' }}>
                                        <td style={{ padding: '10px' }}>{item.productId}</td>
                                        <td style={{ padding: '10px' }}>
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                min="1"
                                                onChange={(e) => handleUpdateQuantity(item._id, Number(e.target.value))}
                                                style={{
                                                    width: '60px',
                                                    padding: '5px',
                                                    backgroundColor: '#E0E0E0',
                                                    border: 'none',
                                                    borderRadius: '5px',
                                                    color: '#000000'
                                                }}
                                            />
                                        </td>
                                        <td style={{ padding: '10px' }}>${item.price}</td>
                                        <td style={{ padding: '10px' }}>${(item.price * item.quantity).toFixed(2)}</td>
                                        <td style={{ padding: '10px' }}>
                                            <button
                                                onClick={() => handleRemoveItem(item._id)}
                                                style={{
                                                    padding: '5px 10px',
                                                    backgroundColor: '#FF5555',
                                                    color: '#FFFFFF',
                                                    border: 'none',
                                                    borderRadius: '5px',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.3s'
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FF7777')}
                                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FF5555')}
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    <button
                        onClick={handleAddToCart}
                        style={{
                            marginTop: '20px',
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
                        Add Item (Test)
                    </button>
                </div>

                {/* Discount Code and Checkout */}
                {cartSummary && cartSummary.items && cartSummary.items.length > 0 && (
                    <div style={{
                        backgroundColor: '#1A1A1A',
                        padding: '30px',
                        borderRadius: '10px',
                        maxWidth: '500px',
                        margin: '0 auto'
                    }}>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <input
                                type="text"
                                placeholder="Enter Discount Code"
                                value={discountCode}
                                onChange={(e) => setDiscountCode(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    backgroundColor: '#E0E0E0',
                                    border: 'none',
                                    borderRadius: '5px',
                                    color: '#000000',
                                    fontFamily: "'Roboto', sans-serif"
                                }}
                            />
                            <button
                                onClick={handleApplyDiscount}
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
                                Apply
                            </button>
                        </div>
                        <p style={{
                            fontSize: '16px',
                            color: '#E0E0E0',
                            marginBottom: '15px'
                        }}>
                            Subtotal: ${cartSummary.subtotal?.toFixed(2) || '0.00'}
                        </p>
                        <p style={{
                            fontSize: '16px',
                            color: '#E0E0E0',
                            marginBottom: '15px'
                        }}>
                            Taxes: ${cartSummary.taxes?.toFixed(2) || '0.00'}
                        </p>
                        <p style={{
                            fontSize: '16px',
                            color: '#E0E0E0',
                            marginBottom: '15px'
                        }}>
                            Shipping Fee: ${cartSummary.shippingFee?.toFixed(2) || '0.00'}
                        </p>
                        <p style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#D4AF37',
                            marginBottom: '20px'
                        }}>
                            Total: ${cartSummary.total?.toFixed(2) || '0.00'}
                        </p>
                        <input
                            type="text"
                            placeholder="Shipping Address"
                            value={checkoutData.shippingAddress}
                            onChange={(e) => setCheckoutData({ ...checkoutData, shippingAddress: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '10px',
                                marginBottom: '15px',
                                backgroundColor: '#E0E0E0',
                                border: 'none',
                                borderRadius: '5px',
                                color: '#000000',
                                fontFamily: "'Roboto', sans-serif"
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Payment Details"
                            value={checkoutData.paymentDetails}
                            onChange={(e) => setCheckoutData({ ...checkoutData, paymentDetails: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '10px',
                                marginBottom: '20px',
                                backgroundColor: '#E0E0E0',
                                border: 'none',
                                borderRadius: '5px',
                                color: '#000000',
                                fontFamily: "'Roboto', sans-serif"
                            }}
                        />
                        <button
                            onClick={handleCheckout}
                            style={{
                                width: '100%',
                                padding: '10px',
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
                            Checkout
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Cart;