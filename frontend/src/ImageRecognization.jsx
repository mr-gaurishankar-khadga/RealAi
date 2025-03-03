import React, { useState, useRef, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

const OBJECT_RELATIONSHIPS = {
  spatial: ['above', 'below', 'next to', 'in front of', 'behind', 'on top of'],
  actions: {
    'person': ['standing', 'sitting', 'walking', 'running', 'holding'],
    'animal': ['standing', 'sitting', 'running', 'eating', 'looking'],
    'vehicle': ['parked', 'moving', 'stopped']
  },
  attributes: {
    'general': ['large', 'small', 'colorful', 'dark', 'bright'],
    'count': ['single', 'pair', 'group', 'multiple']
  }
};

const ImageRecognization = () => {
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState(null);
  const [imageURL, setImageURL] = useState(null);
  const [detections, setDetections] = useState([]);
  const [imageDescription, setImageDescription] = useState('');
  const [error, setError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.setBackend('webgl');
        const loadedModel = await cocoSsd.load({
          base: 'mobilenet_v2'
        });
        setModel(loadedModel);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load model:', err);
        setError('Failed to initialize image analysis. Please try again.');
        setLoading(false);
      }
    };

    loadModel();
  }, []);

  const generateDescription = (predictions) => {
    if (!predictions.length) return 'No clear objects detected in this image.';

    // Group similar objects
    const objectGroups = predictions.reduce((acc, pred) => {
      const key = pred.class;
      if (!acc[key]) acc[key] = [];
      acc[key].push(pred);
      return acc;
    }, {});

    // Generate natural language description
    let description = "In this image, I can see ";
    const descriptions = [];

    Object.entries(objectGroups).forEach(([className, instances]) => {
      const count = instances.length;
      const confidence = Math.round(instances[0].confidence);
      
      // Add count and confidence
      let objectDesc = `${count === 1 ? 'a' : count} ${className}${count > 1 ? 's' : ''}`;
      if (confidence > 90) {
        objectDesc += ` (I'm very confident about this)`;
      } else if (confidence > 75) {
        objectDesc += ` (I'm fairly confident about this)`;
      } else {
        objectDesc += ` (I'm somewhat uncertain about this)`;
      }

      // Add spatial relationships if multiple objects exist
      if (predictions.length > 1) {
        const spatialRel = OBJECT_RELATIONSHIPS.spatial[
          Math.floor(Math.random() * OBJECT_RELATIONSHIPS.spatial.length)
        ];
        const otherClass = Object.keys(objectGroups).find(k => k !== className);
        if (otherClass) {
          objectDesc += ` ${spatialRel} the ${otherClass}`;
        }
      }

      // Add relevant actions for certain categories
      if (OBJECT_RELATIONSHIPS.actions[className]) {
        const possibleActions = OBJECT_RELATIONSHIPS.actions[className];
        const action = possibleActions[Math.floor(Math.random() * possibleActions.length)];
        objectDesc += ` that appears to be ${action}`;
      }

      descriptions.push(objectDesc);
    });

    // Combine descriptions
    description += descriptions.join(', and ') + '.';

    // Add overall scene context
    if (predictions.length > 2) {
      description += ' The scene appears to be ' + 
        (predictions.some(p => p.class === 'person') ? 'populated with activity' : 'quite static') + '.';
    }

    return description;
  };

  const detectObjects = async () => {
    if (!model || !imageRef.current) return;

    setAnalyzing(true);
    try {
      const predictions = await model.detect(imageRef.current, 20, 0.4);
      
      const refinedPredictions = predictions
        .filter(prediction => prediction && prediction.bbox && prediction.bbox.length === 4)
        .map(detection => ({
          class: detection.class,
          confidence: (detection.score * 100).toFixed(1),
          bbox: detection.bbox
        }))
        .sort((a, b) => parseFloat(b.confidence) - parseFloat(a.confidence));

      // Generate natural language description
      const description = generateDescription(refinedPredictions);
      setImageDescription(description);

      if (canvasRef.current && imageRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        const canvas = canvasRef.current;
        
        canvas.width = imageRef.current.naturalWidth;
        canvas.height = imageRef.current.naturalHeight;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

        refinedPredictions.forEach(prediction => {
          if (prediction.bbox) {
            ctx.beginPath();
            ctx.rect(
              prediction.bbox[0], 
              prediction.bbox[1], 
              prediction.bbox[2], 
              prediction.bbox[3]
            );
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#2563eb';
            ctx.stroke();

            ctx.font = 'bold 16px Inter';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 4;
            
            const label = `${prediction.class} (${prediction.confidence}%)`;
            const textX = prediction.bbox[0];
            const textY = prediction.bbox[1] - 10;

            ctx.strokeText(label, textX, textY);
            ctx.fillText(label, textX, textY);
          }
        });
      }

      setDetections(refinedPredictions);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Image analysis failed. Please try a different image.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setDetections([]);
    setImageDescription('');
    setError(null);

    if (file.size > 20 * 1024 * 1024) {
      setError('Image size should be less than 20MB');
      return;
    }

    try {
      const url = URL.createObjectURL(file);
      setImageURL(url);

      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          imageRef.current.src = url;
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });

      setTimeout(detectObjects, 300);
    } catch (err) {
      console.error('Image load error:', err);
      setError('Failed to process image. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p>Loading object detection model...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50">
      <div className="mb-6 text-center">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="p-3 border-2 border-dashed border-blue-400 rounded-lg w-full max-w-md bg-white"
        />
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-center">
          {error}
        </div>
      )}

      <div className="mb-6 text-center relative">
        {imageURL && (
          <>
            <img
              ref={imageRef}
              src={imageURL}
              alt="Uploaded"
              style={{ display: 'none' }}
            />
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[600px] mx-auto object-contain border rounded-lg shadow-md"
            />
          </>
        )}
      </div>

      {analyzing && (
        <div className="text-center text-blue-600 mb-4">
          Analyzing image...
        </div>
      )}

     

      {detections.length > 0 && (
        <div className="text-center">
          <div className="flex flex-wrap justify-center gap-3">
            {detections.map((detection, index) => (
              <div 
                key={index} 
                className="bg-white p-4 rounded-lg shadow-sm"
              >
                <div className="font-medium capitalize">
                  Result :- {detection.class} ({detection.confidence}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {imageURL && detections.length === 0 && !error && !analyzing && (
        <div className="text-center text-gray-600 p-4 bg-white rounded-lg">
          No objects detected clearly in this image
        </div>
      )}
    </div>
  );
};

export default ImageRecognization;