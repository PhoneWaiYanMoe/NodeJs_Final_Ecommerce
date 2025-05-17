
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// Chatbot endpoint
router.post('/', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }

    // Initialize the Gemini API with your API key
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ message: 'Gemini API key is not configured' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Create a context about LuxeLane for better responses
    const context = `
      You are the AI assistant for LuxeLane, a luxury e-commerce platform. 
      
      About LuxeLane:
      - We sell high-end electronics and luxury tech accessories
      - Our motto is "Elevate Your Everyday"
      - We offer a loyalty points program where customers earn 10% of their purchase value in points
      - 1 point is worth $0.01 and can be redeemed at checkout
      - We offer free shipping on orders over $50
      - Returns are accepted within 30 days of purchase
      - We ship worldwide with standard delivery taking 2-5 business days
      - Our products include laptops, monitors, accessories, and hard drives
      
      Keep your responses friendly, helpful, and concise. If you don't know something specific about 
      our products or policies, recommend that the customer contact customer service.
    `;

    // For safety, append the context to the user's query
    const fullPrompt = `${context}\n\nCustomer: ${query}\n\nYour helpful response:`;

    // Get the Gemini model and generate content
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    });

    const response = result.response;
    const text = response.text();

    return res.status(200).json({ reply: text });
  } catch (error) {
    console.error('Gemini API error:', error);
    return res.status(500).json({ 
      message: 'Failed to get response from Gemini API',
      error: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Chatbot API is online' });
});

export default router;