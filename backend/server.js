require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'https://maxxxxxai.netlify.app/'], 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase payload size limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Validate API key
if (!process.env.GOOGLE_API_KEY) {
  console.error('GOOGLE_API_KEY is not set');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Image analysis endpoint with robust error handling
app.post('/analyze-image', async (req, res) => {
  try {
    const { image } = req.body;
    
    // Validate image data
    if (!image || !image.startsWith('data:image')) {
      return res.status(400).json({ 
        error: "Invalid image data", 
        message: "Please provide a valid base64 encoded image" 
      });
    }

    // Extract base64 and MIME type
    const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return res.status(400).json({ 
        error: "Image format error", 
        message: "Unable to parse image data" 
      });
    }

    const [, mimeType, base64Data] = base64Match;

    // Select appropriate model
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    // Generate content
    const prompt = "Analyze this image in detail. Describe its contents, key elements, and provide insights.";
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: `image/${mimeType}`
        }
      }
    ]);

    const response = await result.response;
    const analysis = response.text();

    return res.json({ 
      analysis, 
      mimeType,
      imageSize: `${base64Data.length / 1024} KB` 
    });

  } catch (error) {
    console.error("Detailed Image Processing Error:", error);
    
    const errorResponse = {
      error: "Image Analysis Failed",
      details: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    };

    // Map different types of errors
    if (error.message.includes('API key')) {
      errorResponse.code = 'INVALID_API_KEY';
      return res.status(401).json(errorResponse);
    }

    if (error.message.includes('quota') || error.message.includes('limit')) {
      errorResponse.code = 'QUOTA_EXCEEDED';
      return res.status(429).json(errorResponse);
    }

    return res.status(500).json(errorResponse);
  }
});

// Text generation endpoint
app.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();

    return res.json({ generatedText });

  } catch (error) {
    console.error("Text Generation Error:", error);
    return res.status(500).json({ 
      error: "Text generation failed", 
      details: error.message 
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ 
    error: "Unexpected server error", 
    details: err.message 
  });
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});