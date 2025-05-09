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
    const [localReviews, setLocalReviews] = useState([]);

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
        
        // Load any locally stored reviews from localStorage
        const storedReviews = localStorage.getItem(`local_reviews_${id}`);
        if (storedReviews) {
            setLocalReviews(JSON.parse(storedReviews));
        }
    }, [id]);

    useEffect(() => {
        const newSocket = io(API_URL);
        newSocket.on(`product:${id}:review`, (review) => {
            setReviews((prevReviews) => [...prevReviews, review]);
        });

        return () => newSocket.close();
    }, [id]);

    // Combine server reviews and local reviews for display
    const displayReviews = [...reviews, ...localReviews];

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
        
        try {
            // Always create a local review for immediate feedback
            const localReview = {
                userName: user ? user.name : 'Anonymous',
                comment: newReview.comment,
                rating: user && newReview.rating ? Number(newReview.rating) : null,
                createdAt: new Date().toISOString(),
                isLocal: true
            };
            
            // Add to local reviews and save to localStorage
            const updatedLocalReviews = [...localReviews, localReview];
            setLocalReviews(updatedLocalReviews);
            localStorage.setItem(`local_reviews_${id}`, JSON.stringify(updatedLocalReviews));
            
            // Reset form
            setNewReview({ comment: '', rating: 0 });
            setReviewSuccess('Review submitted!');
            
            // Clear success message after 3 seconds
            setTimeout(() => {
                setReviewSuccess('');
            }, 3000);
            
            // Try to send to server in background
            if (user) {
                const token = localStorage.getItem('token');
                
                if (token) {
                    // For authenticated reviews with rating
                    try {
                        const reviewPayload = {
                            comment: newReview.comment,
                            rating: Number(newReview.rating) || null
                        };
                        
                        await axios.post(
                            `${API_URL}/api/products/${id}/review`,
                            reviewPayload,
                            {
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                }
                            }
                        );
                        
                        // If successful, update success message
                        setReviewSuccess('Review submitted and saved to server!');
                        setTimeout(() => setReviewSuccess(''), 3000);
                    } catch (serverError) {
                        console.error('Server review submission failed, but saved locally:', serverError);
                        // No need to show error as we already have a local review
                    }
                }
            } else {
                // Anonymous review attempt
                try {
                    const anonymousReview = {
                        comment: newReview.comment
                    };
                    
                    await axios.post(
                        `${API_URL}/api/products/${id}/review`,
                        anonymousReview
                    );
                    
                    // If successful, update success message
                    setReviewSuccess('Review submitted and saved to server!');
                    setTimeout(() => setReviewSuccess(''), 3000);
                } catch (anonError) {
                    console.error('Anonymous review failed, but saved locally:', anonError);
                    // No need to show error as we already have a local review
                }
            }
        } catch (error) {
            console.error('Error handling review:', error);
            setReviewError('There was a problem saving your review.');
        }
    };

    const handleAddToCart = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!selectedVariant) {
            setCartMessage('Please select a variant.');
            return;
        }

        const variant = product.variants.find(v => v.name === selectedVariant);
        const price = variant.price;

        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No token found');

            await axios.post(
                `${CART_API_URL}/cart/add`,
                {
                    product_id: product._id,
                    quantity,
                    price
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setCartMessage('Item added to cart successfully!');
            setTimeout(() => setCartMessage(''), 3000);
        } catch (error) {
            console.error('Error adding to cart:', error);
            setCartMessage('Failed to add item to cart.');
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
                    {user && (
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
                    )}
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
                {displayReviews.length === 0 ? (
                    <p style={{ color: '#E0E0E0' }}>No reviews yet.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, marginBottom: '30px' }}>
                        {displayReviews.map((review, index) => (
                            <li key={index} style={{
                                backgroundColor: review.isLocal ? '#2A2A1A' : '#1A1A1A',
                                padding: '15px',
                                borderRadius: '10px',
                                marginBottom: '10px',
                                border: review.isLocal ? '1px solid #D4AF37' : 'none'
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
                                        {review.isLocal && <span style={{ fontSize: '12px', marginLeft: '8px' }}>(Your review)</span>}
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
                        Submit Review
                    </button>
                </div>
            </main>
        </div>
    );
};

export default ProductDetails;