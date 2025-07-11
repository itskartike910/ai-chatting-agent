import React, { useEffect, useRef } from 'react';

const MessageList = ({ messages }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getMessageStyle = (type) => {
    const baseStyle = {
      margin: '4px 8px',
      padding: '8px 12px',
      borderRadius: '14px',
      maxWidth: '82%',
      wordWrap: 'break-word',
      fontSize: '13px',
      lineHeight: '1.3'
    };

    switch (type) {
      case 'user':
        return {
          ...baseStyle,
          backgroundColor: '#1da1f2',
          color: 'white',
          alignSelf: 'flex-end',
          marginLeft: 'auto',
          borderBottomRightRadius: '4px'
        };
      case 'assistant':
        return {
          ...baseStyle,
          backgroundColor: '#f7f9fa',
          color: '#14171a',
          alignSelf: 'flex-start',
          border: '1px solid #e1e8ed',
          borderBottomLeftRadius: '4px'
        };
      case 'system':
        return {
          ...baseStyle,
          backgroundColor: '#fff3cd',
          color: '#856404',
          alignSelf: 'center',
          fontSize: '11px',
          fontStyle: 'italic',
          border: '1px solid #ffeaa7',
          textAlign: 'center',
          maxWidth: '88%',
          margin: '2px 8px'
        };
      case 'error':
        return {
          ...baseStyle,
          backgroundColor: '#f8d7da',
          color: '#721c24',
          alignSelf: 'center',
          border: '1px solid #f5c6cb',
          textAlign: 'center',
          maxWidth: '88%',
          fontSize: '11px',
          margin: '2px 8px'
        };
      default:
        return baseStyle;
    }
  };

  const WelcomeMessage = () => (
    <div style={{ 
      textAlign: 'center', 
      color: '#657786', 
      marginTop: '20px',
      padding: '0 16px'
    }}>
      <div style={{ fontSize: '36px', marginBottom: '12px' }}>🤖</div>
      <h4 style={{ color: '#1da1f2', marginBottom: '8px', fontSize: '15px' }}>Welcome to AI Social Agent!</h4>
      <p style={{ marginBottom: '12px', fontSize: '12px' }}>Ask me to help you with tasks:</p>
      <div style={{ 
        textAlign: 'left', 
        maxWidth: '280px', 
        margin: '0 auto',
        backgroundColor: '#f7f9fa',
        padding: '12px',
        borderRadius: '10px',
        border: '1px solid #e1e8ed'
      }}>
        <div style={{ marginBottom: '6px', fontSize: '11px' }}>
          <strong>• YouTube:</strong> "Search for videos and play"
        </div>
        <div style={{ marginBottom: '6px', fontSize: '11px' }}>
          <strong>• Social:</strong> "Post content on Twitter"
        </div>
        <div style={{ marginBottom: '6px', fontSize: '11px' }}>
          <strong>• Shopping:</strong> "Find products online"
        </div>
        <div style={{ fontSize: '11px' }}>
          <strong>• Any site:</strong> "Help me navigate this page"
        </div>
      </div>
      <p style={{ 
        fontSize: '10px', 
        color: '#657786', 
        marginTop: '12px',
        fontStyle: 'italic'
      }}>
        Configure your API keys in Settings ⚙️ to get started
      </p>
    </div>
  );

  return (
    <div style={{ 
      flex: 1, 
      overflowY: 'auto', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      WebkitOverflowScrolling: 'touch',
      scrollBehavior: 'smooth'
    }}>
      {messages.length === 0 && <WelcomeMessage />}
      
      {messages.map((message, index) => (
        <div key={index} style={getMessageStyle(message.type)}>
          <div>{message.content}</div>
          {message.actions && message.actions.length > 0 && (
            <div style={{ 
              marginTop: '6px', 
              fontSize: '10px', 
              opacity: 0.9,
              borderTop: '1px solid rgba(0,0,0,0.1)',
              paddingTop: '4px'
            }}>
              <strong>Actions:</strong>
              <div style={{ marginTop: '2px' }}>
                {message.actions.map((action, i) => (
                  <div key={i} style={{ 
                    margin: '1px 0',
                    padding: '2px 6px',
                    backgroundColor: action.success ? '#d4edda' : '#f8d7da',
                    borderRadius: '6px',
                    fontSize: '9px'
                  }}>
                    {action.success ? '✅' : '❌'} {action.message || action.description}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ 
            fontSize: '9px', 
            opacity: 0.6, 
            marginTop: '2px',
            textAlign: message.type === 'user' ? 'right' : 'left'
          }}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;