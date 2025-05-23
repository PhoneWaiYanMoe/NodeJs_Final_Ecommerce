import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    shippingAddressCollection: user?.shippingAddressCollection || [],
  });
  const [newAddress, setNewAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  });
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedAddressIndex, setExpandedAddressIndex] = useState(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState({
    points: 0,
    value: 0,
    history: []
  });
  const navigate = useNavigate();

  // Initialize state only once on mount
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        shippingAddressCollection: user.shippingAddressCollection || [],
      });
      fetchUserPoints();
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('newAddress.')) {
      const field = name.split('.')[1];
      setNewAddress({ ...newAddress, [field]: value });
    } else if (name === 'oldPassword' || name === 'newPassword' || name === 'confirmPassword') {
      // Fix password field handling
      setPasswordData({ ...passwordData, [name]: value });
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
    const isDuplicate = formData.shippingAddressCollection.some(address =>
      address.street === newAddress.street &&
      address.city === newAddress.city &&
      address.state === newAddress.state &&
      address.zip === newAddress.zip &&
      address.country === newAddress.country
    );
    if (isDuplicate) {
      setError('This address already exists.');
      return;
    }
    setFormData({
      ...formData,
      shippingAddressCollection: [...formData.shippingAddressCollection, { ...newAddress }],
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

  const handleDeleteAddress = async (index) => {
    const updatedAddresses = formData.shippingAddressCollection.filter((_, i) => i !== index);
    setFormData({ ...formData, shippingAddressCollection: updatedAddresses });

    try {
      const response = await fetch('https://nodejs-final-ecommerce.onrender.com/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          shippingAddressCollection: updatedAddresses,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete address');
      }

      setUser(data.user);
      setError('');
      setSuccess('Address deleted successfully!');
      setTimeout(() => {
        setSuccess('');
      }, 2000);
    } catch (error) {
      console.error('Error deleting address:', error);
      setError(error.message || 'Failed to delete address. Please try again.');
      setSuccess('');
      // Revert the local state if the backend update fails
      setFormData({ ...formData, shippingAddressCollection: user.shippingAddressCollection || [] });
    }
  };

  const handleSetDefaultAddress = async (index) => {
    if (!formData.shippingAddressCollection[index]) {
      setError('Invalid address index.');
      return;
    }

    try {
      const response = await fetch('https://nodejs-final-ecommerce.onrender.com/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          setDefaultAddressIndex: index,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to set default address');
      }

      setUser(data.user);
      setError('');
      setSuccess('Default address set successfully!');
      setTimeout(() => {
        setSuccess('');
      }, 2000);
    } catch (error) {
      console.error('Error setting default address:', error);
      setError(error.message || 'Failed to set default address. Please try again.');
      setSuccess('');
    }
  };

  const handleSaveAddress = async () => {
    try {
      const response = await fetch('https://nodejs-final-ecommerce.onrender.com/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: formData.name,
          shippingAddressCollection: formData.shippingAddressCollection,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update address');
      }

      setUser(data.user);
      setError('');
      setSuccess('Address updated successfully!');
      setTimeout(() => {
        setSuccess('');
      }, 2000);
    } catch (error) {
      console.error('Error updating address:', error);
      setError(error.message || 'Failed to update address. Please try again.');
      setSuccess('');
    }
  };

  const handleSavePassword = async () => {
    // Validate password input
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError('All password fields are required.');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    
    try {
      // Log the data being sent for debugging
      console.log('Sending password update request with data:', {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      });
      
      const response = await fetch('https://nodejs-final-ecommerce.onrender.com/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update password');
      }

      setUser(data.user);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setError('');
      setSuccess('Password updated successfully!');
      setTimeout(() => {
        setSuccess('');
      }, 2000);
    } catch (error) {
      console.error('Error updating password:', error);
      setError(error.message || 'Failed to update password. Please try again.');
      setSuccess('');
    }
  };

  const toggleAddressDetails = (index) => {
    setExpandedAddressIndex(expandedAddressIndex === index ? null : index);
  };

  const fetchUserPoints = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');
      
      const response = await axios.get('https://nodejs-final-ecommerce-1.onrender.com/cart/points', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setLoyaltyPoints({
        points: response.data.points || 0,
        value: response.data.pointsValue || 0,
        history: [] // We'll populate this when showing order history
      });
    } catch (error) {
      console.error('Error fetching loyalty points:', error);
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

        {/* Name Section */}
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
        </div>

        {/* Delivery Addresses Section */}
        <h3 style={{ color: '#D4AF37', marginBottom: '10px' }}>Delivery Addresses</h3>
        {formData.shippingAddressCollection.length > 0 ? (
          formData.shippingAddressCollection.map((address, index) => (
            <div
              key={index}
              style={{
                backgroundColor: '#2A2A2A',
                padding: '10px',
                borderRadius: '5px',
                marginBottom: '10px',
              }}
            >
              <div
                onClick={() => toggleAddressDetails(index)}
                style={{
                  cursor: 'pointer',
                  padding: '10px',
                  backgroundColor: '#333333',
                  borderRadius: '5px',
                  marginBottom: '5px',
                }}
              >
                <strong>Address {index + 1}</strong>
                {expandedAddressIndex === index && (
                  <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#1A1A1A' }}>
                    <input
                      type="text"
                      name={`shippingAddressCollection.${index}.street`}
                      placeholder="Street"
                      value={address.street}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '5px',
                        marginBottom: '5px',
                        backgroundColor: '#E0E0E0',
                        border: 'none',
                        borderRadius: '3px',
                        color: '#000000',
                        fontFamily: "'Roboto', sans-serif",
                      }}
                    />
                    <input
                      type="text"
                      name={`shippingAddressCollection.${index}.city`}
                      placeholder="City"
                      value={address.city}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '5px',
                        marginBottom: '5px',
                        backgroundColor: '#E0E0E0',
                        border: 'none',
                        borderRadius: '3px',
                        color: '#000000',
                        fontFamily: "'Roboto', sans-serif",
                      }}
                    />
                    <input
                      type="text"
                      name={`shippingAddressCollection.${index}.state`}
                      placeholder="State"
                      value={address.state}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '5px',
                        marginBottom: '5px',
                        backgroundColor: '#E0E0E0',
                        border: 'none',
                        borderRadius: '3px',
                        color: '#000000',
                        fontFamily: "'Roboto', sans-serif",
                      }}
                    />
                    <input
                      type="text"
                      name={`shippingAddressCollection.${index}.zip`}
                      placeholder="Zip Code"
                      value={address.zip}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '5px',
                        marginBottom: '5px',
                        backgroundColor: '#E0E0E0',
                        border: 'none',
                        borderRadius: '3px',
                        color: '#000000',
                        fontFamily: "'Roboto', sans-serif",
                      }}
                    />
                    <input
                      type="text"
                      name={`shippingAddressCollection.${index}.country`}
                      placeholder="Country"
                      value={address.country}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '5px',
                        marginBottom: '5px',
                        backgroundColor: '#E0E0E0',
                        border: 'none',
                        borderRadius: '3px',
                        color: '#000000',
                        fontFamily: "'Roboto', sans-serif",
                      }}
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDeleteAddress(index)}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#FF5555',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '5px',
                  fontFamily: "'Roboto', sans-serif",
                  cursor: 'pointer',
                  transition: 'background-color 0.3s',
                  marginBottom: '5px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FF7777')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FF5555')}
              >
                Delete Address
              </button>
              <button
                onClick={() => handleSetDefaultAddress(index)}
                style={{
                  width: '100%',
                  padding: '8px',
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
                Set as Default
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
        <button
          onClick={handleSaveAddress}
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
            marginBottom: '20px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D4AF37')}
        >
          Save Address
        </button>

        {/* Loyalty Points Section */}
        <div style={{
          backgroundColor: '#222222',
          padding: '20px',
          borderRadius: '10px',
          marginTop: '30px',
          marginBottom: '30px',
          border: '1px solid #D4AF37'
        }}>
          <h3 style={{ fontSize: '22px', color: '#D4AF37', marginBottom: '15px' }}>
            Loyalty Points
          </h3>
          
          <div style={{
            backgroundColor: '#1A1A1A',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '15px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <p style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '5px' }}>
                Available Points:
              </p>
              <p style={{ fontSize: '24px', color: '#55FF55', fontWeight: 'bold', marginBottom: '0' }}>
                {loyaltyPoints.points}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '16px', color: '#E0E0E0', marginBottom: '5px' }}>
                Value:
              </p>
              <p style={{ fontSize: '24px', color: '#D4AF37', fontWeight: 'bold', marginBottom: '0' }}>
                ${loyaltyPoints.value.toFixed(2)}
              </p>
            </div>
          </div>
          
          <p style={{ fontSize: '14px', color: '#E0E0E0' }}>
            You earn points on every purchase (10% of purchase value).
            Points can be redeemed during checkout.
          </p>
          
          <Link to="/orders">
            <button
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '10px',
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
              View Points History
            </button>
          </Link>
        </div>

        {/* Password Change Section */}
        <h3 style={{ color: '#D4AF37', marginBottom: '10px' }}>Change Password</h3>
        <input
          type="password"
          name="oldPassword"
          placeholder="Old Password"
          value={passwordData.oldPassword}
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
          type="password"
          name="newPassword"
          placeholder="New Password"
          value={passwordData.newPassword}
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
          type="password"
          name="confirmPassword"
          placeholder="Confirm New Password"
          value={passwordData.confirmPassword}
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
          onClick={handleSavePassword}
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
          Save Password
        </button>
      </div>
    </div>
  );
};

export default Profile;