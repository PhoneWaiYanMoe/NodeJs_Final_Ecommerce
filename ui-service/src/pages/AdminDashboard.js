import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Chart from 'chart.js/auto';
import { AuthContext } from "../App";

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [users, setUsers] = useState([]);
    const [discounts, setDiscounts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({});
    const [productStats, setProductStats] = useState({});
    const [formData, setFormData] = useState({
        _id: null,
        name: '',
        brand: '',
        description: '',
        images: '',
        variants: '',
        category: '',
        tags: ''
    });
    const [discountForm, setDiscountForm] = useState({
        code: '',
        discount_percentage: '',
        usageLimit: ''
    });
    const [userForm, setUserForm] = useState({
        _id: null,
        email: '',
        password: '',
        name: '',
        role: 'user'
    });
    const [error, setError] = useState('');
    const [productError, setProductError] = useState('');
    const [categoryError, setCategoryError] = useState('');
    const [discountError, setDiscountError] = useState('');
    const [timeInterval, setTimeInterval] = useState('year');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [newStatus, setNewStatus] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [chartType, setChartType] = useState('bar');
    const barChartRef = useRef(null);
    const lineChartRef = useRef(null);
    const pieChartRef = useRef(null);
    const barChartInstance = useRef(null);
    const lineChartInstance = useRef(null);
    const pieChartInstance = useRef(null);

    // API URLs - no trailing slashes to ensure proper URL construction
    const PRODUCT_API_URL = 'https://product-management-soyo.onrender.com/api';
    const ACCOUNT_API_URL = 'https://nodejs-final-ecommerce.onrender.com/user';
    const CART_API_URL = 'https://nodejs-final-ecommerce-1.onrender.com/cart';

    // Helper to ensure authentication headers are properly set before each request
    const setAuthHeader = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No JWT token found in localStorage');
        }
        
        // Set the Authorization header correctly
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return token;
    };

    // Clear any error messages after 5 seconds
    useEffect(() => {
        if (error || productError || categoryError || discountError) {
            const timer = setTimeout(() => {
                setError('');
                setProductError('');
                setCategoryError('');
                setDiscountError('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, productError, categoryError, discountError]);

    const fetchCategories = useCallback(async () => {
        try {
            setAuthHeader();
            const response = await axios.get(`${PRODUCT_API_URL}/categories`);
            
            // Log the response for debugging
            console.log('Categories response:', response.data);
            
            setCategories(Array.isArray(response.data) ? response.data : []);
            setCategoryError('');
        } catch (err) {
            console.error('Categories fetch error:', err);
            setCategories([]);
            setCategoryError(`Failed to fetch categories: ${err.message || 'Unknown error'}`);
            
            if (err.response?.status === 401) {
                console.log('Authentication failed, redirecting to login');
                await logout();
                navigate('/login');
            }
        }
    }, [logout, navigate]);

    const fetchProducts = useCallback(async () => {
        try {
            setAuthHeader();
            const response = await axios.get(`${PRODUCT_API_URL}/products`, {
                params: { limit: 100 }
            });
            
            // Log the response for debugging
            console.log('Products response:', response.data);
            
            setProducts(response.data.products || []);
            setProductError('');
        } catch (err) {
            console.error('Products fetch error:', err);
            setProducts([]);
            setProductError(`Failed to fetch products: ${err.message || 'Unknown error'}`);
            
            if (err.response?.status === 401) {
                console.log('Authentication failed, redirecting to login');
                await logout();
                navigate('/login');
            }
        }
    }, [logout, navigate]);

    const fetchUsers = useCallback(async () => {
        try {
            setAuthHeader();
            const response = await axios.get(`${ACCOUNT_API_URL}/admin/users`);
            
            // Log the response for debugging
            console.log('Users response:', response.data);
            
            if (!Array.isArray(response.data)) {
                throw new Error('Unexpected response format: response.data is not an array');
            }
            
            const mappedUsers = response.data.map(user => ({
                ...user,
                id: user._id || user.id,
                createdAt: user.created_at || user.createdAt
            }));
            
            setUsers(mappedUsers);
            setError('');
        } catch (err) {
            console.error('Users fetch error:', err);
            setError(`Failed to fetch users: ${err.message || 'Unknown error'}`);
            
            if (err.response?.status === 401) {
                console.log('Authentication failed, redirecting to login');
                await logout();
                navigate('/login');
            }
        }
    }, [logout, navigate]);

    const fetchDiscounts = useCallback(async () => {
        try {
            setAuthHeader();
            const response = await axios.get(`${CART_API_URL}/admin/discounts`);
            
            // Log the response for debugging
            console.log('Discounts response:', response.data);
            
            setDiscounts(Array.isArray(response.data) ? response.data.map(discount => ({
                ...discount,
                discountPercentage: discount.discount_percentage || discount.discountPercentage
            })) : []);
            
            setDiscountError('');
        } catch (err) {
            console.error('Discounts fetch error:', err);
            setDiscounts([]);
            setDiscountError(`Failed to fetch discount codes: ${err.message || 'Unknown error'}`);
            
            if (err.response?.status === 401) {
                console.log('Authentication failed, redirecting to login');
                await logout();
                navigate('/login');
            }
        }
    }, [logout, navigate]);

    const fetchOrders = useCallback(async () => {
        try {
            setAuthHeader();
            
            const params = { interval: timeInterval };
            if (startDate && endDate) {
                params.startDate = startDate;
                params.endDate = endDate;
            }
            
            const response = await axios.get(`${CART_API_URL}/admin/orders`, { 
                params,
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                }
            });
            
            // Log the response for debugging
            console.log('Orders response:', response.data);
            
            setOrders(response.data.orders || []);
            setStats(response.data.stats || {});
            
            // Calculate product stats
            if (response.data.orders && response.data.orders.length > 0) {
                const productCount = response.data.orders.reduce((acc, order) => {
                    return acc + (Array.isArray(order.items) ? order.items.length : 0);
                }, 0);
                
                // Extract unique product types
                const productTypes = [...new Set(
                    response.data.orders
                        .filter(order => Array.isArray(order.items))
                        .flatMap(order => order.items.map(item => item.category || 'unknown'))
                )];
                
                setProductStats({
                    totalProducts: productCount,
                    uniqueProductTypes: productTypes.length
                });
            } else {
                setProductStats({
                    totalProducts: 0,
                    uniqueProductTypes: 0
                });
            }
            
            setError('');
        } catch (err) {
            console.error('Orders fetch error:', err);
            setOrders([]);
            setStats({});
            setProductStats({});
            setError(`Failed to fetch orders: ${err.message || 'Unknown error'}`);
            
            if (err.response?.status === 401) {
                console.log('Authentication failed, redirecting to login');
                await logout();
                navigate('/login');
            }
        }
    }, [logout, navigate, timeInterval, startDate, endDate]);

    const renderBarChart = useCallback(() => {
        if (!barChartRef.current) return;
        
        // Destroy previous chart instance if it exists
        if (barChartInstance.current) {
            barChartInstance.current.destroy();
        }
        
        const ctx = barChartRef.current.getContext('2d');
        
        // Calculate total orders count from stats
        const totalOrders = Object.values(stats).reduce((sum, s) => sum + (s.ordersCount || 0), 0);
        
        barChartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Orders Count', 'Total Products Sold', 'Unique Product Types'],
                datasets: [{
                    label: 'Count',
                    data: [
                        totalOrders,
                        productStats.totalProducts || 0,
                        productStats.uniqueProductTypes || 0
                    ],
                    backgroundColor: ['rgba(212, 175, 55, 0.6)', 'rgba(54, 162, 235, 0.6)', 'rgba(255, 99, 132, 0.6)'],
                    borderColor: ['rgba(212, 175, 55, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Count', color: '#FFFFFF' },
                        ticks: { color: '#FFFFFF' }
                    },
                    x: { ticks: { color: '#FFFFFF' } }
                },
                plugins: {
                    legend: { labels: { color: '#FFFFFF' } },
                    title: {
                        display: true,
                        text: 'Order and Product Metrics',
                        color: '#D4AF37',
                        font: { size: 18 }
                    }
                }
            }
        });
    }, [stats, productStats]);

    const renderLineChart = useCallback(() => {
        if (!lineChartRef.current) return;
        
        // Destroy previous chart instance if it exists
        if (lineChartInstance.current) {
            lineChartInstance.current.destroy();
        }
        
        // Get time period labels based on interval
        const periodLabels = Object.keys(stats).sort();
        const revenueData = periodLabels.map(period => stats[period]?.totalRevenue || 0);
        const profitData = periodLabels.map(period => stats[period]?.totalProfit || 0);
        
        const ctx = lineChartRef.current.getContext('2d');
        lineChartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: periodLabels,
                datasets: [
                    {
                        label: 'Revenue',
                        data: revenueData,
                        backgroundColor: 'rgba(255, 206, 86, 0.2)',
                        borderColor: 'rgba(255, 206, 86, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Profit',
                        data: profitData,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Amount (₫)', color: '#FFFFFF' },
                        ticks: {
                            color: '#FFFFFF',
                            callback: function(value) {
                                return '₫' + value.toLocaleString();
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: { 
                        ticks: { color: '#FFFFFF' },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#FFFFFF' } },
                    title: {
                        display: true,
                        text: `Revenue and Profit Over ${timeInterval.charAt(0).toUpperCase() + timeInterval.slice(1)}`,
                        color: '#D4AF37',
                        font: { size: 18 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += '₫' + context.parsed.y.toLocaleString();
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }, [stats, timeInterval]);

    const renderOrderCountChart = useCallback(() => {
        if (!pieChartRef.current) return;
        
        // Destroy previous chart instance if it exists
        if (pieChartInstance.current) {
            pieChartInstance.current.destroy();
        }
        
        // Get time period labels based on interval
        const periodLabels = Object.keys(stats).sort();
        const ordersData = periodLabels.map(period => stats[period]?.ordersCount || 0);
        
        // Only render if we have data
        if (periodLabels.length === 0 || ordersData.every(value => value === 0)) {
            return;
        }
        
        const ctx = pieChartRef.current.getContext('2d');
        pieChartInstance.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: periodLabels,
                datasets: [{
                    data: ordersData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                        'rgba(255, 159, 64, 0.6)',
                        'rgba(199, 199, 199, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(199, 199, 199, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'right',
                        labels: { color: '#FFFFFF' } 
                    },
                    title: {
                        display: true,
                        text: `Orders by ${timeInterval.charAt(0).toUpperCase() + timeInterval.slice(1)}`,
                        color: '#D4AF37',
                        font: { size: 18 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.formattedValue + ' orders';
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }, [stats, timeInterval]);

    const fetchData = useCallback(async () => {
        try {
            // Fetch data in parallel to improve performance
            await Promise.all([
                fetchCategories(),
                fetchProducts(),
                fetchUsers(),
                fetchDiscounts(),
            ]);
            console.log('All initial data fetched successfully');
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to fetch initial data. Please try again.');
        }
    }, [fetchCategories, fetchProducts, fetchUsers, fetchDiscounts]);

    const handleGetData = () => {
        fetchOrders();
    };

    // Render charts when stats or chartType changes
    useEffect(() => {
        if (Object.keys(stats).length > 0) {
            if (chartType === 'bar') {
                renderBarChart();
            } else if (chartType === 'line') {
                renderLineChart();
            } else if (chartType === 'pie') {
                renderOrderCountChart();
            }
        }
    }, [stats, chartType, renderBarChart, renderLineChart, renderOrderCountChart]);

    // Verify admin role and initialize token on mount
    useEffect(() => {
        console.log('AdminDashboard - Current user:', user);
        
        // Check if user exists and has admin role
        if (!user || (user.email !== 'admin@example.com' && user.role !== 'admin')) {
            console.log('User is not admin, redirecting to login');
            navigate('/login');
            return;
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found, redirecting to login');
            navigate('/login');
            return;
        }
        
        // Set default authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Fetch initial data
        fetchData();
    }, [user, navigate, fetchData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleDiscountInputChange = (e) => {
        const { name, value } = e.target;
        setDiscountForm({ ...discountForm, [name]: value });
    };

    const handleUserInputChange = (e) => {
        const { name, value } = e.target;
        setUserForm({ ...userForm, [name]: value });
    };

    const validateDiscountForm = () => {
        if (!discountForm.code || discountForm.code.length !== 5 || !/^[a-zA-Z0-9]+$/.test(discountForm.code)) {
            setError('Discount code must be a 5-character alphanumeric string.');
            return false;
        }
        if (!discountForm.discount_percentage || isNaN(discountForm.discount_percentage) || Number(discountForm.discount_percentage) <= 0) {
            setError('Discount percentage must be a positive number.');
            return false;
        }
        if (!discountForm.usageLimit || isNaN(discountForm.usageLimit) || Number(discountForm.usageLimit) <= 0 || Number(discountForm.usageLimit) > 10) {
            setError('Usage limit must be a number between 1 and 10.');
            return false;
        }
        return true;
    };

    const handleCreateDiscount = async (e) => {
        e.preventDefault();
        if (!validateDiscountForm()) return;

        try {
            const token = setAuthHeader();

            const response = await axios.post(`${CART_API_URL}/admin/discount`, {
                code: discountForm.code,
                discount_percentage: Number(discountForm.discount_percentage),
                usageLimit: Number(discountForm.usageLimit)
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Discount code created:', response.data);

            // Refresh discount codes list
            await fetchDiscounts();

            // Reset form
            setDiscountForm({
                code: '',
                discount_percentage: '',
                usageLimit: ''
            });
            
            setError('');
            alert('Discount code created successfully!');
        } catch (err) {
            console.error('Create discount error:', err);
            setError(`Failed to create discount code: ${err.message || 'Unknown error'}`);
            
            if (err.response?.status === 401) {
                await logout();
                navigate('/login');
            }
        }
    };

    const handleCreateOrUpdateProduct = async (e) => {
        e.preventDefault();
        
        try {
            const token = setAuthHeader();
            
            // Validate required fields
            if (!formData.name || !formData.brand || !formData.description || !formData.images || !formData.variants) {
                setError('Please fill in all required fields for the product.');
                return;
            }
            
            // Parse variants to ensure valid format
            let parsedVariants;
            try {
                parsedVariants = formData.variants.split(';').map(variant => {
                    const [name, stock, price] = variant.split(',').map(item => item.trim());
                    if (!name || isNaN(Number(stock)) || isNaN(Number(price))) {
                        throw new Error(`Invalid variant format: ${variant}`);
                    }
                    return { name, stock: Number(stock), price: Number(price) };
                });
                
                // Ensure at least 2 variants
                if (parsedVariants.length < 2) {
                    setError('Product must have at least 2 variants.');
                    return;
                }
            } catch (variantError) {
                setError(`Variant format error: ${variantError.message}`);
                return;
            }
            
            const productData = {
                name: formData.name,
                brand: formData.brand,
                description: formData.description,
                images: formData.images.split(',').map(img => img.trim()),
                variants: parsedVariants,
                category: formData.category,
                tags: formData.tags.split(',').map(tag => tag.trim())
            };
            
            console.log('Sending product data:', productData);

            if (formData._id) {
                // Update existing product
                const response = await axios.put(
                    `${PRODUCT_API_URL}/products/${formData._id}`, 
                    productData,
                    { 
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json' 
                        } 
                    }
                );
                
                console.log('Product updated:', response.data);
            } else {
                // Create new product
                const response = await axios.post(
                    `${PRODUCT_API_URL}/products`, 
                    productData,
                    { 
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json' 
                        } 
                    }
                );
                
                console.log('Product created:', response.data);
            }

            // Refresh products list
            await fetchProducts();

            // Reset form
            setFormData({
                _id: null,
                name: '',
                brand: '',
                description: '',
                images: '',
                variants: '',
                category: '',
                tags: ''
            });
            
            setError('');
            setProductError('');
            alert(formData._id ? 'Product updated successfully!' : 'Product created successfully!');
        } catch (err) {
            console.error('Product save error:', err);
            
            // Extract detailed error message if available
            const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Unknown error';
            setError(`Failed to save product: ${errorMessage}`);
            
            if (err.response?.status === 401) {
                await logout();
                navigate('/login');
            }
        }
    };

    const handleEditProduct = (product) => {
        setFormData({
            _id: product._id,
            name: product.name,
            brand: product.brand,
            description: product.description,
            images: product.images.join(', '),
            variants: product.variants.map(v => `${v.name},${v.stock},${v.price}`).join('; '),
            category: product.category,
            tags: Array.isArray(product.tags) ? product.tags.join(', ') : ''
        });
        
        // Scroll to product form
        window.scrollTo({
            top: document.getElementById('productForm').offsetTop - 100,
            behavior: 'smooth'
        });
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('Are you sure you want to delete this product?')) {
            return;
        }
        
        try {
            const token = setAuthHeader();

            const response = await axios.delete(`${PRODUCT_API_URL}/products/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('Product deleted:', response.data);
            
            // Update products state by filtering out the deleted product
            setProducts(products.filter(product => product._id !== id));
            
            alert('Product deleted successfully!');
        } catch (err) {
            console.error('Product delete error:', err);
            setError(`Failed to delete product: ${err.message || 'Unknown error'}`);
            
            if (err.response?.status === 401) {
                await logout();
                navigate('/login');
            }
        }
    };

    const handleCreateOrUpdateUser = async (e) => {
        e.preventDefault();
        
        try {
            const token = setAuthHeader();
            
            // Validate required fields
            if (!userForm.email || (!userForm._id && !userForm.password) || !userForm.name) {
                setError('Please fill in all required fields for the user.');
                return;
            }
            
            const userData = {
                email: userForm.email,
                name: userForm.name,
                role: userForm.role
            };
            
            // Only include password if it's provided (for updates) or required (for new users)
            if (userForm.password) {
                userData.password = userForm.password;
            }
            
            // For new users, ensure they have valid shipping address
            if (!userForm._id) {
                userData.shippingAddress = {
                    street: '123 Default St.',
                    city: 'Default City',
                    state: 'Default State',
                    zip: '12345',
                    country: 'Default Country'
                };
            }
            
            console.log('Sending user data:', userData);

            if (userForm._id) {
                // Update existing user
                const response = await axios.put(
                    `${ACCOUNT_API_URL}/admin/users/${userForm._id}`, 
                    userData,
                    { 
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json' 
                        } 
                    }
                );
                
                console.log('User updated:', response.data);
            } else {
                // Create new user
                const response = await axios.post(
                    `${ACCOUNT_API_URL}/admin/users`, 
                    userData,
                    { 
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json' 
                        } 
                    }
                );
                
                console.log('User created:', response.data);
            }

            // Refresh users list
            await fetchUsers();

            // Reset form
            setUserForm({
                _id: null,
                email: '',
                password: '',
                name: '',
                role: 'user'
            });
            
            setError('');
            alert(userForm._id ? 'User updated successfully!' : 'User created successfully!');
        } catch (err) {
            console.error('User save error:', err);
            
            // Extract detailed error message if available
            const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Unknown error';
            setError(`Failed to save user: ${errorMessage}`);
            
            if (err.response?.status === 401) {
                await logout();
                navigate('/login');
            }
        }
    };

    const handleEditUser = (user) => {
        setUserForm({
            _id: user.id,
            email: user.email,
            password: '',
            name: user.name,
            role: user.role
        });
        
        // Scroll to user form
        window.scrollTo({
            top: document.getElementById('userForm').offsetTop - 100,
            behavior: 'smooth'
        });
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) {
            return;
        }
        
        try {
            const token = setAuthHeader();

            const response = await axios.delete(`${ACCOUNT_API_URL}/admin/users/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('User deleted:', response.data);
            
            // Update users state by filtering out the deleted user
            setUsers(users.filter(user => user.id !== id));
            
            alert('User deleted successfully!');
        } catch (err) {
            console.error('User delete error:', err);
            setError(`Failed to delete user: ${err.message || 'Unknown error'}`);
            
            if (err.response?.status === 401) {
                await logout();
                navigate('/login');
            }
        }
    };

    const handleOrderClick = (order) => {
        setSelectedOrder(order);
        setNewStatus(order.currentStatus);
        setModalOpen(true);
    };

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        
        try {
            const token = setAuthHeader();

            const response = await axios.put(
                `${CART_API_URL}/admin/orders/${selectedOrder.orderId}/status`, 
                { status: newStatus },
                {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('Order status updated:', response.data);
            
            // Update the order in the orders list
            setOrders(orders.map(order => 
                order.orderId === selectedOrder.orderId 
                    ? { 
                        ...order, 
                        currentStatus: newStatus, 
                        statusHistory: [
                            ...(order.statusHistory || []), 
                            { status: newStatus, updatedAt: new Date() }
                        ] 
                    } 
                    : order
            ));
            
            setModalOpen(false);
            alert('Order status updated successfully!');
        } catch (err) {
            console.error('Order status update error:', err);
            setError(`Failed to update order status: ${err.message || 'Unknown error'}`);
            
            if (err.response?.status === 401) {
                await logout();
                navigate('/login');
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
    };

    // Redirect if no user or not admin
    if (!user || (user.email !== 'admin@example.com' && user.role !== 'admin')) {
        return null;
    }

    return (
        <div style={{
            backgroundColor: '#000000',
            color: '#FFFFFF',
            minHeight: '100vh',
            fontFamily: "'Playfair Display', serif",
            padding: '20px'
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
                            LuxeLane Admin
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
                <button
                    onClick={async () => {
                        await logout();
                        navigate('/login');
                    }}
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
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E0E0E0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D4AF37'}
                >
                    Logout
                </button>
            </header>

            <main style={{ padding: '40px' }}>
                <h1 style={{
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color: '#D4AF37',
                    textAlign: 'center',
                    marginBottom: '40px'
                }}>
                    Admin Dashboard
                </h1>

                <div style={{
                    backgroundColor: '#1A1A1A',
                    padding: '30px',
                    borderRadius: '10px',
                    marginBottom: '40px',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)'
                }}>
                    <h2 style={{
                        fontSize: '24px',
                        color: '#D4AF37',
                        marginBottom: '20px'
                    }}>
                        Advanced Dashboard
                    </h2>
                    <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select
                            value={timeInterval}
                            onChange={(e) => setTimeInterval(e.target.value)}
                            style={{
                                padding: '10px',
                                marginRight: '10px',
                                marginBottom: '10px',
                                backgroundColor: '#E0E0E0',
                                border: 'none',
                                borderRadius: '5px',
                                color: '#000000'
                            }}
                        >
                            <option value="year">Yearly</option>
                            <option value="quarter">Quarterly</option>
                            <option value="month">Monthly</option>
                            <option value="week">Weekly</option>
                        </select>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{
                                padding: '10px',
                                marginRight: '10px',
                                marginBottom: '10px',
                                backgroundColor: '#E0E0E0',
                                border: 'none',
                                borderRadius: '5px',
                                color: '#000000'
                            }}
                        />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{
                                padding: '10px',
                                marginRight: '10px',
                                marginBottom: '10px',
                                backgroundColor: '#E0E0E0',
                                border: 'none',
                                borderRadius: '5px',
                                color: '#000000'
                            }}
                        />
                        <select
                            value={chartType}
                            onChange={(e) => setChartType(e.target.value)}
                            style={{
                                padding: '10px',
                                marginRight: '10px',
                                marginBottom: '10px',
                                backgroundColor: '#E0E0E0',
                                border: 'none',
                                borderRadius: '5px',
                                color: '#000000'
                            }}
                        >
                            <option value="bar">Bar Chart (Key Metrics)</option>
                            <option value="line">Line Chart (Revenue & Profit Trend)</option>
                            <option value="pie">Pie Chart (Order Distribution)</option>
                        </select>
                        <button
                            onClick={handleGetData}
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
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E0E0E0'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D4AF37'}
                        >
                            Generate Report
                        </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ width: '48%', height: '400px', backgroundColor: '#222', borderRadius: '10px', padding: '10px' }}>
                            <canvas ref={barChartRef} style={{ display: chartType === 'bar' ? 'block' : 'none', width: '100%', height: '100%' }}></canvas>
                            <canvas ref={lineChartRef} style={{ display: chartType === 'line' ? 'block' : 'none', width: '100%', height: '100%' }}></canvas>
                        </div>
                        <div style={{ width: '48%', height: '400px', backgroundColor: '#222', borderRadius: '10px', padding: '10px' }}>
                            <canvas ref={pieChartRef} style={{ display: chartType === 'pie' ? 'block' : 'none', width: '100%', height: '100%' }}></canvas>
                        </div>
                    </div>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        color: '#FFFFFF',
                        fontFamily: "'Roboto', sans-serif",
                        backgroundColor: '#2A2A2A',
                        border: '1px solid #D4AF37'
                    }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #D4AF37' }}>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Metric</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #333333' }}>
                                <td style={{ padding: '10px' }}>Orders Count</td>
                                <td style={{ padding: '10px' }}>{Object.values(stats).reduce((sum, s) => sum + (s.ordersCount || 0), 0)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #333333' }}>
                                <td style={{ padding: '10px' }}>Total Revenue</td>
                                <td style={{ padding: '10px' }}>₫{Object.values(stats).reduce((sum, s) => sum + (s.totalRevenue || 0), 0).toLocaleString()}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #333333' }}>
                                <td style={{ padding: '10px' }}>Total Profit</td>
                                <td style={{ padding: '10px' }}>₫{Object.values(stats).reduce((sum, s) => sum + (s.totalProfit || 0), 0).toLocaleString()}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #333333' }}>
                                <td style={{ padding: '10px' }}>Total Products Sold</td>
                                <td style={{ padding: '10px' }}>{productStats.totalProducts || 0}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #333333' }}>
                                <td style={{ padding: '10px' }}>Unique Product Types</td>
                                <td style={{ padding: '10px' }}>{productStats.uniqueProductTypes || 0}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div style={{
                    backgroundColor: '#1A1A1A',
                    padding: '30px',
                    borderRadius: '10px',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
                    marginBottom: '40px'
                }}>
                    <h2 style={{
                        fontSize: '24px',
                        color: '#D4AF37',
                        marginBottom: '20px'
                    }}>
                        Order Management
                    </h2>
                    {error && (
                        <p style={{
                            color: '#FF5555',
                            marginBottom: '15px'
                        }}>
                            {error}
                        </p>
                    )}
                    {orders.length === 0 && !error ? (
                        <p style={{ color: '#E0E0E0' }}>No orders available. Click "Generate Report" to fetch orders.</p>
                    ) : (
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            color: '#FFFFFF',
                            fontFamily: "'Roboto', sans-serif"
                        }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #D4AF37' }}>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Order ID</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>User ID</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Total Price</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Created At</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <tr key={order.orderId} style={{ borderBottom: '1px solid #333333' }}>
                                        <td style={{ padding: '10px' }}>{order.orderId}</td>
                                        <td style={{ padding: '10px' }}>{order.userId}</td>
                                        <td style={{ padding: '10px' }}>₫{order.totalPrice?.toLocaleString() || '0'}</td>
                                        <td style={{ padding: '10px' }}>{order.currentStatus}</td>
                                        <td style={{ padding: '10px' }}>{formatDate(order.createdAt)}</td>
                                        <td style={{ padding: '10px' }}>
                                            <button
                                                onClick={() => handleOrderClick(order)}
                                                style={{
                                                    padding: '5px 10px',
                                                    backgroundColor: '#D4AF37',
                                                    color: '#000000',
                                                    border: 'none',
                                                    borderRadius: '5px',
                                                    marginRight: '10px',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.3s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E0E0E0'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D4AF37'}
                                            >
                                                Edit Status
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div style={{
                    backgroundColor: '#1A1A1A',
                    padding: '30px',
                    borderRadius: '10px',
                    maxWidth: '600px',
                    margin: '0 auto 40px',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)'
                }}>
                    <h2 style={{
                        fontSize: '24px',
                        color: '#D4AF37',
                        marginBottom: '20px'
                    }}>
                        Create Discount Code
                    </h2>
                    {error && (
                        <p style={{
                            color: '#FF5555',
                            marginBottom: '15px'
                        }}>
                            {error}
                        </p>
                    )}
                    <div>
                        <input
                            type="text"
                            name="code"
                            placeholder="Discount Code (5-character alphanumeric)"
                            value={discountForm.code}
                            onChange={handleDiscountInputChange}
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
                            type="number"
                            name="discount_percentage"
                            placeholder="Discount Percentage (e.g., 10)"
                            value={discountForm.discount_percentage}
                            onChange={handleDiscountInputChange}
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
                            type="number"
                            name="usageLimit"
                            placeholder="Usage Limit (1-10)"
                            value={discountForm.usageLimit}
                            onChange={handleDiscountInputChange}
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
                            onClick={handleCreateDiscount}
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
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E0E0E0'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D4AF37'}
                        >
                            Create Discount Code
                        </button>
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#1A1A1A',
                    padding: '30px',
                    borderRadius: '10px',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
                    marginBottom: '40px'
                }}>
                    <h2 style={{
                        fontSize: '24px',
                        color: '#D4AF37',
                        marginBottom: '20px'
                    }}>
                        Discount Code List
                    </h2>
                    {discountError && (
                        <p style={{
                            color: '#FF5555',
                            marginBottom: '15px'
                        }}>
                            {discountError}
                        </p>
                    )}
                    {discounts.length === 0 && !discountError ? (
                        <p style={{ color: '#E0E0E0' }}>No discount codes available.</p>
                    ) : (
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            color: '#FFFFFF',
                            fontFamily: "'Roboto', sans-serif"
                        }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #D4AF37' }}>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Code</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Discount %</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Usage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {discounts.map(discount => (
                                    <tr key={discount.code} style={{ borderBottom: '1px solid #333333' }}>
                                        <td style={{ padding: '10px' }}>{discount.code}</td>
                                        <td style={{ padding: '10px' }}>{discount.discountPercentage}%</td>
                                        <td style={{ padding: '10px' }}>{discount.timesUsed}/{discount.usageLimit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div id="userForm" style={{
                    backgroundColor: '#1A1A1A',
                    padding: '30px',
                    borderRadius: '10px',
                    maxWidth: '600px',
                    margin: '0 auto 40px',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)'
                }}>
                    <h2 style={{
                        fontSize: '24px',
                        color: '#D4AF37',
                        marginBottom: '20px'
                    }}>
                        {userForm._id ? 'Update User' : 'Create User'}
                    </h2>
                    {error && (
                        <p style={{
                            color: '#FF5555',
                            marginBottom: '15px'
                        }}>
                            {error}
                        </p>
                    )}
                    <div>
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={userForm.email}
                            onChange={handleUserInputChange}
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
                            type="password"
                            name="password"
                            placeholder="Password (leave blank to keep unchanged)"
                            value={userForm.password}
                            onChange={handleUserInputChange}
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
                            name="name"
                            placeholder="Name"
                            value={userForm.name}
                            onChange={handleUserInputChange}
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
                        <select
                            name="role"
                            value={userForm.role}
                            onChange={handleUserInputChange}
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
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                        <button
                            onClick={handleCreateOrUpdateUser}
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
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E0E0E0'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D4AF37'}
                        >
                            {userForm._id ? 'Update User' : 'Create User'}
                        </button>
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#1A1A1A',
                    padding: '30px',
                    borderRadius: '10px',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
                    marginBottom: '40px'
                }}>
                    <h2 style={{
                        fontSize: '24px',
                        color: '#D4AF37',
                        marginBottom: '20px'
                    }}>
                        User Management
                    </h2>
                    {error && (
                        <p style={{
                            color: '#FF5555',
                            marginBottom: '15px'
                        }}>
                            {error}
                        </p>
                    )}
                    {users.length === 0 ? (
                        <p style={{ color: '#E0E0E0' }}>No users available.</p>
                    ) : (
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            color: '#FFFFFF',
                            fontFamily: "'Roboto', sans-serif"
                        }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #D4AF37' }}>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Role</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Created At</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid #333333' }}>
                                        <td style={{ padding: '10px' }}>{user.email}</td>
                                        <td style={{ padding: '10px' }}>{user.name}</td>
                                        <td style={{ padding: '10px' }}>{user.role}</td>
                                        <td style={{ padding: '10px' }}>{formatDate(user.createdAt)}</td>
                                        <td style={{ padding: '10px' }}>
                                            <button
                                                onClick={() => handleEditUser(user)}
                                                style={{
                                                    padding: '5px 10px',
                                                    backgroundColor: '#D4AF37',
                                                    color: '#000000',
                                                    border: 'none',
                                                    borderRadius: '5px',
                                                    marginRight: '10px',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.3s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E0E0E0'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D4AF37'}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                style={{
                                                    padding: '5px 10px',
                                                    backgroundColor: '#FF5555',
                                                    color: '#FFFFFF',
                                                    border: 'none',
                                                    borderRadius: '5px',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.3s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FF7777'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF5555'}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div id="productForm" style={{
                    backgroundColor: '#1A1A1A',
                    padding: '30px',
                    borderRadius: '10px',
                    maxWidth: '600px',
                    margin: '0 auto 40px',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)'
                }}>
                    <h2 style={{
                        fontSize: '24px',
                        color: '#D4AF37',
                        marginBottom: '20px'
                    }}>
                        {formData._id ? 'Update Product' : 'Create Product'}
                    </h2>
                    {error && (
                        <p style={{
                            color: '#FF5555',
                            marginBottom: '15px'
                        }}>
                            {error}
                        </p>
                    )}
                    {categoryError && (
                        <p style={{
                            color: '#FF5555',
                            marginBottom: '15px'
                        }}>
                            {categoryError}
                        </p>
                    )}
                    <div>
                        <input
                            type="text"
                            name="name"
                            placeholder="Product Name"
                            value={formData.name}
                            onChange={handleInputChange}
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
                            name="brand"
                            placeholder="Brand"
                            value={formData.brand}
                            onChange={handleInputChange}
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
                        <textarea
                            name="description"
                            placeholder="Description (use \n for new lines)"
                            value={formData.description}
                            onChange={handleInputChange}
                            style={{
                                width: '100%',
                                padding: '10px',
                                marginBottom: '15px',
                                backgroundColor: '#E0E0E0',
                                border: 'none',
                                borderRadius: '5px',
                                color: '#000000',
                                fontFamily: "'Roboto', sans-serif",
                                height: '100px',
                                resize: 'none'
                            }}
                        />
                        <input
                            type="text"
                            name="images"
                            placeholder="Images (comma-separated URLs)"
                            value={formData.images}
                            onChange={handleInputChange}
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
                            name="variants"
                            placeholder="Variants (e.g., Color: Black,10,1200; Color: Silver,8,1250)"
                            value={formData.variants}
                            onChange={handleInputChange}
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
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleInputChange}
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
                        >
                            <option value="">Select Category</option>
                            {categories.length > 0 ? (
                                categories.map(category => (
                                    <option key={category._id} value={category.name}>
                                        {category.name}
                                    </option>
                                ))
                            ) : (
                                <option disabled>No categories available</option>
                            )}
                        </select>
                        <input
                            type="text"
                            name="tags"
                            placeholder="Tags (comma-separated)"
                            value={formData.tags}
                            onChange={handleInputChange}
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
                            onClick={handleCreateOrUpdateProduct}
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
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E0E0E0'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D4AF37'}
                        >
                            {formData._id ? 'Update Product' : 'Create Product'}
                        </button>
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#1A1A1A',
                    padding: '30px',
                    borderRadius: '10px',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)'
                }}>
                    <h2 style={{
                        fontSize: '24px',
                        color: '#D4AF37',
                        marginBottom: '20px'
                    }}>
                        Product Management
                    </h2>
                    {productError && (
                        <p style={{
                            color: '#FF5555',
                            marginBottom: '15px'
                        }}>
                            {productError}
                        </p>
                    )}
                    {products.length === 0 && !productError ? (
                        <p style={{ color: '#E0E0E0' }}>No products available.</p>
                    ) : (
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            color: '#FFFFFF',
                            fontFamily: "'Roboto', sans-serif"
                        }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #D4AF37' }}>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Brand</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Category</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Price Range (₫)</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(product => (
                                    <tr key={product._id} style={{ borderBottom: '1px solid #333333' }}>
                                        <td style={{ padding: '10px' }}>{product.name}</td>
                                        <td style={{ padding: '10px' }}>{product.brand}</td>
                                        <td style={{ padding: '10px' }}>{product.category || 'None'}</td>
                                        <td style={{ padding: '10px' }}>
                                            ₫{Math.min(...product.variants.map(v => v.price)).toLocaleString()} - 
                                            ₫{Math.max(...product.variants.map(v => v.price)).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <button
                                                onClick={() => handleEditProduct(product)}
                                                style={{
                                                    padding: '5px 10px',
                                                    backgroundColor: '#D4AF37',
                                                    color: '#000000',
                                                    border: 'none',
                                                    borderRadius: '5px',
                                                    marginRight: '10px',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.3s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E0E0E0'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D4AF37'}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteProduct(product._id)}
                                                style={{
                                                    padding: '5px 10px',
                                                    backgroundColor: '#FF5555',
                                                    color: '#FFFFFF',
                                                    border: 'none',
                                                    borderRadius: '5px',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.3s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FF7777'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF5555'}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
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
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#1A1A1A',
                        padding: '30px',
                        borderRadius: '10px',
                        maxWidth: '600px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        position: 'relative'
                    }}>
                        <button
                            onClick={() => setModalOpen(false)}
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
                                fontFamily: "'Roboto', sans-serif"
                            }}
                        >
                            Close
                        </button>
                        <h2 style={{
                            fontSize: '24px',
                            color: '#D4AF37',
                            marginBottom: '20px'
                        }}>
                            Update Order Status - ID: {selectedOrder.orderId}
                        </h2>
                        <p style={{
                            fontSize: '16px',
                            color: '#E0E0E0',
                            marginBottom: '10px'
                        }}>
                            <strong>Current Status:</strong> {selectedOrder.currentStatus}
                        </p>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
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
                        >
                            <option value="ordered">Ordered</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                            onClick={handleUpdateStatus}
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
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E0E0E0'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D4AF37'}
                        >
                            Update Status
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
