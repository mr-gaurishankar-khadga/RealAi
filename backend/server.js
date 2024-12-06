require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 1000;

// More permissive CORS setup for development
app.use(cors({
  origin: '*', // During development, accept all origins
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase payload limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/analyze-image', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: "Image data is required" });
    }

    if (!apiKey) {
      return res.status(500).json({ error: "API key not configured" });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/)[1];

    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    const prompt = "Please analyze this image and describe what you see in detail.";
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);

    const response = await result.response;
    const analysis = response.text();

    return res.json({ analysis });
  } catch (error) {
    console.error("Error processing image:", error);
    return res.status(500).json({ 
      error: "Failed to analyze image", 
      details: error.message 
    });
  }
});

app.post('/generate', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();
    return res.json({ generatedText });
  } catch (error) {
    console.error("Error generating content:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ 
    error: "Internal server error", 
    details: err.message 
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});