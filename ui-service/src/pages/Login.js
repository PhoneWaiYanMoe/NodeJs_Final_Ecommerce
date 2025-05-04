import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../App';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
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
            await login(formData.email, formData.password);

            // Redirect based on user role
            if (formData.email === 'admin@example.com') {
                navigate('/admin/dashboard');
            } else {
                navigate('/products');
            }
        } catch (error) {
            console.error('Error logging in:', error);
            setError(error.message || 'Failed to login. Please try again.');
        }
    };

    return (
        <div style={{
            backgroundColor: '#000000',
            color: '#FFFFFF',
            minHeight: '100vh',
            fontFamily: "'Playfair Display', serif",
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <div style={{
                backgroundColor: '#1A1A1A',
                padding: '40px',
                borderRadius: '10px',
                width: '400px',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <img
                        src="/logo_placeholder.png"
                        alt="LuxeLane Logo"
                        style={{ width: '50px', height: '50px', marginBottom: '15px' }}
                    />
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: '#D4AF37',
                        marginBottom: '5px'
                    }}>
                        LuxeLane
                    </h1>
                    <p style={{
                        fontSize: '14px',
                        color: '#E0E0E0'
                    }}>
                        Elevate Your Everyday.
                    </p>
                </div>
                <h2 style={{
                    fontSize: '24px',
                    color: '#D4AF37',
                    textAlign: 'center',
                    marginBottom: '20px'
                }}>
                    Login
                </h2>
                {error && (
                    <p style={{
                        color: '#FF5555',
                        textAlign: 'center',
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
                            fontFamily: "'Roboto', sans-serif"
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
                            fontFamily: "'Roboto', sans-serif"
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
                            fontFamily: "'Roboto', sans-serif'",
                            cursor: 'pointer',
                            transition: 'background-color 0.3s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D4AF37')}
                    >
                        Login
                    </button>
                    <p style={{
                        textAlign: 'center',
                        marginTop: '15px',
                        color: '#E0E0E0'
                    }}>
                        Don't have an account? <Link to="/register" style={{ color: '#D4AF37' }}>Register</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;