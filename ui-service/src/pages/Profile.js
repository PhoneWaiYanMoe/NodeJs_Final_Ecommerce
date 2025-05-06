import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: user.name || '',
    password: '',
    deliveryAddresses: user.deliveryAddresses || [],
  });
  const [newAddress, setNewAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('deliveryAddress.')) {
      const [_, index, field] = name.split('.');
      const updatedAddresses = [...formData.deliveryAddresses];
      updatedAddresses[index] = {
        ...updatedAddresses[index],
        [field]: value,
      };
      setFormData({ ...formData, deliveryAddresses: updatedAddresses });
    } else if (name.includes('newAddress.')) {
      const field = name.split('.')[1];
      setNewAddress({ ...newAddress, [field]: value });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddAddress = () => {
    if (
      !newAddress.street ||
      !newAddress.city ||
      !newAddress.state ||
      !newAddress.zip ||
      !newAddress.country
    ) {
      setError('All address fields are required.');
      return;
    }
    setFormData({
      ...formData,
      deliveryAddresses: [...formData.deliveryAddresses, { ...newAddress }],
    });
    setNewAddress({
      street: '',
      city: '',
      state: '',
      zip: '',
      country: '',
    });
    setError('');
  };

  const handleDeleteAddress = (index) => {
    const updatedAddresses = formData.deliveryAddresses.filter((_, i) => i !== index);
    setFormData({ ...formData, deliveryAddresses: updatedAddresses });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('https://nodejs-final-ecommerce.onrender.com/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: formData.name,
          password: formData.password || undefined,
          deliveryAddresses: formData.deliveryAddresses,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      setUser(data.user);
      setError('');
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        navigate('/products');
      }, 1000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
      setSuccess('');
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
        padding: '40px',
      }}
    >
      <div
        style={{
          backgroundColor: '#1A1A1A',
          padding: '40px',
          borderRadius: '10px',
          width: '500px',
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
          Manage Profile
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
        {success && (
          <p
            style={{
              color: '#55FF55',
              textAlign: 'center',
              marginBottom: '15px',
            }}
          >
            {success}
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
            type="password"
            name="password"
            placeholder="New Password (optional)"
            value={formData.password}
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

          {/* Existing Delivery Addresses */}
          <h3 style={{ color: '#D4AF37', marginBottom: '10px' }}>Delivery Addresses</h3>
          {formData.deliveryAddresses.length > 0 ? (
            formData.deliveryAddresses.map((address, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: '#2A2A2A',
                  padding: '15px',
                  borderRadius: '5px',
                  marginBottom: '15px',
                }}
              >
                <input
                  type="text"
                  name={`deliveryAddress.${index}.street`}
                  placeholder="Street"
                  value={address.street}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '10px',
                    backgroundColor: '#E0E0E0',
                    border: 'none',
                    borderRadius: '5px',
                    color: '#000000',
                    fontFamily: "'Roboto', sans-serif",
                  }}
                />
                <input
                  type="text"
                  name={`deliveryAddress.${index}.city`}
                  placeholder="City"
                  value={address.city}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '10px',
                    backgroundColor: '#E0E0E0',
                    border: 'none',
                    borderRadius: '5px',
                    color: '#000000',
                    fontFamily: "'Roboto', sans-serif",
                  }}
                />
                <input
                  type="text"
                  name={`deliveryAddress.${index}.state`}
                  placeholder="State"
                  value={address.state}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '10px',
                    backgroundColor: '#E0E0E0',
                    border: 'none',
                    borderRadius: '5px',
                    color: '#000000',
                    fontFamily: "'Roboto', sans-serif",
                  }}
                />
                <input
                  type="text"
                  name={`deliveryAddress.${index}.zip`}
                  placeholder="Zip Code"
                  value={address.zip}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '10px',
                    backgroundColor: '#E0E0E0',
                    border: 'none',
                    borderRadius: '5px',
                    color: '#000000',
                    fontFamily: "'Roboto', sans-serif",
                  }}
                />
                <input
                  type="text"
                  name={`deliveryAddress.${index}.country`}
                  placeholder="Country"
                  value={address.country}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '10px',
                    backgroundColor: '#E0E0E0',
                    border: 'none',
                    borderRadius: '5px',
                    color: '#000000',
                    fontFamily: "'Roboto', sans-serif",
                  }}
                />
                <button
                  onClick={() => handleDeleteAddress(index)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#FF5555',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '5px',
                    fontFamily: "'Roboto', sans-serif",
                    cursor: 'pointer',
                    transition: 'background-color 0.3s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FF7777')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FF5555')}
                >
                  Delete Address
                </button>
              </div>
            ))
          ) : (
            <p style={{ color: '#E0E0E0' }}>No delivery addresses added.</p>
          )}

          {/* Add New Address */}
          <h3 style={{ color: '#D4AF37', marginTop: '20px', marginBottom: '10px' }}>
            Add New Address
          </h3>
          <input
            type="text"
            name="newAddress.street"
            placeholder="Street"
            value={newAddress.street}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              backgroundColor: '#E0E0E0',
              border: 'none',
              borderRadius: '5px',
              color: '#000000',
              fontFamily: "'Roboto', sans-serif",
            }}
          />
          <input
            type="text"
            name="newAddress.city"
            placeholder="City"
            value={newAddress.city}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              backgroundColor: '#E0E0E0',
              border: 'none',
              borderRadius: '5px',
              color: '#000000',
              fontFamily: "'Roboto', sans-serif",
            }}
          />
          <input
            type="text"
            name="newAddress.state"
            placeholder="State"
            value={newAddress.state}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              backgroundColor: '#E0E0E0',
              border: 'none',
              borderRadius: '5px',
              color: '#000000',
              fontFamily: "'Roboto', sans-serif",
            }}
          />
          <input
            type="text"
            name="newAddress.zip"
            placeholder="Zip Code"
            value={newAddress.zip}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              backgroundColor: '#E0E0E0',
              border: 'none',
              borderRadius: '5px',
              color: '#000000',
              fontFamily: "'Roboto', sans-serif",
            }}
          />
          <input
            type="text"
            name="newAddress.country"
            placeholder="Country"
            value={newAddress.country}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              backgroundColor: '#E0E0E0',
              border: 'none',
              borderRadius: '5px',
              color: '#000000',
              fontFamily: "'Roboto', sans-serif",
            }}
          />
          <button
            onClick={handleAddAddress}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#55FF55',
              color: '#000000',
              border: 'none',
              borderRadius: '5px',
              fontFamily: "'Roboto', sans-serif",
              cursor: 'pointer',
              transition: 'background-color 0.3s',
              marginBottom: '20px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#77FF77')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#55FF55')}
          >
            Add Address
          </button>

          {/* Update Profile Button */}
          <button
            onClick={handleUpdate}
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
            Update Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;