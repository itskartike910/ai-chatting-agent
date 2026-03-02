import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';

const ChatInput = ({
  onSendMessage,
  onStopExecution,
  isExecuting,
  disabled,
  placeholder,
  value = '',
  onChange
}) => {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  // Use external value if provided, otherwise use internal state
  const currentValue = onChange ? value : message;
  const setValue = onChange ? onChange : setMessage;

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        if (final) {
          setValue(prev => (typeof prev === 'string' ? prev : '') + final);
          setInterimText('');
        } else {
          setInterimText(interim);
        }
      };

      recognition.onerror = (event) => {
        console.log('Speech recognition error:', event.error);
        setIsListening(false);
        setInterimText('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleListening = useCallback(async () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    setInterimText('');

    try {
      // Check current permission status first
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });

      if (permissionStatus.state === 'denied') {
        console.log('Microphone permission denied. Please enable in browser settings.');
        return;
      }

      // If permission not yet granted, open permission popup window
      if (permissionStatus.state !== 'granted') {
        console.log('Opening microphone permission popup...');

        if (window.chrome && window.chrome.runtime && window.chrome.runtime.getURL) {
          const permUrl = window.chrome.runtime.getURL('mic-permission.html');

          if (window.chrome.windows && window.chrome.windows.create) {
            // Open as popup window (nanobrowser pattern)
            window.chrome.windows.create(
              { url: permUrl, type: 'popup', width: 500, height: 500 },
              (createdWindow) => {
                if (createdWindow && createdWindow.id) {
                  // Listen for window close, then re-check permission
                  window.chrome.windows.onRemoved.addListener(function onWindowClose(windowId) {
                    if (windowId === createdWindow.id) {
                      window.chrome.windows.onRemoved.removeListener(onWindowClose);
                      // After window closes, retry if permission was granted
                      setTimeout(async () => {
                        try {
                          const newStatus = await navigator.permissions.query({ name: 'microphone' });
                          if (newStatus.state === 'granted') {
                            toggleListening();
                          }
                        } catch (err) {
                          console.log('Permission check after popup:', err);
                        }
                      }, 500);
                    }
                  });
                }
              }
            );
          } else {
            // Fallback: open in a tab
            window.open(permUrl, '_blank');
          }
        }
        return;
      }

      // Permission granted — start recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.log('Speech recognition error:', e);
    }
  }, [isListening]);

  // Auto-resize textarea without animation flash
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 120;
      const newHeight = Math.min(scrollHeight, maxHeight);
      textareaRef.current.style.height = newHeight + 'px';
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [currentValue, interimText]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentValue.trim() && !disabled && !isExecuting) {
      onSendMessage(currentValue.trim());
      setValue('');
    }
  };

  const handleStop = (e) => {
    e.preventDefault();
    if (onStopExecution && isExecuting) {
      onStopExecution();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && isExecuting) {
      e.preventDefault();
      handleStop(e);
    }
  };

  const hasSpeechSupport = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  return (
    <div className="chat-input-container" style={{
      padding: '8px 10px',
      borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
      background: 'linear-gradient(to top, var(--bg-primary, #0a0f1e), var(--bg-secondary, #111827))',
      flexShrink: 0
    }}>
      <form onSubmit={isExecuting ? handleStop : handleSubmit} style={{
        display: 'flex',
        alignItems: 'flex-end',
        position: 'relative'
      }}>
        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
          borderRadius: '24px',
          border: '1px solid var(--border-medium, rgba(255,255,255,0.12))',
          padding: '0',
          minHeight: '48px',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
        }}>
          <textarea
            ref={textareaRef}
            value={currentValue}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? '🎤 Listening...' : (interimText || placeholder)}
            disabled={disabled}
            className="chat-input"
            style={{
              width: '100%',
              minHeight: '20px',
              maxHeight: '120px',
              padding: hasSpeechSupport ? '12px 96px 12px 16px' : '12px 60px 12px 16px',
              border: 'none',
              borderRadius: '24px',
              resize: 'none',
              fontSize: '14px',
              lineHeight: '24px',
              fontFamily: 'inherit',
              outline: 'none',
              backgroundColor: 'transparent',
              color: disabled ? 'rgba(241,245,249,0.3)' : 'var(--text-primary, #f1f5f9)',
              boxSizing: 'border-box',
              overflow: 'auto',
              transition: 'none'
            }}
            rows={1}
          />

          {/* Interim text display */}
          {isListening && interimText && (
            <div style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(165, 180, 252, 0.6)',
              fontSize: '14px',
              pointerEvents: 'none',
              fontStyle: 'italic',
              maxWidth: 'calc(100% - 100px)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {interimText}
            </div>
          )}

          {/* Button group: Mic + Send/Stop */}
          <div style={{
            position: 'absolute',
            right: '6px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {/* Mic Button */}
            {hasSpeechSupport && !isExecuting && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={disabled}
                className={isListening ? 'mic-listening' : ''}
                style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: isListening ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                  color: isListening ? '#ef4444' : 'rgba(241,245,249,0.4)',
                  border: isListening ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
                  borderRadius: '50%',
                  cursor: disabled ? 'default' : 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  opacity: disabled ? 0.3 : 1
                }}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                {isListening ? <FaMicrophoneSlash /> : <FaMicrophone />}
              </button>
            )}

            {/* Send/Stop Button */}
            {isExecuting ? (
              <button
                type="button"
                onClick={handleStop}
                className="chat-stop-button"
                style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: '#e0245e',
                  color: 'white',
                  border: '1px solid #F00000FF',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '24px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(224, 36, 94, 0.3)',
                  paddingBottom: '6px',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                title="Stop Execution"
              >
                ■
              </button>
            ) : (
              <button
                type="submit"
                disabled={!currentValue.trim() || disabled}
                className="chat-send-button"
                style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: (!currentValue.trim() || disabled) ? 'rgba(255,255,255,0.08)' : 'var(--accent-primary, #6366f1)',
                  color: 'white',
                  border: (!currentValue.trim() || disabled) ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(99,102,241,0.5)',
                  borderRadius: '50%',
                  cursor: (!currentValue.trim() || disabled) ? 'default' : 'pointer',
                  fontSize: '22px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: (!currentValue.trim() || disabled) ? 'none' : '0 2px 12px rgba(99, 102, 241, 0.4)',
                  transition: 'all 0.2s ease',
                  paddingBottom: '2px',
                  paddingRight: '4px',
                  flexShrink: 0
                }}
                title="Send Message"
              >
                ➤
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Mic listening animation styles */}
      <style>{`
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        }
        .mic-listening {
          animation: micPulse 1.5s ease-in-out infinite !important;
        }
      `}</style>
    </div>
  );
};

export default ChatInput;
