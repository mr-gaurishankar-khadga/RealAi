import React, { useState, useRef } from 'react';


import { Camera } from 'lucide-react';
import Tesseract from 'tesseract.js';
import './App.css';

const ImageCapture = ({ onImageCaptured, onTextExtracted }) => {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
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

  const extractTextFromImage = async (imageDataUrl) => {
    setIsProcessing(true);
    try {
      const result = await Tesseract.recognize(
        imageDataUrl,
        'eng',
        { logger: m => console.log(m) }
      );
      
      if (onTextExtracted) {
        onTextExtracted(result.data.text);
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      alert('Failed to extract text from image');
    } finally {
      setIsProcessing(false);
    }
  };

  const capturePhoto = async () => {
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

    // Process image for both OCR and analysis
    await extractTextFromImage(imageDataUrl);
    if (onImageCaptured) {
      onImageCaptured(imageDataUrl);
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
      {
       showCamera && (
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
          maxWidth: '500px',
          // marginLeft:'-150px'
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
            justifyContent: 'space-around',
            marginTop: '10px'
          }}>
            <button 
              onClick={capturePhoto}
              disabled={isProcessing}
              style={{
                padding: '8px 16px',
                backgroundColor: isProcessing ? '#888' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isProcessing ? 'not-allowed' : 'pointer'
              }}
            >
              {isProcessing ? 'Processing...' : 'Capture'}
            </button>
            <button 
              onClick={cancelCapture}
              disabled={isProcessing}
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
          </div>
          {isProcessing && (
            <div style={{
              textAlign: 'center',
              marginTop: '10px',
              color: 'white'
            }}>
              Extracting text from image...
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={startCamera}
        disabled={isProcessing}
        style={{
          
          border: 'none',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          marginRight: '5px',
          color: '#ffffff',
          padding: '8px',
          outline:'none',
          background:'none'
        }}
      >
        <Camera size={30} style={{marginLeft:'-330px',backgroundColor: '',color:'black'}}/>
      </button>
    </>
  );
};


export default ImageCapture;