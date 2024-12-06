require('dotenv').config();
const express = require('express');
const cors = require('cors'); 
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 1000;

const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// CORS Configuration with more robust options
app.use(cors({
  origin: [
    'https://maxxxxxai.netlify.app', 
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Error Handling Middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!', 
    details: process.env.NODE_ENV === 'development' ? err.message : null 
  });
};

// Text Generation Endpoint
app.post('/generate', async (req, res, next) => {
  const { prompt, conversationHistory = [] } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
      }
    });

    // Prepare context with conversation history
    const contextPrompt = conversationHistory.length > 0 
      ? `Conversation Context:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nLatest Query: ${prompt}`
      : prompt;

    const result = await model.generateContent(contextPrompt);

    if (result && result.response && typeof result.response.text === 'function') {
      const generatedText = await result.response.text();
      return res.json({ generatedText });
    } else {
      return res.status(500).json({ error: "Failed to generate content" });
    }
  } catch (error) {
    next(error);
  }
});

// Image Analysis Endpoint
app.post('/analyze-image', async (req, res, next) => {
  const { image, question = 'Describe this image in detail.' } = req.body;

  if (!image) {
    return res.status(400).json({ error: "Image is required" });
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
      }
    });

    // Remove data URL prefix if present
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

    const imageData = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image
      }
    };

    // Combine image with question
    const result = await model.generateContent([
      question,
      imageData
    ]);

    if (result && result.response && typeof result.response.text === 'function') {
      const analysis = await result.response.text();
      return res.json({ analysis });
    } else {
      return res.status(500).json({ error: "Failed to analyze image" });
    }
  } catch (error) {
    next(error);
  }
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Apply error handling middleware
app.use(errorHandler);

// Start Server
const server = app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;