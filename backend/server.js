
require('dotenv').config();
const express = require('express');
const cors = require('cors'); 
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

const port = process.env.PORT || 1000;


const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

app.use(bodyParser.json());

app.use(cors({
  origin: ['https://mrxai.netlify.app', 'http://localhost:5173'], 
}));


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

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
