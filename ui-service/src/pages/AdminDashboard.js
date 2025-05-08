import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Chart from 'chart.js/auto';

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

    const PRODUCT_API_URL = 'https://product-management-soyo.onrender.com';
    const ACCOUNT_API_URL = 'https://nodejs-final-ecommerce.onrender.com';
    const CART_API_URL = 'https://nodejs-final-ecommerce-1.onrender.com';

    const fetchCategories = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No JWT token found in localStorage');
            axios.defaults.headers.Authorization = `Bearer ${token}`;

            const response = await axios.get(`${PRODUCT_API_URL}/api/categories`);
            setCategories(Array.isArray(response.data) ? response.data : []);
            setCategoryError('');
        } catch (err) {
            setCategories([]);
            setCategoryError(`Failed to fetch categories: ${err.message}${err.response?.data?.error ? ` - ${err.response.data.error}` : ''}`);
            if (err.response?.status === 401) {
                await logout();
                navigate('/login');
            }
        }
    }, [logout, navigate]);

    const fetchProducts = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No JWT token found in localStorage');
            axios.defaults.headers.Authorization = `Bearer ${token}`;

            const response = await axios.get(`${PRODUCT_API_URL}/api/products`, {
                params: { limit: 100 }
            });
            setProducts(response.data.products || []);
            setProductError('');
        } catch (err) {
            setProducts([]);
            setProductError(`Failed to fetch products: ${err.message}${err.response?.data?.error ? ` - ${err.response.data.error}` : ''}`);
            if (err.response?.status === 401) {
                await logout();
                navigate('/login');
            }
        }
    }, [logout, navigate]);

    const fetchUsers = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No JWT token found in localStorage');
            axios.defaults.headers.Authorization = `Bearer ${token}`;

            const response = await axios.get(`${ACCOUNT_API_URL}/user/admin/users`);
            if (!Array.isArray(response.data)) {
                throw new Error('Unexpected response format: response.data is not an array');
            }
            const mappedUsers = response.data.map(user => ({
                ...user,
                id: user._id,
                createdAt: user.created_at || user.createdAt
            }));
            setUsers(mappedUsers);
            setError('');
        } catch (err) {
            setError(`Failed to fetch users: ${err.message}${err.response?.data?.message ? ` - ${err.response.data.message}` : ''}`);
            if (err.response?.status === 401) {
                await logout();
                navigate('/login');
            }
        }
    }, [logout, navigate]);

    const fetchDiscounts = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No JWT token found in localStorage');
            axios.defaults.headers.Authorization = `Bearer ${token}`;

            const response = await axios.get(`${CART_API_URL}/cart/admin/discounts`);
            setDiscounts(Array.isArray(response.data) ? response.data.map(discount => ({
                ...discount,
                discountPercentage: discount.discount_percentage || discount.discountPercentage
            })) : []);
            setDiscountError('');
        } catch (err) {
            setDiscounts([]);
            setDiscountError(`Failed to fetch discount codes: ${err.message}${err.response?.data?.error ? ` - ${err.response.data.error}` : ''}`);
            if (err.response?.status === 401) {
                await logout();
                navigate('/login');
            }
        }
    }, [logout, navigate]);

    const fetchOrders = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No JWT token found in localStorage');
            axios.defaults.headers.Authorization = `Bearer ${token}`;

            const params = { interval: timeInterval };
            if (startDate && endDate) {
                params.startDate = startDate;
                params.endDate = endDate;
            }
            const response = await axios.get(`${CART_API_URL}/cart/admin/orders`, { params });
            setOrders(response.data.orders || []);
            setStats(response.data.stats || {});
            // Calculate product stats (e.g., number of products sold and types)
            const productCount = response.data.orders.reduce((acc, order) => acc + order.items.length, 0);
            const productTypes = [...new Set(response.data.orders.flatMap(order => order.items.map(item => item.category)))];
            setProductStats({
                totalProducts: productCount,
                uniqueProductTypes: productTypes.length
            });
        } catch (err) {
            setOrders([]);
            setStats({});
            setProductStats({});
            setError(`Failed to fetch orders: ${err.message}${err.response?.data?.error ? ` - ${err.response.data.error}` : ''}`);
            if (err.response?.status === 401) {
                await logout();
                navigate('/login');
            }
        }
    }, [logout, navigate, timeInterval, startDate, endDate]);

    const renderBarChart = useCallback(() => {
        if (!barChartRef.current) return;
        if (barChartInstance.current) {
            barChartInstance.current.destroy();
        }
        const ctx = barChartRef.current.getContext('2d');
        barChartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Orders Count', 'Total Products Sold', 'Unique Product Types'],
                datasets: [{
                    label: 'Count',
                    data: [
                        Object.values(stats).reduce((sum, s) => sum + (s.ordersCount || 0), 0),
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
        if (lineChartInstance.current) {
            lineChartInstance.current.destroy();
        }
        const ctx = lineChartRef.current.getContext('2d');
        lineChartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Total Revenue', 'Total Profit'],
                datasets: [{
                    label: 'Financial Metrics ($)',
                    data: [
                        Object.values(stats).reduce((sum, s) => sum + (s.totalRevenue || 0), 0),
                        Object.values(stats).reduce((sum, s) => sum + (s.totalProfit || 0), 0)
                    ],
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Amount ($)', color: '#FFFFFF' },
                        ticks: {
                            color: '#FFFFFF',
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    x: { ticks: { color: '#FFFFFF' } }
                },
                plugins: {
                    legend: { labels: { color: '#FFFFFF' } },
                    title: {
                        display: true,
                        text: 'Revenue and Profit Overview',
                        color: '#D4AF37',
                        font: { size: 18 }
                    }
                }
            }
        });
    }, [stats]);

    const renderPieChart = useCallback(() => {
        if (!pieChartRef.current) return;
        if (pieChartInstance.current) {
            pieChartInstance.current.destroy();
        }
        const ctx = pieChartRef.current.getContext('2d');
        pieChartInstance.current = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Total Products Sold', 'Unique Product Types'],
                datasets: [{
                    data: [productStats.totalProducts || 0, productStats.uniqueProductTypes || 0],
                    backgroundColor: ['rgba(255, 206, 86, 0.6)', 'rgba(75, 192, 192, 0.6)'],
                    borderColor: ['rgba(255, 206, 86, 1)', 'rgba(75, 192, 192, 1)'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#FFFFFF' } },
                    title: {
                        display: true,
                        text: 'Product Distribution',
                        color: '#D4AF37',
                        font: { size: 18 }
                    }
                }
            }
        });
    }, [productStats]);

    const fetchData = useCallback(async () => {
        await Promise.all([
            fetchCategories(),
            fetchProducts(),
            fetchUsers(),
            fetchDiscounts(),
        ]);
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
            }
        }
    }, [stats, chartType, renderBarChart, renderLineChart]);

    useEffect(() => {
        if (Object.keys(productStats).length > 0 && chartType === 'pie') {
            renderPieChart();
        }
    }, [productStats, chartType, renderPieChart]);

    // Verify admin role and initialize token on mount
    useEffect(() => {
        if (!user || (user.email !== 'admin@example.com' && user.role !== 'admin')) {
            navigate('/login');
            return;
        }
        const token = localStorage.getItem('token');
        if (token && !axios.defaults.headers.Authorization) {
            axios.defaults.headers.Authorization = `Bearer ${token}`;
        }
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
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No JWT token found in localStorage');
            axios.defaults.headers.Authorization = `Bearer ${token}`;

            await axios.post(`${CART_API_URL}/cart/admin/discount`, {
                code: discountForm.code,
                discount_percentage: Number(discountForm.discount_percentage),
                usageLimit: Number(discountForm.usageLimit)
            });

            const response = await axios.get(`${CART_API_URL}/cart/admin/discounts`);
            setDiscounts(Array.isArray(response.data) ? response.data.map(discount => ({
                ...discount,
                discountPercentage: discount.discount_percentage || discount.discountPercentage
            })) : []);

            setDiscountForm({
                code: '',
                discount_percentage: '',
                usageLimit: ''
            });
            setError('');
            alert('Discount code created successfully!');
        } catch (err) {
            setError(`Failed to create discount code: ${err.message}${err.response?.data?.error ? ` - ${err.response.data.error}` : ''}`);
            if (err.response?.status === 401) {
                await logout();
                navigate('/login');
            }
        }
    };

    const handleCreateOrUpdateProduct = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No JWT token found in localStorage');
            axios.defaults.headers.Authorization = `Bearer ${token}`;

            const productData = {
                name: formData.name,
                brand: formData.brand,
                description: formData.description,
                images: formData.images.split(',').map(img => img.trim()),
                variants: formData.variants.split(';').map(variant => {
                    const [name, stock, price] = variant.split(',').map(item => item.trim());
                    return { name, stock: Number(stock), price: Number(price) };
                }),
                category: formData.category,
                tags: formData.tags.split(',').map(tag => tag.trim())
            };

            if (formData._id) {
                await axios.put(`${PRODUCT_API_URL}/api/products/${formData._id}`, productData);
            } else {
                await axios.post(`${PRODUCT_API_URL}/api/products`, productData);
            }

            const response = await axios.get(`${PRODUCT_API_URL}/api/products`, {
                params: { limit: 100 }
            });

            setProducts(response.data.products || []);
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
        } catch (err) {
            setError(`Failed to save product: ${err.message}${err.response?.data?.error ? ` - ${err.response.data.error}` : ''}`);
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
            tags: product.tags.join(', ')
        });
    };

    const handleDeleteProduct = async (id) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No JWT token found in localStorage');
            axios.defaults.headers.Authorization = `Bearer ${token}`;

            await axios.delete(`${PRODUCT_API_URL}/api/products/${id}`);
            setProducts(products.filter(product => product._id !== id));
        } catch (err) {
            setError(`Failed to delete product: ${err.message}${err.response?.data?.error ? ` - ${err.response.data.error}` : ''}`);
            if (err.response?.status === 401) {
                await logout();
                navigate('/login');
            }
        }
    };

    const handleCreateOrUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No JWT token found in localStorage');
            axios.defaults.headers.Authorization = `Bearer ${token}`;

            const userData = {
                email: userForm.email,
                password: userForm.password,
                name: userForm.name,
                role: userForm.role
            };

            const url = userForm._id ? `${ACCOUNT_API_URL}/user/admin/users/${userForm._id}` : `${ACCOUNT_API_URL}/user/admin/users`;
            const method = userForm._id ? 'put' : 'post';

            await axios[method](url, userData);
            const response = await axios.get(`${ACCOUNT_API_URL}/user/admin/users`);

            const mappedUsers = response.data.map(user => ({
                ...user,
                id: user._id,
                createdAt: user.created_at || user.createdAt
            }));
            setUsers(mappedUsers);
            setUserForm({
                _id: null,
                email: '',
                password: '',
                name: '',
                role: 'user'
            });
            setError('');
        } catch (err) {
            setError(`Failed to save user: ${err.message}${err.response?.data?.message ? ` - ${err.response.data.message}` : ''}`);
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
    };

    const handleDeleteUser = async (id) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No JWT token found in localStorage');
            axios.defaults.headers.Authorization = `Bearer ${token}`;

            await axios.delete(`${ACCOUNT_API_URL}/user/admin/users/${id}`);
            setUsers(users.filter(user => user.id !== id));
        } catch (err) {
            setError(`Failed to delete user: ${err.message}${err.response?.data?.message ? ` - ${err.response.data.message}` : ''}`);
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
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No JWT token found in localStorage');
            axios.defaults.headers.Authorization = `Bearer ${token}`;

            await axios.put(`${CART_API_URL}/cart/admin/orders/${selectedOrder.orderId}/status`, { status: newStatus });
            setOrders(orders.map(order => order.orderId === selectedOrder.orderId ? { ...order, currentStatus: newStatus, statusHistory: [...order.statusHistory, { status: newStatus, updatedAt: new Date() }] } : order));
            setModalOpen(false);
            alert('Order status updated successfully!');
        } catch (err) {
            setError(`Failed to update order status: ${err.message}${err.response?.data?.error ? ` - ${err.response.data.error}` : ''}`);
        }
    };

    if (!user) return null;

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
    };

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
                            <option value="bar">Bar Chart (Counts)</option>
                            <option value="line">Line Chart (Finance)</option>
                            <option value="pie">Pie Chart (Products)</option>
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
                            Get Data
                        </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ width: '48%', height: '400px' }}>
                            <canvas ref={barChartRef} style={{ display: chartType === 'bar' ? 'block' : 'none', width: '100%', height: '100%' }}></canvas>
                        </div>
                        <div style={{ width: '48%', height: '400px' }}>
                            <canvas ref={lineChartRef} style={{ display: chartType === 'line' ? 'block' : 'none', width: '100%', height: '100%' }}></canvas>
                        </div>
                    </div>
                    <div style={{ width: '48%', height: '400px', marginLeft: 'auto' }}>
                        <canvas ref={pieChartRef} style={{ display: chartType === 'pie' ? 'block' : 'none', width: '100%', height: '100%' }}></canvas>
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
                                <td style={{ padding: '10px' }}>${Object.values(stats).reduce((sum, s) => sum + (s.totalRevenue || 0), 0).toFixed(2)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #333333' }}>
                                <td style={{ padding: '10px' }}>Total Profit</td>
                                <td style={{ padding: '10px' }}>${Object.values(stats).reduce((sum, s) => sum + (s.totalProfit || 0), 0).toFixed(2)}</td>
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
                        Order History
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
                        <p style={{ color: '#E0E0E0' }}>No orders available.</p>
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
                                        <td style={{ padding: '10px' }}>${order.totalPrice.toFixed(2)}</td>
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
                        User List
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
                        Product List
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
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Price Range</th>
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
                                            ${Math.min(...product.variants.map(v => v.price))} - $
                                            {Math.max(...product.variants.map(v => v.price))}
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
