import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { AuthContext } from '../App';
import { toast } from 'react-toastify';

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
            setReviews((prevReviews) => [...prevReviews, review]);
        });

        return () => newSocket.close();
    }, [id]);

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setReviewError('');
        
        if (!newReview.comment) {
            setReviewError('Please enter a comment.');
            return;
        }
        
        if (!newReview.rating) {
            setReviewError('Please select a rating.');
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const config = token ? {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            } : {
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            const reviewPayload = {
                userName: user ? user.name : 'Anonymous',
                comment: newReview.comment,
                rating: Number(newReview.rating)
            };
            
            const response = await axios.post(
                `${API_URL}/api/products/${id}/review`,
                reviewPayload,
                config
            );
            
            // Update reviews with the server response
            setReviews(prevReviews => [...prevReviews, response.data]);
            
            // Reset form
            setNewReview({ comment: '', rating: 0 });
            setReviewError('');
            
            // Show success message
            toast.success('Review submitted successfully!');
            
        } catch (error) {
            console.error('Error submitting review:', error);
            
            if (error.response?.status === 401 && !user) {
                // Try submitting as anonymous if authentication fails
                try {
                    const anonymousPayload = {
                        userName: 'Anonymous',
                        comment: newReview.comment,
                        rating: Number(newReview.rating)
                    };
                    
                    const response = await axios.post(
                        `${API_URL}/api/products/${id}/review`,
                        anonymousPayload,
                        { headers: { 'Content-Type': 'application/json' } }
                    );
                    
                    setReviews(prevReviews => [...prevReviews, response.data]);
                    setNewReview({ comment: '', rating: 0 });
                    setReviewError('');
                    toast.success('Review submitted anonymously!');
                    
                } catch (retryError) {
                    console.error('Error submitting anonymous review:', retryError);
                    setReviewError('Failed to submit review. Please try again later.');
                    toast.error('Failed to submit review');
                }
            } else {
                setReviewError(
                    error.response?.data?.message || 
                    'Failed to submit review. Please try again.'
                );
                toast.error('Failed to submit review');
            }
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
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '16px',
                            color: '#D4AF37',
                            marginBottom: '5px'
                        }}>
                            Your Rating:
                        </label>
                        <StarRating 
                            value={newReview.rating} 
                            onChange={(value) => setNewReview({...newReview, rating: value})} 
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