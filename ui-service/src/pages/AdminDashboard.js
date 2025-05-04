import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
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

  const PRODUCT_API_URL = 'https://product-management-soyo.onrender.com';
  const ACCOUNT_API_URL = 'https://accountmanagerservice.onrender.com';

  // Verify admin role and initialize token on mount
  useEffect(() => {
    if (!user || (user.email !== 'admin@example.com' && user.role !== 'admin')) {
      navigate('/login');
      return;
    }
    // Ensure token is stored after login
    const token = localStorage.getItem('token');
    if (token && !axios.defaults.headers.Authorization) {
      axios.defaults.headers.Authorization = `Bearer ${token}`;
    }
  }, [user, navigate]);

  // Fetch categories
  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No JWT token found in localStorage');
        }
        axios.defaults.headers.Authorization = `Bearer ${token}`; // Ensure header is set

        console.log('Fetching categories with token:', token);

        const response = await axios.get(`${PRODUCT_API_URL}/api/categories`);

        if (isMounted) {
          console.log('Fetch categories response:', response.data);
          setCategories(Array.isArray(response.data) ? response.data : []);
          setCategoryError('');
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching categories:', {
            message: err.message,
            response: err.response ? {
              status: err.response.status,
              data: err.response.data,
              headers: err.response.headers
            } : 'No response data'
          });
          setCategories([]);
          setCategoryError('Failed to fetch categories. This is likely due to a CORS issue with the product management backend. Please update the backend to allow requests from this origin.');
          if (err.response?.status === 401) {
            console.log('Unauthorized access, logging out...');
            await logout();
            navigate('/login');
          }
        }
      }
    };
    if (user) fetchCategories();
    return () => { isMounted = false; };
  }, [user, navigate, logout]);

  // Fetch products
  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No JWT token found in localStorage');
        }
        axios.defaults.headers.Authorization = `Bearer ${token}`; // Ensure header is set

        console.log('Fetching products with token:', token);

        const response = await axios.get(`${PRODUCT_API_URL}/api/products`, {
          params: { limit: 100 }
        });

        if (isMounted) {
          console.log('Fetch products response:', response.data);
          setProducts(response.data.products || []);
          setProductError('');
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching products:', {
            message: err.message,
            response: err.response ? {
              status: err.response.status,
              data: err.response.data,
              headers: err.response.headers
            } : 'No response data'
          });
          setProducts([]);
          setProductError('Failed to fetch products. This is likely due to a CORS issue with the product management backend. Please update the backend to allow requests from this origin.');
          if (err.response?.status === 401) {
            console.log('Unauthorized access, logging out...');
            await logout();
            navigate('/login');
          }
        }
      }
    };
    if (user) fetchProducts();
    return () => { isMounted = false; };
  }, [user, navigate, logout]);

  // Fetch users
  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No JWT token found in localStorage');
        }
        axios.defaults.headers.Authorization = `Bearer ${token}`; // Ensure header is set

        console.log('Fetching users with token:', token);

        const response = await axios.get(`${ACCOUNT_API_URL}/user/admin/users`);

        if (isMounted) {
          console.log('Fetch users response:', response.data);

          if (!Array.isArray(response.data)) {
            throw new Error('Unexpected response format: response.data is not an array');
          }

          setUsers(response.data);
          setError('');
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching users:', {
            message: err.message,
            response: err.response ? {
              status: err.response.status,
              data: err.response.data,
              headers: err.response.headers
            } : 'No response data'
          });
          setError(`Failed to fetch users: ${err.message}${err.response?.data?.message ? ` - ${err.response.data.message}` : ''}`);
          if (err.response?.status === 401) {
            console.log('Unauthorized access, logging out...');
            await logout();
            navigate('/login');
          }
        }
      }
    };
    if (user) fetchUsers();
    return () => { isMounted = false; };
  }, [user, navigate, logout]);

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

  const handleCreateOrUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No JWT token found in localStorage');
      }
      axios.defaults.headers.Authorization = `Bearer ${token}`; // Ensure header is set

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

      console.log(`Sending ${formData._id ? 'PUT' : 'POST'} request to ${PRODUCT_API_URL}/api/products with data:`, productData);

      if (formData._id) {
        await axios.put(`${PRODUCT_API_URL}/api/products/${formData._id}`, productData);
      } else {
        await axios.post(`${PRODUCT_API_URL}/api/products`, productData);
      }

      const response = await axios.get(`${PRODUCT_API_URL}/api/products`, {
        params: { limit: 100 }
      });

      console.log('Updated products list:', response.data);

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
      console.error('Error saving product:', {
        message: err.message,
        response: err.response ? {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        } : 'No response data'
      });
      setError(`Failed to save product: ${err.message}. Please check the input format.`);
      if (err.response?.status === 401) {
        console.log('Unauthorized access, logging out...');
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
      if (!token) {
        throw new Error('No JWT token found in localStorage');
      }
      axios.defaults.headers.Authorization = `Bearer ${token}`; // Ensure header is set

      console.log(`Deleting product with ID ${id}`);

      await axios.delete(`${PRODUCT_API_URL}/api/products/${id}`);

      setProducts(products.filter(product => product._id !== id));
    } catch (err) {
      console.error('Error deleting product:', {
        message: err.message,
        response: err.response ? {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        } : 'No response data'
      });
      setError(`Failed to delete product: ${err.message}`);
      if (err.response?.status === 401) {
        console.log('Unauthorized access, logging out...');
        await logout();
        navigate('/login');
      }
    }
  };

  const handleCreateDiscount = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No JWT token found in localStorage');
      }
      axios.defaults.headers.Authorization = `Bearer ${token}`; // Ensure header is set

      console.log('Creating discount with data:', {
        code: discountForm.code,
        discount_percentage: Number(discountForm.discount_percentage),
        usageLimit: Number(discountForm.usageLimit)
      });

      await axios.post('https://cartandcheckout.onrender.com/cart/admin/discount', {
        code: discountForm.code,
        discount_percentage: Number(discountForm.discount_percentage),
        usageLimit: Number(discountForm.usageLimit)
      });

      setDiscountForm({
        code: '',
        discount_percentage: '',
        usageLimit: ''
      });
      setError('');
      alert('Discount code created successfully!');
    } catch (err) {
      console.error('Error creating discount code:', {
        message: err.message,
        response: err.response ? {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        } : 'No response data'
      });
      setError(`Failed to create discount code: ${err.message}${err.response?.data?.error ? ` - ${err.response.data.error}` : ''}`);
      if (err.response?.status === 401) {
        console.log('Unauthorized access, logging out...');
        await logout();
        navigate('/login');
      }
    }
  };

  const handleCreateOrUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No JWT token found in localStorage');
      }
      axios.defaults.headers.Authorization = `Bearer ${token}`; // Ensure header is set

      const userData = {
        email: userForm.email,
        password: userForm.password,
        name: userForm.name,
        role: userForm.role
      };

      const url = userForm._id ? `${ACCOUNT_API_URL}/user/admin/users/${userForm._id}` : `${ACCOUNT_API_URL}/user/admin/users`;
      const method = userForm._id ? 'put' : 'post';

      console.log(`Sending ${method.toUpperCase()} request to ${url} with data:`, userData);

      await axios[method](url, userData);

      const response = await axios.get(`${ACCOUNT_API_URL}/user/admin/users`);

      console.log('Updated users list:', response.data);

      setUsers(response.data || []);
      setUserForm({
        _id: null,
        email: '',
        password: '',
        name: '',
        role: 'user'
      });
      setError('');
    } catch (err) {
      console.error('Error saving user:', {
        message: err.message,
        response: err.response ? {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        } : 'No response data'
      });
      setError(`Failed to save user: ${err.message}${err.response?.data?.message ? ` - ${err.response.data.message}` : ''}`);
      if (err.response?.status === 401) {
        console.log('Unauthorized access, logging out...');
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
      if (!token) {
        throw new Error('No JWT token found in localStorage');
      }
      axios.defaults.headers.Authorization = `Bearer ${token}`; // Ensure header is set

      console.log(`Deleting user with ID ${id}`);

      await axios.delete(`${ACCOUNT_API_URL}/user/admin/users/${id}`);

      setUsers(users.filter(user => user.id !== id));
    } catch (err) {
      console.error('Error deleting user:', {
        message: err.message,
        response: err.response ? {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        } : 'No response data'
      });
      setError(`Failed to delete user: ${err.message}`);
      if (err.response?.status === 401) {
        console.log('Unauthorized access, logging out...');
        await logout();
        navigate('/login');
      }
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: '#000000',
        color: '#FFFFFF',
        minHeight: '100vh',
        fontFamily: "'Playfair Display', serif",
        padding: '20px'
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: '#000000',
          padding: '20px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #D4AF37'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/logo_placeholder.png"
            alt="LuxeLane Logo"
            style={{ width: '50px', height: '50px', marginRight: '15px' }}
          />
          <div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#D4AF37',
                margin: 0
              }}
            >
              LuxeLane Admin
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: '#E0E0E0',
                margin: 0
              }}
            >
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
            fontFamily: '"Roboto", sans-serif',
            cursor: 'pointer',
            transition: 'background-color 0.3s'
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#D4AF37')}
        >
          Logout
        </button>
      </header>

      {/* Main Content */}
      <main style={{ padding: '40px' }}>
        <h1
          style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#D4AF37',
            textAlign: 'center',
            marginBottom: '40px'
          }}
        >
          Admin Dashboard
        </h1>

        {/* Create Discount Code */}
        <div
          style={{
            backgroundColor: '#1A1A1A',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '600px',
            margin: '0 auto 40px',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)'
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              color: '#D4AF37',
              marginBottom: '20px'
            }}
          >
            Create Discount Code
          </h2>
          {error && (
            <p
              style={{
                color: '#FF5555',
                marginBottom: '15px'
              }}
            >
              {error}
            </p>
          )}
          <div>
            <input
              type="text"
              name="code"
              placeholder="Discount Code (e.g., DIS10)"
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
                fontFamily: '"Roboto", sans-serif'
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
                fontFamily: '"Roboto", sans-serif'
              }}
            />
            <input
              type="number"
              name="usageLimit"
              placeholder="Usage Limit (e.g., 5)"
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
                fontFamily: '"Roboto", sans-serif'
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
                fontFamily: '"Roboto", sans-serif',
                cursor: 'pointer',
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#D4AF37')}
            >
              Create Discount Code
            </button>
          </div>
        </div>

        {/* Manage Users */}
        <div
          style={{
            backgroundColor: '#1A1A1A',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '600px',
            margin: '0 auto 40px',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)'
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              color: '#D4AF37',
              marginBottom: '20px'
            }}
          >
            {userForm._id ? 'Update User' : 'Create User'}
          </h2>
          {error && (
            <p
              style={{
                color: '#FF5555',
                marginBottom: '15px'
              }}
            >
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
                fontFamily: '"Roboto", sans-serif'
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
                fontFamily: '"Roboto", sans-serif'
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
                fontFamily: '"Roboto", sans-serif'
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
                fontFamily: '"Roboto", sans-serif'
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
                fontFamily: '"Roboto", sans-serif',
                cursor: 'pointer',
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#D4AF37')}
            >
              {userForm._id ? 'Update User' : 'Create User'}
            </button>
          </div>
        </div>

        {/* User List */}
        <div
          style={{
            backgroundColor: '#1A1A1A',
            padding: '30px',
            borderRadius: '10px',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
            marginBottom: '40px'
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              color: '#D4AF37',
              marginBottom: '20px'
            }}
          >
            User List
          </h2>
          {users.length === 0 ? (
            <p style={{ color: '#E0E0E0' }}>No users available.</p>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                color: '#FFFFFF',
                fontFamily: '"Roboto", sans-serif'
              }}
            >
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
                    <td style={{ padding: '10px' }}>
                      {new Date(user.createdAt).toLocaleString()}
                    </td>
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
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#D4AF37')}
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
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FF7777')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FF5555')}
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

        {/* Product Form */}
        <div
          style={{
            backgroundColor: '#1A1A1A',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '600px',
            margin: '0 auto 40px',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)'
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              color: '#D4AF37',
              marginBottom: '20px'
            }}
          >
            {formData._id ? 'Update Product' : 'Create Product'}
          </h2>
          {error && (
            <p
              style={{
                color: '#FF5555',
                marginBottom: '15px'
              }}
            >
              {error}
            </p>
          )}
          {categoryError && (
            <p
              style={{
                color: '#FF5555',
                marginBottom: '15px'
              }}
            >
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
                fontFamily: '"Roboto", sans-serif'
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
                fontFamily: '"Roboto", sans-serif'
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
                fontFamily: '"Roboto", sans-serif',
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
                fontFamily: '"Roboto", sans-serif'
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
                fontFamily: '"Roboto", sans-serif'
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
                fontFamily: '"Roboto", sans-serif'
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
                fontFamily: '"Roboto", sans-serif'
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
                fontFamily: '"Roboto", sans-serif',
                cursor: 'pointer',
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#D4AF37')}
            >
              {formData._id ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </div>

        {/* Product List */}
        <div
          style={{
            backgroundColor: '#1A1A1A',
            padding: '30px',
            borderRadius: '10px',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)'
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              color: '#D4AF37',
              marginBottom: '20px'
            }}
          >
            Product List
          </h2>
          {productError && (
            <p
              style={{
                color: '#FF5555',
                marginBottom: '15px'
              }}
            >
              {productError}
            </p>
          )}
          {products.length === 0 && !productError ? (
            <p style={{ color: '#E0E0E0' }}>No products available.</p>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                color: '#FFFFFF',
                fontFamily: '"Roboto", sans-serif'
              }}
            >
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
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#D4AF37')}
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
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FF7777')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FF5555')}
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
    </div>
  );
};

export default AdminDashboard;