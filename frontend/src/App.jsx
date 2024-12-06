import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { IoSendSharp } from "react-icons/io5";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { Camera } from 'lucide-react';
import './App.css';

const ImageCapture = ({ onImageCaptured, onImageQuestion }) => {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [imageQuestion, setImageQuestion] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  const startCamera = async () => {
    try {
      const constraints = {
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment' 
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setShowCamera(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/jpeg');
    
    setCapturedImage(imageDataUrl);

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    setShowCamera(false);
  };

  const handleImageAnalysis = () => {
    if (capturedImage) {
      if (onImageCaptured) {
        onImageCaptured(capturedImage);
      }
      if (onImageQuestion && imageQuestion) {
        onImageQuestion(capturedImage, imageQuestion);
      }
      // Reset states
      setCapturedImage(null);
      setImageQuestion('');
    }
  };

  const cancelCapture = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    setShowCamera(false);
    setCapturedImage(null);
  };

  return (
    <>
      {showCamera && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001,
          backgroundColor: '#000',
          padding: '20px',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '500px'
        }}>
          <video
            ref={videoRef}
            style={{
              width: '100%',
              maxHeight: '70vh',
              borderRadius: '4px',
              objectFit: 'contain'
            }}
            playsInline
            autoPlay
          />
          <canvas 
            ref={canvasRef} 
            style={{ display: 'none' }} 
          />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: '10px'
          }}>
            <input 
              type="text"
              placeholder="Optional: Ask about the image"
              value={imageQuestion}
              onChange={(e) => setImageQuestion(e.target.value)}
              style={{
                width: '100%',
                marginBottom: '10px',
                padding: '8px',
                borderRadius: '4px'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              width: '100%'
            }}>
              <button 
                onClick={capturePhoto}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Capture
              </button>
              <button 
                onClick={cancelCapture}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              {capturedImage && (
                <button 
                  onClick={handleImageAnalysis}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Analyze
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={startCamera}
        style={{
          backgroundColor: '#2d2d2d',
          border: 'none',
          cursor: 'pointer',
          marginRight: '5px',
          color: '#ffffff',
          padding: '8px'
        }}
      >
        <Camera size={24} />
      </button>
    </>
  );
};

const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const [animationDuration, setAnimationDuration] = useState(3);
  const lastTypedTime = useRef(Date.now());

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleImageAnalysis = async (photo, question = '') => {
    setIsLoading(true);
    try {
      const response = await axios.post('https://realai-tt.onrender.com/analyze-image', {
        image: photo,
        question: question || 'Describe what you see in this image in detail.'
      });

      const botMessage = {
        type: 'bot',
        content: response.data.analysis || 'I could not analyze the image.'
      };

      setMessages(prev => [...prev, {
        type: 'user',
        content: `[Image Analysis${question ? `: ${question}` : ''}]`
      }, botMessage]);
    } catch (error) {
      console.error('Error analyzing image:', error);
      const errorMessage = {
        type: 'bot',
        content: 'Sorry, I could not analyze the image. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
    setIsLoading(false);
  };

  const handleInputChange = () => {
    const currentTime = Date.now();
    const typingInterval = currentTime - lastTypedTime.current;
    const newDuration = Math.max(0.5, Math.min(5, typingInterval / 100));
    setAnimationDuration(newDuration);
    lastTypedTime.current = currentTime;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsListening(!isListening);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      type: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('https://realai-tt.onrender.com/generate', {
        prompt: input
      });

      const botMessage = {
        type: 'bot',
        content: response.data.generatedText
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        type: 'bot',
        content: 'Sorry, I could not generate a response.'
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  // ... rest of the code remains the same as in the original file (CodeBlock, Message components, etc.)

  return (
    <div className="app">
      <header 
        className="header" 
        style={{
          position: 'fixed', 
          backgroundColor: 'rgb(30,33,35)', 
          width: '100%', 
          top: '3.5%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          zIndex: 1000,
          padding: '20px',
          fontSize: '2rem',
        }}
      >
        <h1>gshankar ai</h1>
      </header>

      <main className="main" style={{margin:'0'}}>
        <div className="chat-container">
          {messages.map((message, index) => (
            <Message key={index} message={message} />
          ))}
          {isLoading && (
            <div className="message bot-message">
              <div className="avatar">🤖</div>
              <div className="loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <form onSubmit={handleSubmit} className="input-form">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What You Want to Search"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          rows={1}
          onInput={handleInputChange}
          style={{
            animationDuration: `${animationDuration}s`,
          }}
          className="message-input"
        />

        <ImageCapture 
          onImageCaptured={handleImageAnalysis} 
          onImageQuestion={handleImageAnalysis}
        />

        <button
          type="button"
          onClick={toggleListening}
          className="voice-button"
          style={{
            backgroundColor: '#1c1e25',
            border: 'none',
            cursor: 'pointer',
            marginRight: '5px',
            color: isListening ? '#ff4444' : '#ffffff',
            backgroundColor:'#2d2d2d'
          }}
        >
          {isListening ? <FaMicrophoneSlash size={24} /> : <FaMicrophone size={24} />}
        </button>

        <button 
          type="submit" 
          disabled={isLoading || !input.trim()}
          className="send-button"
        >
          <IoSendSharp className='sendicon'/>
        </button>
      </form>
    </div>
  );
};

export default App;