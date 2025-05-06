import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const [categories, setCategories] = useState({
    'New Products': [],
    'Best Sellers': [],
    Laptops: [],
    Monitors: [],
    'Hard Drives': [],
  });
  const API_URL = 'https://product-management-soyo.onrender.com/api/products';

  useEffect(() => {
    const fetchCategoryProducts = async (category) => {
      try {
        let url = API_URL;
        const params = { limit: 4 }; // Show 4 products per category

        if (category === 'New Products') {
          // Fetch newest products by sorting on createdAt
          params.sortBy = 'createdAt';
          params.order = 'desc';
          params.page = 1;
        } else if (category === 'Best Sellers') {
          // Fetch best sellers using the dedicated endpoint
          url = `${API_URL}/best-sellers`;
        } else {
          // Fetch products by category (e.g., Laptops, Monitors)
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
      const categoryPromises = Object.keys(categories).map(async (category) => {
        const products = await fetchCategoryProducts(category);
        return { [category]: products };
      });
      const results = await Promise.all(categoryPromises);
      const updatedCategories = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      setCategories(updatedCategories);
    };

    loadCategories();
  }, []);

  const getProductPage = (category, productId) => {
    // Simplified: always start on page 1; Products page handles pagination
    return 1;
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
          <Link to="/products" style={{ textDecoration: 'none' }}>
            <span style={{
              fontSize: '16px',
              color: '#D4AF37',
              cursor: 'pointer',
              transition: 'color 0.3s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#E0E0E0')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#D4AF37')}
            >
              Browse All Products
            </span>
          </Link>
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <span style={{
              fontSize: '16px',
              color: '#D4AF37',
              cursor: 'pointer',
              transition: 'color 0.3s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#E0E0E0')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#D4AF37')}
            >
              Login
            </span>
          </Link>
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
                  <Link
                    to={`/products?category=${encodeURIComponent(category)}&page=1`}
                    key={product._id}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div
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
                          ${Math.min(...product.variants.map(v => v.price))} - ${Math.max(...product.variants.map(v => v.price))}
                        </p>
                      </div>
                    </div>
                  </Link>
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