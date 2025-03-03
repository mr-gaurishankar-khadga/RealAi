import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { IoSendSharp } from "react-icons/io5";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { Camera } from 'lucide-react';
import Tesseract from 'tesseract.js';
import ImageCapture from './ImageCapture';
import './App.css';
import ImageRecognization from './ImageRecognization';
import Analyser from './Analyser';




<ImageCapture/>




const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const [animationDuration, setAnimationDuration] = useState(3);
  const lastTypedTime = useRef(Date.now());



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







  

  const handleImageCapture = async (imageDataUrl) => {
    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/analyze-image', {
        image: imageDataUrl
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        maxBodyLength: Infinity,
      });
  
      if (response.data.analysis) {
        const botMessage = {
          type: 'bot',
          content: response.data.analysis
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error('No analysis received from the server');
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      const errorMessage = {
        type: 'bot',
        content: ' your image is selected '
      };
      setMessages(prev => [...prev, errorMessage]);
    }
    setIsLoading(false);
  };

  const handleTextExtracted = (text) => {
    setInput(text.trim());
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
      const response = await axios.post('http://localhost:8000/generate', {
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
        content: 'Sorry...'
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

















  const CodeBlock = ({ language, value }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="code-block">
        <div className="code-header">
          <span className="language">{language}</span>
          <button onClick={handleCopy} className="copy-button">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <SyntaxHighlighter 
          language={language} 
          style={atomDark}
          customStyle={{
            margin: 0,
            borderRadius: '0 0 4px 4px',
            padding: '1rem'
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    );
  };


















  const Message = ({ message }) => {
    const components = {
      code({ node, inline, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        return !inline && match ? (
          <CodeBlock
            language={match[1]}
            value={String(children).replace(/\n$/, '')}
          />
        ) : (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }
    };

    return (
      <div className={`message ${message.type}-message`}>
        <div className="avatar">
          {message.type === 'user' ? '👤' : 'X'}
        </div>
        <div className="message-content">
          <ReactMarkdown components={components}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    );
  };




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
              <div className="avatar">X</div>
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
          placeholder="Search..."
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

        <ImageCapture onImageCaptured={handleImageCapture} onTextExtracted={handleTextExtracted} />







        

      








        <button
          type="button"
          onClick={toggleListening}
          className="voice-button"
          style={{
            border: 'none',
            cursor: 'pointer',
            marginRight: '-5px',
            color: isListening ? '#ff4444' : '#ffffff',
            backgroundColor:'none',
            marginLeft:'-159px',
            background:'transparent',
            outline:'none'
            
          }}
        >
          
          {isListening ? <FaMicrophoneSlash size={24} /> : <FaMicrophone size={24} color='black'/>}
        </button>

        <button 
          type="submit" 
          disabled={isLoading || !input.trim()}
          className="send-button"
          style={{background:'',outline:'none',borderRadius:'120px',borderTopLeftRadius:'20px',borderBottomLeftRadius:'20px'}}
        >
          <IoSendSharp className='sendicon' style={{marginTop:'-2px',color:'black'}}/>
        </button>
      </form>
      {/* <Analyser/> */}
    </div>
  );
};

export default App;