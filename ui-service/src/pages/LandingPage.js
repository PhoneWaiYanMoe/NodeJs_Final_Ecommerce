import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';

const LandingPage = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [categories, setCategories] = useState({
    'New Products': [],
    'Best Sellers': [],
    Laptops: [],
    Monitors: [],
    Accessories: [],
    'Hard Drives': [],
  });
  const API_URL = 'https://product-management-soyo.onrender.com/api/products';

  const fetchBestSellerProducts = async () => {
    try {
      // Use the existing best-sellers endpoint
      const response = await axios.get(`${API_URL}/best-sellers`, { params: { limit: 4 } });
      
      // Check if the response contains products directly or in a nested object
      const products = response.data.products || response.data || [];
      
      // Update the categories state with the best sellers
      setCategories(prevCategories => ({
        ...prevCategories,
        'Best Sellers': products
      }));
      
      console.log('Best seller products fetched:', products);
    } catch (error) {
      console.error('Error fetching best seller products:', error);
      // If the API call fails, set an empty array for best sellers
      setCategories(prevCategories => ({
        ...prevCategories,
        'Best Sellers': []
      }));
    }
  };

  useEffect(() => {
    const fetchCategoryProducts = async (category) => {
      try {
        let url = API_URL;
        const params = { limit: 4 }; // Show 4 products per category

        if (category === 'New Products') {
          params.sortBy = 'createdAt';
          params.order = 'desc';
          params.page = 1;
        } else if (category === 'Best Sellers') {
          url = `${API_URL}/best-sellers`;
        } else {
          params.category = category;
          params.page = 1;
        }

        const response = await axios.get(url, { params });
        return response.data.products || [];
      } catch (error) {
        console.error(`Error fetching ${category} products:`, error);
        return [];
      }
    };

    const loadCategories = async () => {
      // Create a map of category name to fetch function
      const categoryPromises = Object.keys(categories).map(async (category) => {
        let products = [];
        
        if (category === 'Best Sellers') {
          // Use the specific function for best sellers
          await fetchBestSellerProducts();
          // Return empty object as the state is already updated in fetchBestSellerProducts
          return {};
        } else {
          // Use the existing function for other categories
          products = await fetchCategoryProducts(category);
          return { [category]: products };
        }
      });
      
      const results = await Promise.all(categoryPromises);
      const updatedCategories = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      
      // Only update categories that weren't handled specifically
      setCategories(prevCategories => ({
        ...prevCategories,
        ...updatedCategories
      }));
    };

    loadCategories();
  }, []);

  const handleProductClick = async (productId) => {
    try {
      // Fetch all products with the same sorting as Products page (name: asc)
      const response = await axios.get(API_URL, {
        params: {
          sortBy: 'name',
          order: 'asc',
          limit: 1000, // Fetch a large number to get all products
        },
      });
      const allProducts = response.data.products || [];

      // Find the index of the clicked product
      const productIndex = allProducts.findIndex(product => product._id === productId);
      if (productIndex === -1) {
        console.error('Product not found in the list');
        navigate('/products?page=1');
        return;
      }

      // Calculate the page number (5 products per page on Products page)
      const productsPerPage = 5;
      const page = Math.floor(productIndex / productsPerPage) + 1;

      // Navigate to the Products page with the calculated page
      navigate(`/products?page=${page}`);
    } catch (error) {
      console.error('Error calculating product page:', error);
      navigate('/products?page=1');
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
      fontFamily: "'Playfair Display', serif",
    }}>
      {/* Header */}
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
          <Link to="/profile" style={{ textDecoration: 'none' }}>
            <span style={{
              fontSize: '16px',
              color: '#D4AF37',
              cursor: 'pointer',
              transition: 'color 0.3s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#E0E0E0')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#D4AF37')}
            >
              Hello, {user ? user.name : 'Guest'}
            </span>
          </Link>
          {user && (
            <>
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
            </>
          )}
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

      {/* Main Content */}
      <main style={{ padding: '40px' }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 'bold',
          color: '#D4AF37',
          textAlign: 'center',
          marginBottom: '40px',
        }}>
          Welcome to LuxeLane
        </h1>

        {Object.entries(categories).map(([category, products]) => (
          <section key={category} style={{ marginBottom: '40px' }}>
            <h2 style={{
              fontSize: '24px',
              color: '#D4AF37',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              {category}
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '20px',
              padding: '0 20px',
            }}>
              {products.length > 0 ? (
                products.map((product) => (
                  <div
                    key={product._id}
                    onClick={() => handleProductClick(product._id)}
                    style={{
                      backgroundColor: '#1A1A1A',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
                      transition: 'transform 0.3s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
                  >
                    <img
                      src={product.images[0] || 'https://via.placeholder.com/200'}
                      alt={product.name}
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                      }}
                    />
                    <div style={{ padding: '15px' }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#FFFFFF',
                        marginBottom: '10px',
                      }}>
                        {product.name}
                      </h3>
                      <p style={{
                        fontSize: '16px',
                        color: '#D4AF37',
                        marginBottom: '5px',
                      }}>
                        ₫{Math.min(...product.variants.map(v => v.price))} - ₫{Math.max(...product.variants.map(v => v.price))}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: '#E0E0E0', textAlign: 'center' }}>No products available.</p>
              )}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};

export default LandingPage;