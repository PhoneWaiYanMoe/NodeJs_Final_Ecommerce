// API Configuration
const config = {
  // Base URLs for different services
  API_URLS: {
    USER_SERVICE: 'https://nodejs-final-ecommerce.onrender.com/user',
    PRODUCT_SERVICE: 'https://product-management-soyo.onrender.com/api',
    CART_SERVICE: 'https://nodejs-final-ecommerce-1.onrender.com/cart'
  },
  
  // Helper function to get full URLs
  getUrl: function(service, endpoint = '') {
    return `${this.API_URLS[service]}${endpoint ? '/' + endpoint : ''}`;
  }
};

export default config;