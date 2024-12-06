require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 1000;

const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Increase payload size limit for images
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(cors({
  origin: ['https://maxxxxxai.netlify.app', 'http://localhost:5173'],
}));

// Function to extract mime type from data URL
function getMimeType(dataUrl) {
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
  return matches && matches.length > 1 ? matches[1] : 'image/jpeg';
}

// Function to process image data URL
function processImageData(dataUrl) {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return {
    mimeType: getMimeType(dataUrl),
    data: base64Data
  };
}

// Text generation endpoint
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

// Image analysis endpoint
app.post('/analyze-image', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: "Image data is required" });
    }

    // Process the image data
    const processedImage = processImageData(image);
    
    // Initialize the vision model
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    // Prepare the image part
    const imagePart = {
      inlineData: {
        data: processedImage.data,
        mimeType: processedImage.mimeType
      }
    };

    // Prepare the prompt
    const prompt = "Please analyze this image and describe what you see in detail.";

    // Generate content
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const analysis = response.text();

    return res.json({ analysis });
  } catch (error) {
    console.error("Error analyzing image:", error.message);
    return res.status(500).json({ 
      error: "Failed to analyze image", 
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: "Something broke!", 
    details: err.message 
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});