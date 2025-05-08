import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../App';
import { GoogleLogin } from '@react-oauth/google';
import FacebookLogin from 'react-facebook-login';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await login(formData.email, formData.password);
      const user = response.user;
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/products');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      setError(error.message || 'Invalid credentials. Please try again.');
    }
  };
  //comment
  const handleGoogleLogin = async (credentialResponse) => {
    try {
      const response = await fetch('https://nodejs-final-ecommerce.onrender.com/api/users/media-login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      const data = await response.json();
      if (response.ok) {
        const user = data.user;
        await login(user.email, null, data.token);
        if (user.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/products');
        }
      } else {
        setError(data.message || 'Google login failed');
      }
    } catch (error) {
      console.error('Google login error:', error);
      setError('Google login failed. Please try again.');
    }
  };

  const handleFacebookLogin = async (response) => {
    if (response.accessToken) {
      try {
        const res = await fetch('https://nodejs-final-ecommerce.onrender.com/api/users/media-login/facebook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: response.accessToken, userID: response.userID }),
        });
        const data = await res.json();
        if (res.ok) {
          const user = data.user;
          await login(user.email, null, data.token);
          if (user.role === 'admin') {
            navigate('/admin/dashboard');
          } else {
            navigate('/products');
          }
        } else {
          setError(data.message || 'Facebook login failed');
        }
      } catch (error) {
        console.error('Facebook login error:', error);
        setError('Facebook login failed. Please try again.');
      }
    } else {
      setError('Facebook login cancelled or failed');
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
          Login
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
            type="password"
            name="password"
            placeholder="Password"
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
          <button
            onClick={handleLogin}
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
              marginBottom: '15px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D4AF37')}
          >
            Login
          </button>
          <div style={{ marginBottom: '15px', textAlign: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => setError('Google login failed')}
              text="signin_with"
              width="320"
            />
          </div>
          <div style={{ marginBottom: '15px', textAlign: 'center' }}>
            <FacebookLogin
              appId={process.env.REACT_APP_FACEBOOK_APP_ID || 'YOUR_FACEBOOK_APP_ID'}
              autoLoad={false}
              fields="name,email,picture"
              callback={handleFacebookLogin}
              cssClass="facebook-login-button"
              textButton="Login with Facebook"
            />
          </div>
          <p
            style={{
              textAlign: 'center',
              marginTop: '15px',
              color: '#E0E0E0',
            }}
          >
            Don’t have an account? <Link to="/register" style={{ color: '#D4AF37' }}>Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// Optional: Add custom CSS for Facebook button
const styles = `
  .facebook-login-button {
    background-color: #4267B2;
    color: white;
    padding: 10px;
    border-radius: 5px;
    border: none;
    width: 100%;
    font-family: 'Roboto', sans-serif;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  .facebook-login-button:hover {
    background-color: #365899;
  }
`;

// Inject styles into document
const styleSheet = document.createElement('style');
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default Login;
