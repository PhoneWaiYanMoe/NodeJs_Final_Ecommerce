import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        search: '',
        brand: '',
        category: '',
        minPrice: '',
        maxPrice: ''
    });
    const [sort, setSort] = useState({ sortBy: 'name', order: 'asc' });

    const API_URL = 'https://product-management-soyo.onrender.com';
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await axios.get(`${API_URL}/api/categories`);
                if (Array.isArray(response.data)) {
                    setCategories(response.data);
                } else {
                    console.error('Categories response is not an array:', response.data);
                    setCategories([]);
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
                setCategories([]);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const params = {
                    page: currentPage,
                    limit: 5,
                    sortBy: sort.sortBy,
                    order: sort.order,
                    ...filters
                };
                const response = await axios.get(`${API_URL}/api/products`, { params });
                setProducts(response.data.products || []);
                setTotalPages(response.data.totalPages || 1);
            } catch (error) {
                console.error('Error fetching products:', error);
                setProducts([]);
            }
        };
        fetchProducts();
    }, [currentPage, filters, sort]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters({ ...filters, [name]: value });
        setCurrentPage(1);
    };

    const handleSortChange = (e) => {
        const [sortBy, order] = e.target.value.split(':');
        setSort({ sortBy, order });
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
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
                    <span style={{
                        fontSize: '16px',
                        color: '#D4AF37'
                    }}>
                        Hello {user ? user.name : 'Guest'}
                    </span>
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
                    Product Catalog
                </h1>

                {/* Filters */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '15px',
                    marginBottom: '30px',
                    justifyContent: 'center'
                }}>
                    <input
                        type="text"
                        name="search"
                        placeholder="Search by name or description"
                        value={filters.search}
                        onChange={handleFilterChange}
                        style={{
                            padding: '10px',
                            backgroundColor: '#E0E0E0',
                            border: 'none',
                            borderRadius: '5px',
                            color: '#000000',
                            fontFamily: "'Roboto', sans-serif",
                            width: '200px'
                        }}
                    />
                    <input
                        type="text"
                        name="brand"
                        placeholder="Filter by brand"
                        value={filters.brand}
                        onChange={handleFilterChange}
                        style={{
                            padding: '10px',
                            backgroundColor: '#E0E0E0',
                            border: 'none',
                            borderRadius: '5px',
                            color: '#000000',
                            fontFamily: "'Roboto', sans-serif",
                            width: '200px'
                        }}
                    />
                    <select
                        name="category"
                        value={filters.category}
                        onChange={handleFilterChange}
                        style={{
                            padding: '10px',
                            backgroundColor: '#E0E0E0',
                            border: 'none',
                            borderRadius: '5px',
                            color: '#000000',
                            fontFamily: "'Roboto', sans-serif",
                            width: '200px'
                        }}
                    >
                        <option value="">All Categories</option>
                        {categories.length > 0 ? (
                            categories.map((category) => (
                                <option key={category._id} value={category.name}>
                                    {category.name}
                                </option>
                            ))
                        ) : (
                            <option disabled>No categories available</option>
                        )}
                    </select>
                    <input
                        type="number"
                        name="minPrice"
                        placeholder="Min Price"
                        value={filters.minPrice}
                        onChange={handleFilterChange}
                        style={{
                            padding: '10px',
                            backgroundColor: '#E0E0E0',
                            border: 'none',
                            borderRadius: '5px',
                            color: '#000000',
                            fontFamily: "'Roboto', sans-serif",
                            width: '100px'
                        }}
                    />
                    <input
                        type="number"
                        name="maxPrice"
                        placeholder="Max Price"
                        value={filters.maxPrice}
                        onChange={handleFilterChange}
                        style={{
                            padding: '10px',
                            backgroundColor: '#E0E0E0',
                            border: 'none',
                            borderRadius: '5px',
                            color: '#000000',
                            fontFamily: "'Roboto', sans-serif",
                            width: '100px'
                        }}
                    />
                </div>

                {/* Sorting */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '30px'
                }}>
                    <label style={{
                        marginRight: '10px',
                        fontSize: '16px',
                        color: '#D4AF37'
                    }}>
                        Sort by:
                    </label>
                    <select
                        onChange={handleSortChange}
                        style={{
                            padding: '10px',
                            backgroundColor: '#E0E0E0',
                            border: 'none',
                            borderRadius: '5px',
                            color: '#000000',
                            fontFamily: "'Roboto', sans-serif",
                            width: '200px'
                        }}
                    >
                        <option value="name:asc">Name (A-Z)</option>
                        <option value="name:desc">Name (Z-A)</option>
                        <option value="price:asc">Price (Low to High)</option>
                        <option value="price:desc">Price (High to Low)</option>
                    </select>
                </div>

                {/* Product List */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '30px',
                    padding: '0 20px'
                }}>
                    {products.map((product) => (
                        <div
                            key={product._id}
                            style={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
                                transition: 'transform 0.3s',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
                        >
                            <img
                                src={product.images[0] || 'https://via.placeholder.com/150'}
                                alt={product.name}
                                style={{
                                    width: '100%',
                                    height: '200px',
                                    objectFit: 'cover'
                                }}
                            />
                            <div style={{ padding: '15px' }}>
                                <h3 style={{
                                    fontSize: '20px',
                                    fontWeight: 'bold',
                                    color: '#000000',
                                    marginBottom: '10px'
                                }}>
                                    {product.name}
                                </h3>
                                <p style={{
                                    fontSize: '16px',
                                    color: '#D4AF37',
                                    marginBottom: '5px'
                                }}>
                                    {product.brand}
                                </p>
                                <p style={{
                                    fontSize: '14px',
                                    color: '#666666',
                                    marginBottom: '5px'
                                }}>
                                    Category: {product.category || 'None'}
                                </p>
                                <p style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: '#000000',
                                    marginBottom: '5px'
                                }}>
                                    Price: ${Math.min(...product.variants.map(v => v.price))} - ${Math.max(...product.variants.map(v => v.price))}
                                </p>
                                <p style={{
                                    fontSize: '14px',
                                    color: '#666666',
                                    marginBottom: '10px'
                                }}>
                                    Average Rating: {product.averageRating || 'No reviews'}
                                </p>
                                <Link
                                    to={`/products/${product._id}`}
                                    style={{
                                        display: 'inline-block',
                                        padding: '8px 16px',
                                        backgroundColor: '#D4AF37',
                                        color: '#000000',
                                        textDecoration: 'none',
                                        borderRadius: '5px',
                                        fontFamily: "'Roboto', sans-serif",
                                        transition: 'background-color 0.3s'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D4AF37')}
                                >
                                    View Details
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginTop: '40px'
                }}>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                        <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            style={{
                                margin: '0 5px',
                                padding: '10px 15px',
                                backgroundColor: currentPage === page ? '#D4AF37' : '#E0E0E0',
                                color: currentPage === page ? '#000000' : '#666666',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontFamily: "'Roboto', sans-serif",
                                transition: 'background-color 0.3s'
                            }}
                            onMouseEnter={(e) => {
                                if (currentPage !== page) {
                                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (currentPage !== page) {
                                    e.currentTarget.style.backgroundColor = '#E0E0E0';
                                }
                            }}
                        >
                            {page}
                        </button>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default Products;