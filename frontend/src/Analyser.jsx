import React, { useState, useCallback } from 'react';
import axios from 'axios';
import './Analyser.css';

const Analyser = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const validateFile = (file) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
    }
    
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size too large. Please upload an image under 10MB.');
    }
  };

  
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      validateFile(file);
      
      setSelectedFile(file);
      setError(null);
      
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.onerror = () => setError('Error reading file');
      reader.readAsDataURL(file);
    } catch (error) {
      setError(error.message);
      setSelectedFile(null);
      setPreview('');
    }
  }, []);

 
  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setAnalysis(null);

    const formData = new FormData();
    formData.append('screenshot', selectedFile);

    try {
      const response = await axios.post('http://localhost:5000/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000 
      });
      
      setAnalysis(response.data);
    } catch (error) {
      console.error('Upload error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      let errorMessage = 'Error analyzing screenshot. Please try again.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.response?.status === 422) {
        errorMessage = error.response.data.error || 'Could not process the image. Please try a different screenshot.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setPreview('');
    setAnalysis(null);
    setError(null);
  }, []);

  return (
    <div className="container">
      <div className="card">
        <h1>Enhanced Screenshot Analyzer</h1>
        
        <div className="upload-section">
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="file-input"
          />
          
          <div className="button-group">
            <button 
              onClick={handleUpload}
              disabled={!selectedFile || loading}
              className="analyze-button"
            >
              {loading ? 'Analyzing...' : 'Analyze Screenshot'}
            </button>
            
            <button
              onClick={handleReset}
              disabled={loading}
              className="reset-button"
            >
              Reset
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {preview && (
          <div className="preview-section">
            <h3>Preview:</h3>
            <img 
              src={preview} 
              alt="Screenshot preview" 
              className="preview-image"
            />
          </div>
        )}

        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Processing your screenshot...</p>
          </div>
        )}

        {analysis && (
          <div className="analysis-section">
            <h3>Analysis Results:</h3>
            
            {analysis.textContent && (
              <div className="analysis-block">
                <h4>Extracted Text:</h4>
                <pre className="text-content">{analysis.textContent}</pre>
                <div className="confidence">
                  Confidence: {analysis.confidence.toFixed(1)}%
                </div>
              </div>
            )}

            {analysis.summary && (
              <div className="analysis-block">
                <h4>Summary:</h4>
                <div className="summary-content">{analysis.summary}</div>
              </div>
            )}

            {analysis.entities && analysis.entities.length > 0 && (
              <div className="analysis-block">
                <h4>Key Elements Detected:</h4>
                <ul className="entities-list">
                  {analysis.entities.map((entity, index) => (
                    <li key={index}>{entity}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.suggestions && (
              <div className="analysis-block">
                <h4>Context & Suggestions:</h4>
                <div className="suggestions-content">{analysis.suggestions}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analyser;