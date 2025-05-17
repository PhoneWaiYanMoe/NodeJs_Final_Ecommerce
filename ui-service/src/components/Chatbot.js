
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      sender: 'bot', 
      text: 'Hi there! Welcome to LuxeLane. How can I help you today?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Common questions and predefined answers
  const commonQuestions = {
    'payment methods': 'We accept all major credit cards, including Visa, MasterCard, American Express, and Discover.',
    'shipping policy': 'We offer free shipping on all orders over $50. Standard shipping typically takes 2-5 business days.',
    'return policy': 'You can return any unused item within 30 days of delivery for a full refund.',
    'delivery time': 'Standard shipping typically takes 2-5 business days. Express shipping options are available at checkout.',
    'contact information': 'You can reach our customer service at support@luxelane.com or call us at (123) 456-7890.',
    'loyalty points': 'You earn points with every purchase (10% of your purchase value). 1 point is worth $0.01 and can be redeemed at checkout.',
    'discount codes': 'We regularly offer discount codes to our subscribers. Sign up for our newsletter to receive exclusive offers.',
    'account creation': 'To create an account, click on Login and then select Register. You\'ll need to provide your email address and shipping information.',
  };

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const findMatchingAnswer = (query) => {
    const normalizedQuery = query.toLowerCase();
    
    for (const [key, value] of Object.entries(commonQuestions)) {
      if (normalizedQuery.includes(key)) {
        return value;
      }
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message
    const userMessage = { sender: 'user', text: input };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // First check if we can answer with predefined responses
      const predefinedAnswer = findMatchingAnswer(input);
      
      if (predefinedAnswer) {
        setTimeout(() => {
          setMessages(prevMessages => [
            ...prevMessages, 
            { sender: 'bot', text: predefinedAnswer }
          ]);
          setIsLoading(false);
        }, 500);
        return;
      }
      
      // If no predefined answer, use the Gemini API
      // Change this URL to your product service API endpoint
      const response = await axios.post('https://product-management-soyo.onrender.com/api/chatbot', 
        { query: input }
      );
      
      // Add bot response
      setMessages(prevMessages => [
        ...prevMessages, 
        { sender: 'bot', text: response.data.reply }
      ]);
    } catch (error) {
      console.error('Error getting chatbot response:', error);
      setMessages(prevMessages => [
        ...prevMessages, 
        { 
          sender: 'bot', 
          text: 'I apologize, but I encountered an error. Please try asking something else or contact our support team.' 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Chat toggle button */}
      <button 
        onClick={toggleChat}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#D4AF37',
          color: '#000000',
          border: 'none',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
          cursor: 'pointer',
          fontSize: '24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          transition: 'background-color 0.3s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E0E0E0')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D4AF37')}
      >
        {isOpen ? '×' : '?'}
      </button>
      
      {/* Chat window */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '350px',
            height: '500px',
            backgroundColor: '#1A1A1A',
            borderRadius: '10px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
            border: '1px solid #D4AF37',
          }}
        >
          {/* Chat header */}
          <div 
            style={{
              padding: '15px',
              backgroundColor: '#1A1A1A',
              borderBottom: '1px solid #D4AF37',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <img
              src="/logo.png"
              alt="LuxeLane Logo"
              style={{ width: '30px', height: '30px', marginRight: '10px' }}
            />
            <h3 
              style={{
                margin: 0,
                color: '#D4AF37',
                fontFamily: "'Playfair Display', serif",
              }}
            >
              LuxeLane Assistant
            </h3>
          </div>
          
          {/* Chat messages */}
          <div 
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '15px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {messages.map((message, index) => (
              <div 
                key={index}
                style={{
                  alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: message.sender === 'user' ? '#D4AF37' : '#333333',
                  color: message.sender === 'user' ? '#000000' : '#FFFFFF',
                  padding: '10px 15px',
                  borderRadius: message.sender === 'user' ? '18px 18px 0 18px' : '18px 18px 18px 0',
                  maxWidth: '80%',
                  wordBreak: 'break-word',
                  fontFamily: "'Roboto', sans-serif",
                }}
              >
                {message.text}
              </div>
            ))}
            
            {isLoading && (
              <div 
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#333333',
                  color: '#FFFFFF',
                  padding: '15px',
                  borderRadius: '18px 18px 18px 0',
                  maxWidth: '60%',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                  <div style={{ width: '8px', height: '8px', backgroundColor: '#D4AF37', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0s' }}></div>
                  <div style={{ width: '8px', height: '8px', backgroundColor: '#D4AF37', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.32s' }}></div>
                  <div style={{ width: '8px', height: '8px', backgroundColor: '#D4AF37', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.64s' }}></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Chat input */}
          <form 
            onSubmit={handleSubmit}
            style={{
              padding: '15px',
              borderTop: '1px solid #333333',
              display: 'flex',
              gap: '10px',
            }}
          >
            <input 
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#333333',
                border: 'none',
                borderRadius: '5px',
                color: '#FFFFFF',
                fontFamily: "'Roboto', sans-serif",
              }}
            />
            <button 
              type="submit"
              disabled={isLoading}
              style={{
                padding: '10px 15px',
                backgroundColor: isLoading ? '#666666' : '#D4AF37',
                color: '#000000',
                border: 'none',
                borderRadius: '5px',
                fontFamily: "'Roboto', sans-serif",
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s',
              }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#E0E0E0')}
              onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#D4AF37')}
            >
              Send
            </button>
          </form>
          
          {/* Chat footer */}
          <div
            style={{
              padding: '10px',
              borderTop: '1px solid #333333',
              textAlign: 'center',
              fontSize: '12px',
              color: '#666666',
              fontFamily: "'Roboto', sans-serif",
            }}
          >
            Powered by Gemini AI
          </div>
        </div>
      )}
      
      <style>
        {`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
            40% { transform: scale(1.0); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};
// Export the Chatbot component
export default Chatbot;