import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SetupPassword = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const response = await fetch('https://nodejs-final-ecommerce.onrender.com/user/setup-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to set password');
      }

      setError('');
      navigate('/products');
    } catch (error) {
      console.error('Error setting password:', error);
      setError(error.message || 'Failed to set password. Please try again.');
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
        <h2
          style={{
            fontSize: '24px',
            color: '#D4AF37',
            textAlign: 'center',
            marginBottom: '20px',
          }}
        >
          Set Your Password
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
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            onClick={handleSubmit}
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
            Set Password
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupPassword;
