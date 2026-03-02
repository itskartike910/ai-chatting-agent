import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MessageList = ({ messages, onTemplateClick, onResumeExecution, onApproveTask, onDeclineTask, isTyping, updateMessageState }) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [animatedMessages, setAnimatedMessages] = useState(new Set());
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const prevMessageCountRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  };

  const handleApprove = (messageId) => {
    console.log('✅ Approve clicked for message:', messageId);
    // Update message state in storage immediately
    updateMessageState?.(messageId, { approved: true, declined: false });
    onApproveTask?.();
  };

  const handleDecline = (messageId) => {
    console.log('❌ Decline clicked for message:', messageId);
    // Update message state in storage immediately
    updateMessageState?.(messageId, { approved: false, declined: true });
    onDeclineTask?.();
  };

  const handleResume = (messageId) => {
    // Update message state in storage
    updateMessageState?.(messageId, { resumed: true });
    onResumeExecution?.();
  };

  useEffect(() => {
    if (messages.length === 0 && !isTyping) {
      scrollToTop();
    } else {
      scrollToBottom();
    }
  }, [messages, isTyping]);

  // Track new messages for animation
  useEffect(() => {
    if (isInitialLoad && messages.length > 0) {
      // On initial load, mark all existing messages as animated
      const initialMessageIds = new Set(messages.map((msg, index) => msg.id || `msg-${index}`));
      setAnimatedMessages(initialMessageIds);
      setIsInitialLoad(false);
      prevMessageCountRef.current = messages.length;
    } else if (!isInitialLoad && messages.length > prevMessageCountRef.current) {
      // For subsequent messages, animate only the newest ones
      const newMessageIds = new Set();

      messages.forEach((msg, index) => {
        const messageId = msg.id || `msg-${index}`;
        if (!animatedMessages.has(messageId)) {
          newMessageIds.add(messageId);
        }
      });

      if (newMessageIds.size > 0) {
        setAnimatedMessages(prev => new Set([...prev, ...newMessageIds]));
      }

      prevMessageCountRef.current = messages.length;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isInitialLoad]);

  const getTypingIndicatorStyle = () => {
    return {
      margin: '4px 8px',
      padding: '8px 12px',
      borderRadius: '14px',
      maxWidth: '82%',
      wordWrap: 'break-word',
      fontSize: '13px',
      fontWeight: '600',
      lineHeight: '1.3',
      transition: 'all 0.3s ease',
      opacity: 1,
      transform: 'translateY(0)',
      backgroundColor: 'transparent !important',
      color: '#14171a',
      alignSelf: 'flex-start',
      border: 'none !important',
      textAlign: 'left',
      boxShadow: 'none !important',
      animation: 'slideInFromLeft 0.3s ease-out',
      position: 'relative',
      zIndex: 1
    };
  };

  const getMessageStyle = (type, messageId) => {
    const isNewMessage = !animatedMessages.has(messageId);
    const baseStyle = {
      margin: '4px 8px',
      padding: '10px 14px',
      borderRadius: '16px',
      maxWidth: '85%',
      wordWrap: 'break-word',
      fontSize: '13px',
      fontWeight: '400',
      lineHeight: '1.5',
      transition: 'all 0.3s ease',
      opacity: 1,
      transform: 'translateY(0)'
    };

    const animClass = (dir) => isNewMessage && !isInitialLoad ? `slideIn${dir} 0.3s ease-out` : undefined;

    switch (type) {
      case 'user':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, var(--accent-primary, #6366f1), #7c3aed)',
          color: 'white',
          alignSelf: 'flex-end',
          marginLeft: 'auto',
          borderBottomRightRadius: '4px',
          boxShadow: '0 2px 12px rgba(99,102,241,0.3)',
          fontWeight: '500',
          animation: animClass('FromRight')
        };
      case 'assistant':
        return {
          ...baseStyle,
          backgroundColor: '#1e2537',
          color: 'var(--text-primary, #e2e8f0)',
          alignSelf: 'flex-start',
          border: '1px solid rgba(99, 102, 241, 0.12)',
          borderBottomLeftRadius: '4px',
          textAlign: 'left',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          animation: animClass('FromLeft')
        };
      case 'system':
        return {
          ...baseStyle,
          backgroundColor: '#1a1f35',
          color: '#a5b4fc',
          alignSelf: 'flex-start',
          fontSize: '11px',
          fontStyle: 'normal',
          fontWeight: '500',
          border: '1px solid rgba(99, 102, 241, 0.18)',
          textAlign: 'left',
          maxWidth: '85%',
          margin: '3px 8px',
          borderRadius: '12px',
          borderBottomLeftRadius: '4px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          animation: animClass('FromLeft')
        };
      case 'error':
        return {
          ...baseStyle,
          backgroundColor: '#2a1520',
          color: '#fca5a5',
          alignSelf: 'flex-start',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          textAlign: 'left',
          maxWidth: '85%',
          fontSize: '12px',
          margin: '3px 8px',
          borderRadius: '12px',
          borderBottomLeftRadius: '4px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          animation: animClass('FromLeft')
        };
      case 'pause':
        return {
          ...baseStyle,
          backgroundColor: '#2a2415',
          color: '#fbbf24',
          alignSelf: 'flex-start',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          textAlign: 'left',
          maxWidth: '85%',
          fontSize: '12px',
          margin: '4px 8px',
          borderRadius: '12px',
          borderBottomLeftRadius: '4px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          animation: animClass('FromLeft')
        };
      case 'approval':
        return {
          ...baseStyle,
          backgroundColor: '#1a2035',
          color: '#93c5fd',
          alignSelf: 'flex-start',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          textAlign: 'left',
          maxWidth: '85%',
          fontSize: '12px',
          margin: '4px 8px',
          borderRadius: '12px',
          borderBottomLeftRadius: '4px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          animation: animClass('FromLeft')
        };
      default:
        return baseStyle;
    }
  };

  const templateCommands = [
    {
      id: 'general_chat',
      emoji: '🤖',
      title: 'AI Assistant',
      description: 'Ask me anything! I can explain concepts, help with research, or have a conversation',
      command: 'Explain how Artificial Intelligence works in simple terms'
    },
    {
      id: 'social_media',
      emoji: '📱',
      title: 'Social Media',
      description: 'Post content, manage accounts, or interact with social platforms',
      command: 'Post a tweet about the latest AI developments'
    },
    {
      id: 'shopping_task',
      emoji: '🛍️',
      title: 'Shopping Assistant',
      description: 'Find products, compare prices, add to cart, or complete purchases',
      command: 'Find the best wireless headphones on Amazon and add to cart'
    },
    {
      id: 'page_analysis',
      emoji: '🔍',
      title: 'Page Analysis',
      description: 'Analyze current webpage, extract information, or summarize content',
      command: 'Summarize the main points of this article and highlight key insights from the current page'
    }
  ];

  // Custom markdown components with proper styling
  const markdownComponents = {
    // Code blocks
    pre: ({ children }) => (
      <pre style={{
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        padding: '12px',
        overflow: 'auto',
        margin: '8px 0',
        fontSize: '11px',
        lineHeight: '1.5',
        color: '#e2e8f0'
      }}>
        {children}
      </pre>
    ),
    // Inline code
    code: ({ node, inline, children, ...props }) => (
      inline ? (
        <code style={{
          backgroundColor: 'rgba(99, 102, 241, 0.15)',
          color: '#a5b4fc',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace'
        }} {...props}>
          {children}
        </code>
      ) : (
        <code style={{
          fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
          fontSize: '11px'
        }} {...props}>
          {children}
        </code>
      )
    ),
    // Headers
    h1: ({ children }) => (
      <h1 style={{
        fontSize: '16px',
        fontWeight: '600',
        margin: '12px 0 8px 0',
        color: 'var(--text-primary, #f1f5f9)'
      }}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 style={{
        fontSize: '14px',
        fontWeight: '600',
        margin: '12px 0 8px 0',
        color: 'var(--text-primary, #f1f5f9)'
      }}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 style={{
        fontSize: '13px',
        fontWeight: '600',
        margin: '12px 0 8px 0',
        color: 'var(--text-primary, #f1f5f9)'
      }}>
        {children}
      </h3>
    ),
    // Strong/Bold
    strong: ({ children }) => (
      <strong style={{
        fontWeight: '600',
        color: 'var(--text-primary, #f1f5f9)'
      }}>
        {children}
      </strong>
    ),
    // Emphasis/Italic
    em: ({ children }) => (
      <em style={{
        fontStyle: 'italic',
        color: '#586069'
      }}>
        {children}
      </em>
    ),
    // Unordered lists
    ul: ({ children }) => (
      <ul style={{
        margin: '8px 0',
        paddingLeft: '20px'
      }}>
        {children}
      </ul>
    ),
    // Ordered lists
    ol: ({ children }) => (
      <ol style={{
        margin: '8px 0',
        paddingLeft: '20px'
      }}>
        {children}
      </ol>
    ),
    // List items
    li: ({ children }) => (
      <li style={{
        margin: '2px 0',
        fontSize: '13px',
        lineHeight: '1.4'
      }}>
        {children}
      </li>
    ),
    // Paragraphs
    p: ({ children }) => (
      <p style={{
        margin: '8px 0',
        lineHeight: '1.5'
      }}>
        {children}
      </p>
    ),
    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote style={{
        borderLeft: '4px solid #e1e4e8',
        paddingLeft: '12px',
        margin: '8px 0',
        fontStyle: 'italic',
        color: '#586069'
      }}>
        {children}
      </blockquote>
    )
  };

  const TemplateCommands = () => (
    <div style={{
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      alignItems: 'center',
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      {/* Header Section */}
      <div style={{
        textAlign: 'center',
        marginBottom: '2px'
      }}>
        <h2 style={{
          color: 'var(--text-primary, #f1f5f9)',
          marginBottom: '2px',
          fontSize: '18px',
          fontWeight: '700',
          margin: '0 0 2px 0',
          letterSpacing: '-0.02em'
        }}>
          How can I help you today?
        </h2>
        <p style={{
          fontSize: '12px',
          color: 'var(--text-secondary, rgba(241,245,249,0.7))',
          fontWeight: '400',
          margin: '0',
          lineHeight: '1.4'
        }}>
          Choose a template below or type your own request
        </p>
      </div>

      {/* Template Grid */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
        width: '100%'
      }}>
        {templateCommands.map((template) => (
          <button
            key={template.id}
            onClick={() => onTemplateClick?.(template.command)}
            style={{
              background: 'var(--bg-glass, rgba(255, 255, 255, 0.06))',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              borderRadius: '14px',
              padding: '10px 12px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '11px',
              width: '100%',
              color: 'var(--text-primary, #f1f5f9)',
              backdropFilter: 'blur(8px)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Template Icon */}
            <div style={{
              fontSize: '18px',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
              borderRadius: '10px'
            }}>
              {template.emoji}
            </div>

            {/* Template Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{
                fontSize: '13px',
                fontWeight: '600',
                margin: '0 0 2px 0',
                color: 'var(--text-primary, #f1f5f9)'
              }}>
                {template.title}
              </h3>
              <p style={{
                fontSize: '11px',
                color: 'var(--text-tertiary, rgba(241,245,249,0.45))',
                lineHeight: '1.3',
                margin: 0
              }}>
                {template.description}
              </p>
            </div>

            {/* Try Arrow */}
            <div style={{
              fontSize: '12px',
              color: 'var(--text-accent, #a5b4fc)',
              flexShrink: 0
            }}>
              Try →
            </div>
          </button>
        ))}
      </div>

      {/* Help Section */}
      <div style={{
        marginTop: '4px',
        padding: '12px',
        backgroundColor: 'var(--bg-glass, rgba(255, 255, 255, 0.04))',
        borderRadius: '10px',
        border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
        textAlign: 'center',
        backdropFilter: 'blur(10px)'
      }}>
        <p style={{
          fontSize: '11px',
          color: 'var(--text-secondary, rgba(241,245,249,0.6))',
          margin: 0,
          lineHeight: '1.4'
        }}>
          💡 <strong>Tip:</strong> You can also type your own custom commands or questions directly in the chat input below.
        </p>
      </div>
    </div>
  );

  const WelcomeMessage = () => (
    <div style={{
      textAlign: 'center',
      marginTop: '16px',
      padding: '0 16px'
    }}>
      <h3 style={{
        color: 'var(--text-primary, #f1f5f9)',
        marginBottom: '6px',
        fontSize: '16px',
        fontWeight: '700',
        letterSpacing: '-0.02em'
      }}>
        🤖 Welcome to OmniBrowse!
      </h3>
      <p style={{
        marginBottom: '16px',
        fontSize: '12px',
        color: 'var(--text-secondary, rgba(241,245,249,0.7))',
        fontWeight: '400',
        lineHeight: '1.4'
      }}>
        Your intelligent companion for web automation, shopping, and social media tasks.
      </p>

      {/* How to Use Button */}
      <button
        onClick={() => window.location.hash = '/how-to-use'}
        style={{
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '10px',
          padding: '8px 18px',
          cursor: 'pointer',
          color: 'var(--text-accent, #a5b4fc)',
          fontSize: '12px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          margin: '0 auto',
          transition: 'all 0.3s ease',
          backdropFilter: 'blur(10px)'
        }}
      >
        📖 How to Use
      </button>
    </div>
  );

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-primary, #0a0f1e)',
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth',
        position: 'relative'
      }}
    >
      {/* Background Animation - Floating Orbs */}
      <div
        className="background-animation"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          className="message-orb-1"
          style={{
            position: "absolute",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.1))",
            filter: "blur(50px)",
            opacity: 0.15,
            top: "10%",
            left: "10%",
            animation: "float 6s ease-in-out infinite",
          }}
        />
        <div
          className="message-orb-2"
          style={{
            position: "absolute",
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(6, 182, 212, 0.2), rgba(99, 102, 241, 0.1))",
            filter: "blur(50px)",
            opacity: 0.12,
            top: "60%",
            right: "15%",
            animation: "float 6s ease-in-out infinite 2s",
          }}
        />
      </div>

      {/* Floating Particles in Message Area */}
      <div className="particle particle-1"></div>
      <div className="particle particle-2"></div>
      <div className="particle particle-3"></div>
      <div className="particle particle-4"></div>
      <div className="particle particle-5"></div>
      <div className="particle particle-6"></div>
      <div className="particle particle-7"></div>
      <div className="particle particle-8"></div>
      <div className="particle particle-9"></div>
      <div className="particle particle-10"></div>
      <div className="particle particle-11"></div>
      <div className="particle particle-12"></div>
      {/* CSS Keyframes for animations */}
      <style>
        {`
          @keyframes slideInFromRight {
            0% {
              opacity: 0;
              transform: translateX(100%);
            }
            100% {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          @keyframes slideInFromLeft {
            0% {
              opacity: 0;
              transform: translateX(-100%);
            }
            100% {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          @keyframes fadeInScale {
            0% {
              opacity: 0;
              transform: scale(0.8);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }
          
          .message-item {
            animation-fill-mode: both;
          }
          
          /* Ensure animations don't conflict with existing ones */
          .message-item[style*="slideInFromRight"],
          .message-item[style*="slideInFromLeft"] {
            animation-fill-mode: both;
          }
          
          /* Assistant message dark theme */
          .message-item.message-assistant {
            background-color: #1e2537 !important;
            color: #e2e8f0 !important;
            border: 1px solid rgba(99, 102, 241, 0.12) !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25) !important;
          }
          
          /* Ensure typing indicator is always transparent */
          .typing-indicator {
            background-color: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
        `}
      </style>

      {messages.length === 0 && (
        <>
          <div className="welcome-message" style={{ position: 'relative', zIndex: 1 }}>
            <WelcomeMessage />
          </div>
          <div className="template-commands" style={{ position: 'relative', zIndex: 1 }}>
            <TemplateCommands />
          </div>
        </>
      )}

      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
        const isFirstInGroup = !prevMessage || prevMessage.type !== message.type;
        const isLastInGroup = !nextMessage || nextMessage.type !== message.type;

        // Get base style
        const baseStyle = getMessageStyle(message.type, message.id || `msg-${index}`);

        // Modify style for grouped messages
        const style = {
          ...baseStyle,
          marginBottom: isLastInGroup ? '8px' : '2px',
          marginTop: isFirstInGroup ? '8px' : '2px',
          position: 'relative',
          zIndex: 1,
          borderRadius: (() => {
            if (message.type === 'user') {
              if (isFirstInGroup && isLastInGroup) return '14px 14px 4px 14px';
              if (isFirstInGroup) return '14px 14px 4px 4px';
              if (isLastInGroup) return '4px 14px 4px 14px';
              return '4px 14px 4px 4px';
            } else if (message.type === 'assistant') {
              if (isFirstInGroup && isLastInGroup) return '14px 14px 14px 4px';
              if (isFirstInGroup) return '14px 4px 4px 4px';
              if (isLastInGroup) return '4px 14px 14px 4px';
              return '4px 4px 4px 4px';
            }
            return baseStyle.borderRadius;
          })()
        };

        return (
          <div key={message.id || `msg-${index}`} className={`message-item message-${message.type}`} style={style}>
            {/* Special rendering for pause and approval messages */}
            {message.type === 'pause' || message.type === 'approval' ? (
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ marginBottom: '12px' }}>
                  {message.pauseReason === 'signin' ? '🔐' : message.pauseReason === 'approval' ? '⏳' : '❓'} {message.content}
                </div>
                {message.pauseDescription && (
                  <div style={{
                    marginBottom: '12px',
                    fontSize: '11px',
                    color: message.type === 'approval' ? '#1565c0' : '#856404',
                    fontStyle: 'italic'
                  }}>
                    {message.pauseDescription}
                  </div>
                )}

                {message.type === 'approval' ? (
                  // Approval message rendering
                  (() => {
                    const messageId = message.id || `msg-${index}`;

                    if (message.approved) {
                      return (
                        <div style={{
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          margin: '0 auto',
                          animation: 'fadeInScale 0.3s ease-out'
                        }}>
                          ✅ Approved
                        </div>
                      );
                    } else if (message.declined) {
                      return (
                        <div style={{
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          margin: '0 auto',
                          animation: 'fadeInScale 0.3s ease-out'
                        }}>
                          ❌ Declined
                        </div>
                      );
                    } else {
                      return (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleDecline(messageId)}
                            style={{
                              backgroundColor: '#f44336',
                              color: 'white',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#da190b';
                              e.target.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#f44336';
                              e.target.style.transform = 'scale(1)';
                            }}
                          >
                            ✗ Decline
                          </button>
                          <button
                            onClick={() => handleApprove(messageId)}
                            style={{
                              backgroundColor: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#45a049';
                              e.target.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#4CAF50';
                              e.target.style.transform = 'scale(1)';
                            }}
                          >
                            ✓ Approve
                          </button>
                        </div>
                      );
                    }
                  })()
                ) : (
                  // Pause message rendering (existing logic)
                  !message.resumed ? (
                    <button
                      onClick={() => handleResume(message.id || `msg-${index}`)}
                      style={{
                        backgroundColor: '#4ecdc4',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        margin: '0 auto'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#45b7d1';
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#4ecdc4';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      ✓ Resume
                    </button>
                  ) : (
                    <div style={{
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      margin: '0 auto',
                      animation: 'fadeInScale 0.3s ease-out'
                    }}>
                      ✅ Resumed
                    </div>
                  )
                )}
              </div>
            ) : (
              /* Render content with proper markdown support */
              <div style={{ textAlign: 'left', width: '100%' }}>
                {message.isMarkdown ? (
                  <ReactMarkdown
                    components={markdownComponents}
                    remarkPlugins={[remarkGfm]}
                    style={{ textAlign: 'left' }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : message.type === 'error' ? (
                  <ReactMarkdown
                    components={markdownComponents}
                    remarkPlugins={[remarkGfm]}
                    style={{ textAlign: 'left' }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
            )}
            {message.actions && message.actions.length > 0 && (
              <div style={{
                marginTop: '6px',
                fontSize: '10px',
                opacity: 0.9,
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingTop: '4px'
              }}>
                <strong>Actions:</strong>
                <div style={{ marginTop: '2px' }}>
                  {message.actions.map((action, i) => (
                    <div key={i} style={{
                      margin: '1px 0',
                      padding: '2px 6px',
                      backgroundColor: action.success ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      borderRadius: '6px',
                      fontSize: '10px',
                      color: action.success ? '#6ee7b7' : '#fca5a5'
                    }}>
                      {action.success ? '✅' : '❌'} {action.message || action.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Only show timestamp for last message in group */}
            {isLastInGroup && (
              <div style={{
                fontSize: '9px',
                opacity: 0.6,
                marginTop: '2px',
                textAlign: message.type === 'user' ? 'right' : 'left'
              }}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        );
      })}

      {/* Typing Indicator */}
      {isTyping && (
        <div
          className="typing-indicator"
          style={getTypingIndicatorStyle()}
        >
          <div style={{ textAlign: 'left', width: '100%' }}>
            <div className="typing-dots">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;