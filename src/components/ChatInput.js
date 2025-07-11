import React, { useState, useRef } from 'react';

const ChatInput = ({ onSendMessage, disabled, placeholder = "Ask me anything..." }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div style={{ 
      padding: '8px 10px', 
      borderTop: '1px solid #e1e8ed',
      backgroundColor: '#ffffff',
      flexShrink: 0
    }}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows="1"
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #e1e8ed',
              borderRadius: '16px',
              resize: 'none',
              fontSize: '13px',
              outline: 'none',
              fontFamily: 'inherit',
              backgroundColor: disabled ? '#f7f9fa' : '#ffffff',
              minHeight: '32px',
              maxHeight: '80px',
              lineHeight: '16px',
              userSelect: 'text',
              WebkitUserSelect: 'text'
            }}
          />
          <button 
            type="submit" 
            disabled={disabled || !message.trim()}
            style={{
              padding: '8px 14px',
              backgroundColor: disabled || !message.trim() ? '#e1e8ed' : '#1da1f2',
              color: disabled || !message.trim() ? '#657786' : 'white',
              border: 'none',
              borderRadius: '16px',
              cursor: disabled || !message.trim() ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              minWidth: '60px',
              height: '32px',
              lineHeight: '16px'
            }}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;
