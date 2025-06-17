import React, { useState, useEffect, useRef } from 'react';

const VoiceInput = ({ onResult, onCancel }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError('');
        
        // Auto-stop after 30 seconds
        timeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 30000);
      };

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setTranscript(transcript);

        if (event.results[current].isFinal) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          onResult(transcript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };

      // Start recognition
      try {
        recognitionRef.current.start();
      } catch (err) {
        setError('Failed to start voice recognition');
        console.error('Failed to start recognition:', err);
      }
    } else {
      setError('Speech recognition not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onResult]);

  const handleStop = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onCancel();
  };

  const handleUseTranscript = () => {
    if (transcript.trim()) {
      onResult(transcript.trim());
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      backgroundColor: '#f7f9fa',
      borderRadius: '12px',
      border: '2px dashed #1da1f2',
      margin: '8px'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>
        {isListening ? '🎤' : error ? '❌' : '🔇'}
      </div>
      
      <h4 style={{ margin: '0 0 8px 0', color: '#14171a' }}>
        {isListening ? 'Listening...' : error ? 'Error' : 'Voice Input'}
      </h4>
      
      {error && (
        <div style={{ 
          color: '#e0245e', 
          fontSize: '14px',
          marginBottom: '12px',
          padding: '8px',
          backgroundColor: '#ffeaea',
          borderRadius: '6px'
        }}>
          {error}
        </div>
      )}
      
      {transcript && (
        <div style={{ 
          margin: '12px 0', 
          padding: '12px', 
          backgroundColor: '#ffffff', 
          borderRadius: '8px',
          border: '1px solid #e1e8ed',
          fontStyle: 'italic',
          color: '#14171a',
          fontSize: '14px',
          textAlign: 'left'
        }}>
          <strong>Transcript:</strong><br />
          "{transcript}"
        </div>
      )}
      
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        justifyContent: 'center',
        marginTop: '16px'
      }}>
        {transcript && !isListening && (
          <button 
            onClick={handleUseTranscript}
            style={{
              padding: '8px 16px',
              backgroundColor: '#17bf63',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Use Text
          </button>
        )}
        
        <button 
          onClick={handleStop}
          style={{
            padding: '8px 16px',
            backgroundColor: '#e0245e',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {isListening ? 'Stop' : 'Cancel'}
        </button>
      </div>
      
      {isListening && (
        <div style={{ 
          fontSize: '12px', 
          color: '#657786', 
          marginTop: '8px' 
        }}>
          Speak clearly. Will auto-stop in 30 seconds.
        </div>
      )}
    </div>
  );
};

export default VoiceInput;