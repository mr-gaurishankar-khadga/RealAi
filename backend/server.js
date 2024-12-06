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

// Helper function to convert base64 to Uint8Array
function base64ToUint8Array(base64String) {
  const base64WithoutPrefix = base64String.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(base64WithoutPrefix);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Text-only generation endpoint
app.post('/generate', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);

    if (result && result.response && typeof result.response.text === 'function') {
      const generatedText = await result.response.text();
      return res.json({ generatedText });
    } else {
      return res.status(500).json({ error: "Failed to generate content" });
    }
  } catch (error) {
    console.error("Error generating content:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Image analysis endpoint
app.post('/analyze-image', async (req, res) => {
  const { image, prompt = "Analyze this image and describe what you see in detail." } = req.body;

  if (!image) {
    return res.status(400).json({ error: "Image data is required" });
  }

  try {
    // Convert base64 image to Uint8Array
    const imageData = base64ToUint8Array(image);

    // Get the vision model
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    // Prepare the image parts
    const imageParts = [
      {
        inlineData: {
          data: Buffer.from(imageData).toString('base64'),
          mimeType: "image/jpeg"
        }
      }
    ];

    // Generate content with the image
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const analysis = response.text();

    return res.json({ analysis });
  } catch (error) {
    console.error("Error analyzing image:", error);
    return res.status(500).json({ error: "Failed to analyze image" });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});