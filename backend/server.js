require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const multer = require('multer');


const app = express();
const port = process.env.PORT || 1000;

const apiKey = process.env.GOOGLE_API_KEY;

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(cors({
  origin: ['https://maxxxxxai.netlify.app', 'http://localhost:5173'],
}));

function getMimeType(dataUrl) {
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
  return matches && matches.length > 1 ? matches[1] : 'image/jpeg';
}

function processImageData(dataUrl) {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return {
    mimeType: getMimeType(dataUrl),
    data: base64Data
  };
}

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


app.post('/analyze-image', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: "Image data is required" });
    }

    
    const processedImage = processImageData(image);
    
   
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

  
    const imagePart = {
      inlineData: {
        data: processedImage.data,
        mimeType: processedImage.mimeType
      }
    };

    
    const prompt = "Please analyze this image and describe what you see in detail.";

    
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


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: "Something broke!", 
    details: err.message 
  });
});









//UI to Code from here this is specific code for UI to Code ok 






let genAI;
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error('Gemini AI Initialization Error:', error);
    process.exit(1);
  }


  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        cb(new Error('Only image files are allowed'));
        return;
      }
      cb(null, true);
    }
  });

  app.use(cors());
  app.use(express.json());

  async function preprocessImage(buffer) {
    try {
      if (!buffer || buffer.length === 0) {
        throw new Error('Invalid image buffer received');
      }

      const metadata = await sharp(buffer).metadata();
      const targetWidth = Math.min(2000, metadata.width || 2000);
      
      return await sharp(buffer)
        .resize(targetWidth, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .normalize()
        .sharpen()
        .toBuffer();
    } catch (error) {
      console.error('Image preprocessing error:', error);
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  async function performOCR(buffer) {
    try {
      const { data } = await Tesseract.recognize(
        buffer,
        'eng',
        {
          logger: m => console.log(m),
          tessedit_pageseg_mode: '1',
          tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?@#$%^&*()_+-=[]{}|;:<>/"\'\\s',
        }
      );

      if (!data || typeof data.text !== 'string') {
        throw new Error('Invalid OCR result');
      }

      return {
        text: data.text.trim(),
        confidence: data.confidence || 0
      };
    } catch (error) {
      console.error('OCR error:', error);
      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  async function analyzeText(text, confidence) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text input');
      }

      // Ensure genAI is defined before using it
      if (!genAI) {
        throw new Error('Gemini AI not initialized');
      }

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
        Analyze this text with low confidence OCR (${confidence}%):
        "${text}"

        Provide:
        1. A brief summary
        2. Key entities detected
        3. Potential insights or recommendations

        Return a JSON with these fields:
        {
          "summary": "...",
          "entities": ["..."],
          "suggestions": "..."
        }
      `;

      const result = await model.generateContent(prompt);
      
      const responseText = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Text analysis error:', {
        error: error.message,
        text: text.substring(0, 100) + '...'
      });
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  app.post('/analyze', upload.single('screenshot'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

  
      const processedBuffer = await preprocessImage(req.file.buffer);
      
    
      const { text, confidence } = await performOCR(processedBuffer);

    
      if (!text.trim()) {
        return res.status(422).json({
          error: 'No text could be extracted from the image'
        });
      }

      if (confidence < 30) {
        return res.status(422).json({
          error: 'Text recognition confidence too low'
        });
      }

    
      const analysis = await analyzeText(text, confidence);

    
      res.json({
        textContent: text,
        confidence,
        ...analysis
      });

    } catch (error) {
      console.error('Request error:', {
        message: error.message,
        stack: error.stack
      });

      res.status(500).json({ 
        error: error.message || 'Error processing screenshot'
      });
    }
  });




app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});