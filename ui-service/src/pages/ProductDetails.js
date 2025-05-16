import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { AuthContext } from '../App';

// Star Rating Component
const StarRating = ({ value, onChange, readOnly = false }) => {
  const [hover, setHover] = useState(0);
  
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      {[...Array(5)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <span
            key={index}
            style={{
              cursor: readOnly ? 'default' : 'pointer',
              color: ratingValue <= (hover || value) ? '#D4AF37' : '#444444',
              fontSize: '24px',
              marginRight: '5px'
            }}
            onClick={() => !readOnly && onChange(ratingValue)}
            onMouseEnter={() => !readOnly && setHover(ratingValue)}
            onMouseLeave={() => !readOnly && setHover(0)}
          >
            ★
          </span>
        );
      })}
      {!readOnly && <span style={{ marginLeft: '10px', color: '#E0E0E0' }}>
        {hover || value || ''}
      </span>}
    </div>
  );
};

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [newReview, setNewReview] = useState({ comment: '', rating: 0 });
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [cartMessage, setCartMessage] = useState('');
    const [reviewError, setReviewError] = useState('');
    const [reviewSuccess, setReviewSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const API_URL = 'https://product-management-soyo.onrender.com';
    const CART_API_URL = 'https://nodejs-final-ecommerce-1.onrender.com';

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await axios.get(`${API_URL}/api/products/${id}`);
                setProduct(response.data);
                setReviews(response.data.reviews || []);
            } catch (error) {
                console.error('Error fetching product:', error);
            }
        };
        fetchProduct();
    }, [id]);

    useEffect(() => {
        const newSocket = io(API_URL);
        newSocket.on(`product:${id}:review`, (review) => {
            setReviews((prevReviews) => {
                // Check if this review already exists to prevent duplicates
                const exists = prevReviews.some(r => 
                    r.userName === review.userName && 
                    r.comment === review.comment && 
                    r.rating === review.rating
                );
                
                if (exists) return prevReviews;
                return [...prevReviews, review];
            });
        });

        return () => newSocket.close();
    }, [id]);

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setReviewError('');
        setReviewSuccess('');
        
        if (!newReview.comment) {
            setReviewError('Please enter a comment.');
            return;
        }
        
        if (!user && newReview.rating) {
            setReviewError('You need to be logged in to submit a rated review. You can still submit comments anonymously.');
            return;
        }
        
        // Prevent duplicate submissions
        if (submitting) {
            return;
        }
        
        setSubmitting(true);
        
        try {
            let reviewPayload = {
                comment: newReview.comment
            };
            
            // If user is logged in and has provided a rating
            if (user && newReview.rating) {
                const token = localStorage.getItem('token');
                if (!token) {
                    setReviewError('Authentication token not found. Please log in again.');
                    setSubmitting(false);
                    return;
                }
                
                reviewPayload.rating = Number(newReview.rating);
                
                const response = await axios.post(
                    `${API_URL}/api/products/${id}/review`,
                    reviewPayload,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                if (response.data && response.data.review) {
                    // Don't update the state directly - the socket will handle this
                    // to prevent duplicates
                    setNewReview({ comment: '', rating: 0 });
                    setReviewSuccess('Review submitted successfully!');
                    setTimeout(() => setReviewSuccess(''), 3000);
                }
            } else {
                // For anonymous reviews
                reviewPayload.userName = user ? user.name : 'Anonymous';
                
                const response = await axios.post(
                    `${API_URL}/api/products/${id}/review`,
                    reviewPayload
                );
                
                if (response.data && response.data.review) {
                    // Don't update the state directly - the socket will handle this
                    // to prevent duplicates  
                    setNewReview({ comment: '', rating: 0 });
                    setReviewSuccess('Comment submitted successfully!');
                    setTimeout(() => setReviewSuccess(''), 3000);
                }
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            
            if (error.response?.status === 401) {
                setReviewError('Authentication failed. Please log in again to submit a rated review.');
            } else {
                setReviewError(`Failed to submit review: ${error.message}`);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddToCart = async () => {
        if (!selectedVariant) {
            setCartMessage('Please select a variant.');
            return;
        }

        const variant = product.variants.find(v => v.name === selectedVariant);
        const price = variant.price;

        try {
            // Get token if available (for logged-in users)
            const token = localStorage.getItem("token");
            const sessionId = localStorage.getItem("guestSessionId");
            
            // Prepare request body
            const requestBody = {
                product_id: product._id,
                variantName: selectedVariant,
                quantity,
                price
            };
            
            // If this is a guest and we have a sessionId, include it
            if (!token && sessionId) {
                requestBody.sessionId = sessionId;
            }
            
            // Prepare headers
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            // Log the request details for debugging
            console.log('Add to cart request:', {
                url: `${CART_API_URL}/cart/add`,
                body: requestBody,
                headers
            });
            
            // Make the API call
            const response = await axios.post(
                `${CART_API_URL}/cart/add`,
                requestBody,
                { headers }
            );
            
            console.log('Add to cart response:', response.data);
            
            // If this is a guest and we got a sessionId back, store it
            if (!token && response.data.sessionId) {
                localStorage.setItem("guestSessionId", response.data.sessionId);
                console.log('Saved guest sessionId:', response.data.sessionId);
            }

            setCartMessage('Item added to cart successfully!');
            setTimeout(() => setCartMessage(''), 3000);
        } catch (error) {
            console.error('Error adding to cart:', error);
            if (error.response) {
                console.error('Error response:', error.response.data);
                setCartMessage(`Failed to add item: ${error.response.data.error || 'Server error'}`);
            } else if (error.request) {
                console.error('No response received');
                setCartMessage('Failed to add item: No response from server');
            } else {
                setCartMessage(`Failed to add item: ${error.message}`);
            }
        }
    };

    // Helper function to render ratings as stars
    const renderStarRating = (rating) => {
        return <StarRating value={parseInt(rating)} readOnly={true} />;
    };

    if (!product) return (
        <div style={{
            backgroundColor: '#000000',
            color: '#FFFFFF',
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily: "'Playfair Display', serif"
        }}>
            Loading...
        </div>
    );

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
                    <span style={{ color: '#D4AF37' }}>
                        {user ? `Welcome, ${user.name}` : 'Guest'}
                    </span>
                    <button 
                        onClick={() => navigate('/cart')}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#D4AF37',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        Cart
                    </button>
                    <button 
                        onClick={() => navigate('/products')}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#D4AF37',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        All Products
                    </button>
                    <button 
                        onClick={() => user ? navigate('/profile') : navigate('/login')}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#D4AF37',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        {user ? 'Profile' : 'Login'}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ padding: '40px' }}>
                <h1 style={{
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color: '#D4AF37',
                    marginBottom: '20px'
                }}>
                    {product.name}
                </h1>
                <p style={{
                    fontSize: '18px',
                    color: '#E0E0E0',
                    marginBottom: '10px'
                }}>
                    Brand: {product.brand}
                </p>
                <div style={{
                    display: 'flex',
                    gap: '20px',
                    marginBottom: '30px',
                    flexWrap: 'wrap'
                }}>
                    {product.images.map((image, index) => (
                        <img
                            key={index}
                            src={image}
                            alt={`${product.name} ${index + 1}`}
                            style={{
                                width: '150px',
                                height: '150px',
                                objectFit: 'cover',
                                border: '2px solid #D4AF37',
                                borderRadius: '10px'
                            }}
                        />
                    ))}
                </div>
                <p style={{
                    fontSize: '16px',
                    color: '#FFFFFF',
                    lineHeight: '1.6',
                    marginBottom: '20px'
                }}>
                    Description: {product.description.split('\n').map((line, index) => (
                        <span key={index}>
                            {line}
                            <br />
                        </span>
                    ))}
                </p>
                <h3 style={{
                    fontSize: '24px',
                    color: '#D4AF37',
                    marginBottom: '10px'
                }}>
                    Variants:
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '20px' }}>
                    {product.variants.map((variant, index) => (
                        <li key={index} style={{
                            fontSize: '16px',
                            color: '#E0E0E0',
                            marginBottom: '5px'
                        }}>
                            {variant.name} - ${variant.price} (Stock: {variant.stock})
                        </li>
                    ))}
                </ul>
                <div style={{ marginBottom: '20px' }}>
                    <select
                        value={selectedVariant || ''}
                        onChange={(e) => setSelectedVariant(e.target.value)}
                        style={{
                            padding: '10px',
                            backgroundColor: '#E0E0E0',
                            border: 'none',
                            borderRadius: '5px',
                            color: '#000000',
                            fontFamily: "'Roboto', sans-serif",
                            marginRight: '10px'
                        }}
                    >
                        <option value="" disabled>Select Variant</option>
                        {product.variants.map((variant, index) => (
                            <option key={index} value={variant.name}>
                                {variant.name} - ${variant.price} (Stock: {variant.stock})
                            </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        style={{
                            width: '60px',
                            padding: '10px',
                            backgroundColor: '#E0E0E0',
                            border: 'none',
                            borderRadius: '5px',
                            color: '#000000',
                            fontFamily: "'Roboto', sans-serif",
                            marginRight: '10px'
                        }}
                    />
                    <button
                        onClick={handleAddToCart}
                        disabled={!selectedVariant}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: !selectedVariant ? '#666666' : '#D4AF37',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '5px',
                            fontFamily: "'Roboto', sans-serif",
                            cursor: !selectedVariant ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.3s'
                        }}
                        onMouseEnter={(e) => {
                            if (selectedVariant) {
                                e.currentTarget.style.backgroundColor = '#E0E0E0';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (selectedVariant) {
                                e.currentTarget.style.backgroundColor = '#D4AF37';
                            }
                        }}
                    >
                        Add to Cart
                    </button>
                    {cartMessage && (
                        <p style={{
                            fontSize: '14px',
                            color: cartMessage.includes('Failed') ? '#FF5555' : '#D4AF37',
                            marginTop: '10px'
                        }}>
                            {cartMessage}
                        </p>
                    )}
                </div>
                <p style={{
                    fontSize: '16px',
                    color: '#E0E0E0',
                    marginBottom: '10px'
                }}>
                    Category: {product.category || 'None'}
                </p>
                <div style={{
                    fontSize: '16px',
                    color: '#E0E0E0',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <span style={{ marginRight: '10px' }}>Average Rating:</span>
                    {product.averageRating ? 
                        renderStarRating(product.averageRating) : 
                        'No reviews'}
                </div>
                <p style={{
                    fontSize: '16px',
                    color: '#E0E0E0',
                    marginBottom: '30px'
                }}>
                    Tags: {product.tags.join(', ') || 'None'}
                </p>

                <h3 style={{
                    fontSize: '24px',
                    color: '#D4AF37',
                    marginBottom: '15px'
                }}>
                    Reviews:
                </h3>
                {reviews.length === 0 ? (
                    <p style={{ color: '#E0E0E0' }}>No reviews yet.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, marginBottom: '30px' }}>
                        {reviews.map((review, index) => (
                            <li key={index} style={{
                                backgroundColor: '#1A1A1A',
                                padding: '15px',
                                borderRadius: '10px',
                                marginBottom: '10px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '5px'
                                }}>
                                    <p style={{
                                        fontSize: '16px',
                                        color: '#D4AF37',
                                        margin: 0
                                    }}>
                                        <strong>{review.userName}</strong>
                                    </p>
                                    {renderStarRating(review.rating || 0)}
                                </div>
                                <p style={{
                                    fontSize: '14px',
                                    color: '#FFFFFF',
                                    marginBottom: '5px'
                                }}>
                                    {review.comment}
                                </p>
                                <p style={{
                                    fontSize: '12px',
                                    color: '#E0E0E0'
                                }}>
                                    {new Date(review.createdAt).toLocaleString()}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}

                <h3 style={{
                    fontSize: '24px',
                    color: '#D4AF37',
                    marginBottom: '15px'
                }}>
                    Add a Review:
                </h3>
                <div style={{
                    backgroundColor: '#1A1A1A',
                    padding: '20px',
                    borderRadius: '10px',
                    maxWidth: '500px'
                }}>
                    {reviewError && (
                        <p style={{
                            color: '#FF5555',
                            marginBottom: '10px'
                        }}>
                            {reviewError}
                        </p>
                    )}
                    {reviewSuccess && (
                        <p style={{
                            color: '#D4AF37',
                            marginBottom: '10px'
                        }}>
                            {reviewSuccess}
                        </p>
                    )}
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '16px',
                            color: '#D4AF37',
                            marginBottom: '5px'
                        }}>
                            Your Rating: {!user && <span style={{ fontSize: '12px' }}>(Login required for rating)</span>}
                        </label>
                        <StarRating 
                            value={newReview.rating} 
                            onChange={(value) => setNewReview({...newReview, rating: value})} 
                            readOnly={!user}
                        />
                    </div>
                    <textarea
                        placeholder="Write your review here..."
                        value={newReview.comment}
                        onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                        style={{
                            width: '100%',
                            height: '100px',
                            padding: '10px',
                            backgroundColor: '#E0E0E0',
                            border: 'none',
                            borderRadius: '5px',
                            color: '#000000',
                            fontFamily: "'Roboto', sans-serif",
                            marginBottom: '15px',
                            resize: 'none'
                        }}
                    />
                    <button
                        type="submit"
                        onClick={handleReviewSubmit}
                        disabled={submitting}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: submitting ? '#666666' : '#D4AF37',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '5px',
                            fontFamily: "'Roboto', sans-serif",
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.3s'
                        }}
                        onMouseEnter={(e) => {
                            if (!submitting) {
                                e.currentTarget.style.backgroundColor = '#E0E0E0';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!submitting) {
                                e.currentTarget.style.backgroundColor = '#D4AF37';
                            }
                        }}
                    >
                        {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                </div>
            </main>
        </div>
    );
};

export default ProductDetails;