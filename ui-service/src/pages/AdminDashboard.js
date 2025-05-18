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

    const PRODUCT_API_URL = 'https://product-management-soyo.onrender.com';
    const ACCOUNT_API_URL = 'https://nodejs-final-ecommerce.onrender.com';
    const CART_API_URL = 'https://nodejs-final-ecommerce-1.onrender.com';

    // Helper function to create Basic Auth headers for product API
    const getProductApiHeaders = () => {
        // Create proper Basic Auth header for product API
        // Using the hardcoded admin credentials: admin@example.com:admin123
        const basicAuthCredentials = 'admin@example.com:admin123';
        const encodedCredentials = btoa(basicAuthCredentials);
        
        return {
            'Authorization': `Basic ${encodedCredentials}`,
            'Content-Type': 'application/json'
        };
    };

    // Helper function to create JWT Auth headers for user and cart APIs
    const getJwtApiHeaders = () => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    const fetchProducts = useCallback(async () => {
        try {
            const headers = getProductApiHeaders();
            
            const response = await axios.get(`${PRODUCT_API_URL}/api/products`, {
                params: { limit: 100 },
                headers
            });
            
            setProducts(response.data.products || []);
            setProductError('');
        } catch (err) {
            console.error('Error fetching products:', err);
            setProducts([]);
            setProductError(`Failed to fetch products: ${err.message}${err.response?.data?.error ? ` - ${err.response.data.error}` : ''}`);
            
            // Check for 401/403 errors
            if (err.response?.status === 401 || err.response?.status === 403) {
                console.error('Authentication error fetching products:', err.response?.data);
            }
        }
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            const headers = getProductApiHeaders();

            const response = await axios.get(`${PRODUCT_API_URL}/api/categories`, {
                headers
            });
            
            setCategories(Array.isArray(response.data) ? response.data : []);
            setCategoryError('');
        } catch (err) {
            console.error('Error fetching categories:', err);
            setCategories([]);
            setCategoryError(`Failed to fetch categories: ${err.message}${err.response?.data?.error ? ` - ${err.response.data.error}` : ''}`);
            
            // Check for 401/403 errors
            if (err.response?.status === 401 || err.response?.status === 403) {
                console.error('Authentication error fetching categories:', err.response?.data);
            }
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const headers = getJwtApiHeaders();
            if (!headers) throw new Error('No JWT token found in localStorage');

            const response = await axios.get(`${ACCOUNT_API_URL}/user/admin/users`, { headers });
            
            if (!Array.isArray(response.data)) {
                throw new Error('Unexpected response format: response.data is not an array');
            }
            
            const mappedUsers = response.data.map(user => ({
                ...user,
                id: user._id || user.id,
                _id: user._id || user.id,
                createdAt: user.created_at || user.createdAt
            }));
            
            setUsers(mappedUsers);
            setError('');
        } catch (err) {
            console.error('Error fetching users:', err);
            
            if (err.response) {
                console.error('Response status:', err.response.status);
                console.error('Response data:', err.response.data);
            }
            
            setError(`Failed to fetch users: ${err.message}${err.response?.data?.message ? ` - ${err.response.data.message}` : ''}`);
            
            if (err.response?.status === 401) {
                await logout();
                navigate('/login');
            }
        }
    }, [logout, navigate]);

    const fetchDiscounts = useCallback(async () => {
        try {
            const headers = getJwtApiHeaders();
            if (!headers) throw new Error('No JWT token found in localStorage');

            const response = await axios.get(`${CART_API_URL}/cart/admin/discounts`, { headers });
            
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
            const headers = getJwtApiHeaders();
            if (!headers) throw new Error('No JWT token found in localStorage');

            const params = { interval: timeInterval };
            if (startDate && endDate) {
                params.startDate = startDate;
                params.endDate = endDate;
            }
            
            const response = await axios.get(`${CART_API_URL}/cart/admin/orders`, { 
                params,
                headers
            });
            
            setOrders(response.data.orders || []);
            setStats(response.data.stats || {});
            
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
        
        const periodLabels = Object.keys(stats).sort();
        const revenueData = periodLabels.map(period => stats[period].totalRevenue || 0);
        const profitData = periodLabels.map(period => stats[period].totalProfit || 0);
        
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
                                ورزش if (label) {
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
        if (pieChartInstance.current) {
            pieChartInstance.current.destroy();
        }
        
        const periodLabels = Object.keys(stats).sort();
        const ordersData = periodLabels.map(period => stats[period].ordersCount || 0);
        
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

    useEffect(() => {
        if (!user || (user.email !== 'admin@example.com' && user.role !== 'admin')) {
            navigate('/login');
            return;
        }

        fetchData();
        fetchOrders();
    }, [user, navigate, fetchData, fetchOrders]);

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

    const handleCreateOrUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const headers = getJwtApiHeaders();
            if (!headers) throw new Error('No JWT token found in localStorage');
            
            if (!userForm.email || (!userForm._id && !userForm.password) || !userForm.name) {
                setError('Email, name, and password (for new users) are required');
                return;
            }
            
            // Prepare user data with proper validation for required fields
            const userData = {
                email: userForm.email,
                name: userForm.name,
                role: userForm.role
            };
            
            if (userForm.password) {
                userData.password = userForm.password;
            }
            
            // For new users, provide valid non-empty values for shipping address
            if (!userForm._id) {
                userData.shippingAddress = {
                    street: 'Default Street',
                    city: 'Default City',
                    state: 'Default State',
                    zip: '00000',
                    country: 'Default Country',
                };
            }
            
            console.log('User form data:', {
                ...userData, 
                password: userForm.password ? '********' : 'unchanged'
            });
            
            let response;
            if (userForm._id) {
                console.log(`Updating user with ID: ${userForm._id}`);
                response = await axios({
                    method: 'put',
                    url: `${ACCOUNT_API_URL}/user/admin/users/${userForm._id}`,
                    data: userData,
                    headers: headers
                });
            } else {
                console.log('Creating new user');
                response = await axios({
                    method: 'post',
                    url: `${ACCOUNT_API_URL}/user/admin/users`,
                    data: userData,
                    headers: headers
                });
            }
            
            hopped
            console.log('User operation successful:', response.data);
            
            const fetchResponse = await axios.get(`${ACCOUNT_API_URL}/user/admin/users`, { headers });
            
            const mappedUsers = Array.isArray(fetchResponse.data) ? 
                fetchResponse.data.map(user => ({
                    ...user,
                    id: user._id || user.id,
                    _id: user._id || user.id,
                    createdAt: user.created_at || user.createdAt
                })) : [];
            
            setUsers(mappedUsers);
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
            console.error('Error saving user:', err);
            if (err.response) {
                console.error('Response status:', err.response.status);
                console.error('Response data:', err.response.data);
            } else if (err.request) {
                console.error('Request made but no response received:', err.request);
            } else {
                console.error('Error setting up request:', err.message);
            }
            setError(`Failed to save user: ${err.message}${err.response?.data?.message ? ` - ${err.response.data.message}` : ''}`);
            if (err.response?.status === 401) {
                alert('Authentication error. You will be redirected to login.');
                await logout();
                navigate('/login');
            }
        }
    };

    const handleEditUser = (user) => {
        setUserForm({
            _id: user._id,
            email: user.email,
            password: '',
            name: user.name,
            role: user.role || 'user'
        });
        
        const userFormSection = document.querySelector('.user-form-section');
        if (userFormSection) {
            window.scrollTo({
                top: userFormSection.offsetTop,
                behavior: 'smooth'
            });
        }
    };

    const handleDeleteUser = async (id) => {
        try {
            if (!id) {
                setError('Cannot delete user: Invalid user ID');
                return;
            }
            
            const headers = getJwtApiHeaders();
            if (!headers) throw new Error('No JWT token found in localStorage');
            
            console.log(`Deleting user with ID: ${id}`);
            
            await axios.delete(`${ACCOUNT_API_URL}/user/admin/users/${id}`, { headers });
            
            setUsers(prevUsers => prevUsers.filter(user => user._id !== id));
            setError('');
        } catch (err) {
            console.error('Error deleting user:', err);
            if (err.response) {
                console.error('Response status:', err.response.status);
                console.error('Response data:', err.response.data);
            } else if (err.request) {
                console.error('Request made but no response received:', err.request);
            } else {
                console.error('Error setting up request:', err.message);
            }
            setError(`Failed to delete user: ${err.message}${err.response?.data?.message ? ` - ${err.response.data.message}` : ''}`);
            if (err.response?.status === 401) {
                await logout();
                navigate('/login');
            }
        }
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
            const headers = getJwtApiHeaders();
            if (!headers) throw new Error('No JWT token found in localStorage');

            await axios.post(`${CART_API_URL}/cart/admin/discount`, {
                code: discountForm.code,
                discount_percentage: Number(discountForm.discount_percentage),
                usageLimit: Number(discountForm.usageLimit)
            }, { headers });

            const response = await axios.get(`${CART_API_URL}/cart/admin/discounts`, { headers });
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
            // Use Basic Auth for product API
            const headers = getProductApiHeaders();
            
            console.log('Using Basic Auth for product API');
            
            // Validate required fields
            if (!formData.name || !formData.brand || !formData.description || 
                !formData.images || !formData.variants || !formData.category) {
                setError('All product fields are required');
                return;
            }
            
            // Parse variants format (name,stock,price;)
            let parsedVariants;
            try {
                parsedVariants = formData.variants.split(';').filter(v => v.trim())
                    .map(variant => {
                        const [name, stock, price] = variant.split(',').map(item => item.trim());
                        
                        if (!name || stock === undefined || price === undefined) {
                            throw new Error('Invalid variant format: each variant must have name, stock, and price');
                        }
                        
                        return { 
                            name, 
                            stock: Number(stock), 
                            price: Number(price) 
                        };
                    });
                
                if (parsedVariants.length < 2) {
                    throw new Error('Product must have at least 2 variants');
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
            
            console.log('Product data:', productData);
            
            let response;
            if (formData._id) {
                console.log(`Updating product with ID: ${formData._id}`);
                response = await axios({
                    method: 'put',
                    url: `${PRODUCT_API_URL}/api/products/${formData._id}`,
                    data: productData,
                    headers: headers
                });
            } else {
                console.log('Creating new product');
                response = await axios({
                    method: 'post',
                    url: `${PRODUCT_API_URL}/api/products`,
                    data: productData,
                    headers: headers
                });
            }
            
            console.log('Product operation successful:', response.data);
            
            // Refresh the product list after successful creation/update
            const fetchResponse = await axios.get(`${PRODUCT_API_URL}/api/products`, {
                params: { limit: 100 },
                headers: headers
            });
            
            setProducts(fetchResponse.data.products || []);
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
            console.error('Error saving product:', err);
            
            if (err.response) {
                console.error('Response status:', err.response.status);
                console.error('Response data:', err.response.data);
            }
            
            setError(`Failed to save product: ${err.message}${err.response?.data?.error ? ` - ${err.response.data.error}` : ''}`);
            
            if (err.response?.status === 401 || err.response?.status === 403) {
                alert('Authentication error with product API. Check admin credentials.');
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
            // Use Basic Auth for product API
            const headers = getProductApiHeaders();

            await axios.delete(`${PRODUCT_API_URL}/api/products/${id}`, { headers });
            setProducts(products.filter(product => product._id !== id));
            alert('Product deleted successfully!');
        } catch (err) {
            console.error('Error deleting product:', err);
            
            if (err.response) {
                console.error('Response status:', err.response.status);
                console.error('Response data:', err.response.data);
            }
            
            setError(`Failed to delete product: ${err.message}${err.response?.data?.error ? ` - ${err.response.data.error}` : ''}`);
            
            if (err.response?.status === 401 || err.response?.status === 403) {
                alert('Authentication error with product API. Check admin credentials.');
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
            const headers = getJwtApiHeaders();
            if (!headers) throw new Error('No JWT token found in localStorage');

            await axios.put(`${CART_API_URL}/cart/admin/orders/${selectedOrder.orderId}/status`, 
                { status: newStatus }, 
                { headers }
            );
            
            setOrders(orders.map(order => 
                order.orderId === selectedOrder.orderId 
                    ? { 
                        ...order, 
                        currentStatus: newStatus, 
                        statusHistory: [...order.statusHistory, { status: newStatus, updatedAt: new Date() }] 
                    } 
                    : order
            ));
            
            setModalOpen(false);
            alert('Order status updated successfully!');
        } catch (err) {
            setError(`Failed to update order status: ${err.message}${err.response?.data?.error ? ` - ${err.response.data.error}` : ''}`);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
    };

    if (!user) return null;

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
                                        <td style={{ padding: '10px' }}>₫{order.totalPrice.toLocaleString()}</td>
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

                <div className="user-form-section" style={{
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
                                    <tr key={user._id} style={{ borderBottom: '1px solid #333333' }}>
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
                                                onClick={() => handleDeleteUser(user._id)}
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
                                color: '#000 VHS000',
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
