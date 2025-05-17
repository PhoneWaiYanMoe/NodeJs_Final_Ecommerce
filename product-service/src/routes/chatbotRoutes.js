import express from 'express';
import axios from 'axios';

const router = express.Router();

// Chatbot endpoint
router.post('/', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }

    // Get API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ message: 'Gemini API key is not configured' });
    }

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

    // Direct API call to Gemini using v1beta endpoint and gemini-1.5-flash model
    try {
      console.log("Making API request to Gemini API v1beta with gemini-1.5-flash");
      
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: fullPrompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log("API request successful");
      
      // Extract the generated text from the response
      const generatedText = response.data.candidates[0].content.parts[0].text;
      
      return res.status(200).json({ reply: generatedText });
      
    } catch (apiError) {
      console.error("API call error:", apiError.response?.data || apiError.message);
      
      // Try fallback to gemini-pro model if gemini-1.5-flash fails
      try {
        console.log("Attempting fallback to gemini-pro model");
        
        const fallbackResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
          {
            contents: [
              {
                parts: [
                  {
                    text: fullPrompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024
            }
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log("Fallback API request successful");
        
        // Extract the generated text from the response
        const fallbackText = fallbackResponse.data.candidates[0].content.parts[0].text;
        
        return res.status(200).json({ reply: fallbackText });
        
      } catch (fallbackError) {
        console.error("Fallback API call error:", fallbackError.response?.data || fallbackError.message);
        
        // Provide a friendly response if both models fail
        return res.status(200).json({ 
          reply: "I'm sorry, I'm having trouble connecting to my knowledge base. Please try a different question or contact our support team at support@luxelane.com."
        });
      }
    }
  } catch (error) {
    console.error('Error in chatbot route:', error);
    
    // Return a friendly error message to the user
    return res.status(200).json({ 
      reply: "I apologize, but I'm experiencing technical difficulties at the moment. Please try again later or contact our customer service for immediate assistance."
    });
  }
});

// Test endpoint to verify API key
router.get('/test-key', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ message: 'GEMINI_API_KEY is not set' });
    }
    
    // Only return the first and last few characters of the key for security
    const maskedKey = apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 4);
    
    // Test all available models
    const models = [
      'gemini-1.5-flash', 
      'gemini-pro',
      'gemini-1.0-pro'
    ];
    
    const results = {};
    
    for (const model of models) {
      try {
        console.log(`Testing model: ${model}`);
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            contents: [
              {
                parts: [
                  {
                    text: 'Hello world'
                  }
                ]
              }
            ]
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        results[model] = {
          status: 'success',
          response: response.data.candidates[0].content.parts[0].text
        };
      } catch (apiError) {
        results[model] = {
          status: 'failure',
          error: apiError.response?.data?.error?.message || apiError.message
        };
      }
    }
    
    return res.status(200).json({ 
      message: 'API key test results',
      keyPreview: maskedKey,
      results
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Test available models
router.get('/models', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ message: 'GEMINI_API_KEY is not set' });
    }
    
    try {
      const response = await axios.get(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Extract just the model names for cleaner output
      const modelNames = response.data.models.map(model => model.name);
      
      return res.status(200).json({ 
        message: 'Available models',
        models: modelNames
      });
    } catch (apiError) {
      return res.status(500).json({ 
        message: 'Failed to retrieve models',
        error: apiError.response?.data || apiError.message
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Chatbot API is online' });
});

export default router;