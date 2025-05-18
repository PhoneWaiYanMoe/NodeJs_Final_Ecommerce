import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../App';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    shippingAddress: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: '',
    },
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('shippingAddress.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        shippingAddress: { ...prev.shippingAddress, [field]: value },
      }));
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('https://nodejs-final-ecommerce.onrender.com/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          shippingAddress: formData.shippingAddress,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to register');
      }

      localStorage.setItem('token', data.token);
      navigate('/login');
    } catch (error) {
      console.error('Error registering user:', error);
      setError(error.message || 'Failed to register. Please try again.');
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#000000',
        color: '#FFFFFF',
        minHeight: '100vh',
        fontFamily: "'Playfair Display', serif",
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          backgroundColor: '#1A1A1A',
          padding: '40px',
          borderRadius: '10px',
          width: '400px',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img
            src="/logo_placeholder.png"
            alt="LuxeLane Logo"
            style={{ width: '50px', height: '50px', marginBottom: '15px' }}
          />
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#D4AF37',
              marginBottom: '5px',
            }}
          >
            LuxeLane
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: '#E0E0E0',
            }}
          >
            Elevate Your Everyday.
          </p>
        </div>
        <h2
          style={{
            fontSize: '24px',
            color: '#D4AF37',
            textAlign: 'center',
            marginBottom: '20px',
          }}
        >
          Register
        </h2>
        {error && (
          <p
            style={{
              color: '#FF5555',
              textAlign: 'center',
              marginBottom: '15px',
            }}
          >
            {error}
          </p>
        )}
        <div>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
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
              fontFamily: "'Roboto', sans-serif",
            }}
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
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
            }}
          />
          <input
            type="text"
            name="shippingAddress.street"
            placeholder="Street"
            value={formData.shippingAddress.street}
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
            }}
          />
          <input
            type="text"
            name="shippingAddress.city"
            placeholder="City"
            value={formData.shippingAddress.city}
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
            }}
          />
          <input
            type="text"
            name="shippingAddress.state"
            placeholder="State"
            value={formData.shippingAddress.state}
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
            }}
          />
          <input
            type="text"
            name="shippingAddress.zip"
            placeholder="Zip Code"
            value={formData.shippingAddress.zip}
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
            }}
          />
          <input
            type="text"
            name="shippingAddress.country"
            placeholder="Country"
            value={formData.shippingAddress.country}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '20px',
              backgroundColor: '#E0E0E0',
              border: 'none',
              borderRadius: '5px',
              color: '#000000',
              fontFamily: "'Roboto', sans-serif",
            }}
          />
          <button
            onClick={handleRegister}
            style={{
              width: '100%',
              padding: '10px',
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
            Register
          </button>
          <p
            style={{
              textAlign: 'center',
              marginTop: '15px',
              color: '#E0E0E0',
            }}
          >
            Already have an account? <Link to="/login" style={{ color: '#D4AF37' }}>Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
