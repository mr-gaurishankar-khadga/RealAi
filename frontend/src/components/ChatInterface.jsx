import React, { useState, useRef, useEffect } from 'react';
import { User, Bot, Copy, Check } from 'lucide-react';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input })
      });
      
      const data = await response.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.generatedText
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request.'
      }]);
    }
    setLoading(false);
  };

  const copyToClipboard = async (text, index) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const MessageContent = ({ content }) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.slice(3, -3);
        const language = code.split('\n')[0];
        const codeContent = code.split('\n').slice(1).join('\n');
        
        return (
          <div key={index} className="my-4 rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-200">
              <span className="text-sm">{language || 'code'}</span>
              <button
                onClick={() => copyToClipboard(codeContent, index)}
                className="text-gray-400 hover:text-white p-1 rounded"
              >
                {copiedIndex === index ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <pre className="p-4 bg-gray-900 overflow-x-auto">
              <code className="text-sm text-gray-100">{codeContent}</code>
            </pre>
          </div>
        );
      }
      return (
        <p key={index} className="mb-4 text-gray-700 dark:text-gray-300">
          {part}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-800">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-6 space-y-6">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex gap-4 p-6 ${
                message.role === 'assistant' 
                  ? 'bg-gray-50 dark:bg-gray-700/50' 
                  : 'bg-white dark:bg-gray-800'
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'assistant' 
                  ? 'bg-green-500' 
                  : 'bg-gray-800'
              }`}>
                {message.role === 'assistant' ? (
                  <Bot className="w-5 h-5 text-white" />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <MessageContent content={message.content} />
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4 p-6 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto p-6">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send a message..."
              rows="1"
              className="w-full p-4 pr-20 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{ minHeight: '60px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 bottom-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
            >
              <svg className="w-6 h-6 rotate-90" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;