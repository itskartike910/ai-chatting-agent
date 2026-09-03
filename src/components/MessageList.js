import React, { useEffect, useRef, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ── Typewriter Animation Component ──
const TypewriterText = ({ text, speed = 20, onComplete, isActive = true }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef(null);

  // Calculate dynamic speed based on text length for 1-3 second animation
  const effectiveSpeed = useMemo(() => {
    const textLength = text?.length || 0;
    if (textLength <= 100) return Math.max(10, speed); // ~1-2 seconds for short
    if (textLength <= 500) return Math.max(5, Math.floor(speed * 0.7)); // ~1.5-2 seconds for medium
    return Math.max(2, Math.floor(speed * 0.4)); // ~2-3 seconds for long
  }, [text, speed]);

  useEffect(() => {
    if (!isActive) {
      setDisplayText(text || '');
      return;
    }

    if (!text || text.length === 0) {
      setDisplayText('');
      onComplete?.();
      return;
    }

    setCurrentIndex(0);
    setDisplayText('');

    const typeNextChar = () => {
      if (currentIndex < text.length) {
        setDisplayText(text.slice(0, currentIndex + 1));
        setCurrentIndex(prev => prev + 1);
        timeoutRef.current = setTimeout(typeNextChar, effectiveSpeed);
      } else {
        onComplete?.();
      }
    };

    timeoutRef.current = setTimeout(typeNextChar, effectiveSpeed);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text, isActive, effectiveSpeed, currentIndex, onComplete]);

  return <span>{displayText}</span>;
};

// ── Collapsible progress box for system messages ──
const ProgressBox = ({ messages, isLatestGroup, isTaskRunning, markdownComponents }) => {
  const [isExpanded, setIsExpanded] = useState(isLatestGroup && isTaskRunning);

  // Auto-expand when task is running for the latest group
  useEffect(() => {
    if (isLatestGroup && isTaskRunning) {
      setIsExpanded(true);
    } else if (isLatestGroup && !isTaskRunning) {
      // Auto-collapse when task finishes
      setIsExpanded(false);
    }
  }, [isLatestGroup, isTaskRunning]);

  if (messages.length === 0) return null;

  return (
    <div style={{
      margin: '6px 12px',
      borderRadius: '12px',
      border: '1px solid rgba(99, 102, 241, 0.25)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
      backgroundColor: 'rgba(15, 20, 35, 0.25)',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 1,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
      animation: 'slideInFromLeft 0.3s ease-out forwards'
    }}>
      {/* Header / Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#a5b4fc',
          fontSize: '12px',
          fontWeight: '600',
          textAlign: 'left',
          transition: 'background 0.2s ease'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            display: 'inline-flex',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            fontSize: '10px'
          }}>▶</span>
          Progress Updates
          <span style={{
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            borderRadius: '10px',
            padding: '1px 7px',
            fontSize: '10px',
            fontWeight: '700',
            color: '#818cf8'
          }}>{messages.length}</span>
        </span>
        <span style={{
          fontSize: '10px',
          color: 'rgba(165, 180, 252, 0.5)',
          fontWeight: '400'
        }}>
          {isExpanded ? 'Collapse' : 'Expand'}
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div style={{
          padding: '4px 14px 12px 14px',
          borderTop: '1px solid rgba(99, 102, 241, 0.15)',
          maxHeight: '350px',
          overflowY: 'auto'
        }}>
          {messages.map((msg, i) => (
            <div key={msg.id || `prog-${i}`} className={`stagger-${(i % 5) + 1} message-enter`} style={{
              padding: '8px 0',
              borderBottom: i < messages.length - 1 ? '1px dashed rgba(165, 180, 252, 0.15)' : 'none',
              fontSize: '11px',
              lineHeight: '1.6',
              color: '#cbd5e1',
              wordWrap: 'break-word',
              textAlign: 'left'
            }}>
              {msg.isMarkdown ? (
                <ReactMarkdown
                  components={markdownComponents}
                  remarkPlugins={[remarkGfm]}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MessageList = ({ messages, onTemplateClick, onResumeExecution, onApproveTask, onDeclineTask, isTyping, updateMessageState }) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

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
    updateMessageState?.(messageId, { approved: true, declined: false });
    onApproveTask?.();
  };

  const handleDecline = (messageId) => {
    console.log('❌ Decline clicked for message:', messageId);
    updateMessageState?.(messageId, { approved: false, declined: true });
    onDeclineTask?.();
  };

  const handleResume = (messageId) => {
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

  // ── Group messages into task groups ──
  // Each group: { user: Message|null, progress: Message[], completion: Message[] }
  // "progress" = system messages (step updates, observations, etc.)
  // "completion" = assistant, error, pause, approval messages
  const messageGroups = useMemo(() => {
    const groups = [];
    let currentGroup = { user: null, progress: [], completion: [] };

    messages.forEach((msg) => {
      if (msg.type === 'user') {
        // If current group has content, push it and start new
        if (currentGroup.user || currentGroup.progress.length > 0 || currentGroup.completion.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = { user: msg, progress: [], completion: [] };
      } else if (msg.type === 'system') {
        currentGroup.progress.push(msg);
      } else {
        // assistant, error, pause, approval
        currentGroup.completion.push(msg);
      }
    });

    // Push the last group if it has content
    if (currentGroup.user || currentGroup.progress.length > 0 || currentGroup.completion.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }, [messages]);

  // Custom markdown components with proper styling
  const [copiedCodeIndex, setCopiedCodeIndex] = React.useState(null);
  const codeBlockCounter = React.useRef(0);
  // Reset counter on each render cycle
  codeBlockCounter.current = 0;

  const handleCopyCode = (text, blockId) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCodeIndex(blockId);
      setTimeout(() => setCopiedCodeIndex(null), 2000);
    }).catch(err => console.error('Copy failed:', err));
  };

  const markdownComponents = {
    pre: ({ children }) => {
      const blockId = codeBlockCounter.current++;
      // Extract the raw text from the code element inside <pre>
      const codeElement = React.Children.toArray(children).find(
        child => child?.type === 'code' || child?.props?.node?.tagName === 'code'
      );
      const codeText = codeElement?.props?.children
        ? (Array.isArray(codeElement.props.children)
          ? codeElement.props.children.join('')
          : String(codeElement.props.children)).replace(/\n$/, '')
        : '';
      const className = codeElement?.props?.className || '';
      const langMatch = className.match(/language-(\w+)/);
      const language = langMatch ? langMatch[1] : '';

      return (
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          overflow: 'hidden',
          margin: '8px 0',
        }}>
          {/* Header bar with language + copy */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 12px',
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{
              fontSize: '10px',
              color: '#94a3b8',
              fontFamily: 'SFMono-Regular, Consolas, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {language || 'code'}
            </span>
            <button
              onClick={() => handleCopyCode(codeText, blockId)}
              style={{
                background: 'none',
                border: 'none',
                color: copiedCodeIndex === blockId ? '#10b981' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
              }}
            >
              {copiedCodeIndex === blockId ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          {/* Code content */}
          <pre style={{
            padding: '12px',
            overflow: 'auto',
            margin: 0,
            fontSize: '11px',
            lineHeight: '1.5',
            color: '#e2e8f0',
          }}>
            {children}
          </pre>
        </div>
      );
    },
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
    h1: ({ children }) => (
      <h1 style={{ fontSize: '16px', fontWeight: '600', margin: '12px 0 8px 0', color: 'var(--text-primary, #f1f5f9)' }}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 style={{ fontSize: '14px', fontWeight: '600', margin: '12px 0 8px 0', color: 'var(--text-primary, #f1f5f9)' }}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 style={{ fontSize: '13px', fontWeight: '600', margin: '12px 0 8px 0', color: 'var(--text-primary, #f1f5f9)' }}>
        {children}
      </h3>
    ),
    strong: ({ children }) => (
      <strong style={{ fontWeight: '600', color: 'var(--text-primary, #f1f5f9)' }}>
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em style={{ fontStyle: 'italic', color: '#94a3b8' }}>
        {children}
      </em>
    ),
    ul: ({ children }) => (
      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li style={{ margin: '2px 0', fontSize: '13px', lineHeight: '1.4' }}>
        {children}
      </li>
    ),
    p: ({ children }) => (
      <p style={{ margin: '8px 0', lineHeight: '1.5' }}>
        {children}
      </p>
    ),
    blockquote: ({ children }) => (
      <blockquote style={{
        borderLeft: '4px solid rgba(99, 102, 241, 0.3)',
        paddingLeft: '12px',
        margin: '8px 0',
        fontStyle: 'italic',
        color: '#94a3b8'
      }}>
        {children}
      </blockquote>
    )
  };

  // ── Render a single message bubble ──
  const renderMessageBubble = (message, index) => {
    const type = message.type;

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
      position: 'relative',
      zIndex: 1
    };

    let style;
    switch (type) {
      case 'user':
        style = {
          ...baseStyle,
          background: 'linear-gradient(135deg, var(--accent-primary, #6366f1), #7c3aed)',
          color: 'white',
          alignSelf: 'flex-end',
          marginLeft: 'auto',
          borderBottomRightRadius: '4px',
          boxShadow: '0 2px 12px rgba(99,102,241,0.3)',
          fontWeight: '500'
        };
        break;
      case 'assistant':
        style = {
          ...baseStyle,
          backgroundColor: '#1e2537',
          color: 'var(--text-primary, #e2e8f0)',
          alignSelf: 'flex-start',
          border: '1px solid rgba(99, 102, 241, 0.12)',
          borderBottomLeftRadius: '4px',
          textAlign: 'left',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
        };
        break;
      case 'error':
        style = {
          ...baseStyle,
          backgroundColor: '#2a1520',
          color: '#fca5a5',
          alignSelf: 'flex-start',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          textAlign: 'left',
          fontSize: '12px',
          borderRadius: '12px',
          borderBottomLeftRadius: '4px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
        };
        break;
      case 'pause':
        style = {
          ...baseStyle,
          backgroundColor: '#2a2415',
          color: '#fbbf24',
          alignSelf: 'flex-start',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          textAlign: 'left',
          fontSize: '12px',
          borderRadius: '12px',
          borderBottomLeftRadius: '4px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
        };
        break;
      case 'approval':
        style = {
          ...baseStyle,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          color: '#93c5fd',
          alignSelf: 'flex-start',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          textAlign: 'left',
          fontSize: '12px',
          borderRadius: '14px',
          padding: '12px 16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 15px rgba(99, 102, 241, 0.15)'
        };
        break;
      default:
        style = baseStyle;
    }

    const animationClass = type === 'user' ? 'message-enter-right' : 'message-enter-left';

    return (
      <div key={message.id || `msg-${index}`} className={`message-item message-${type} ${animationClass}`} style={style}>
        {/* Pause / Approval messages with buttons */}
        {(type === 'pause' || type === 'approval') ? (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <div style={{
              fontWeight: '700',
              fontSize: '13px',
              color: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: '6px'
            }}>
              {message.pauseReason === 'signin' ? '🔐 Sign In Required' : message.pauseReason === 'approval' ? '⏳ Approval Required' : '❓ Action Required'}
            </div>
            {message.pauseDescription && (
              <div style={{
                marginBottom: '12px',
                fontSize: '11.5px',
                color: type === 'approval' ? '#93c5fd' : '#fbbf24',
                fontStyle: 'italic',
                lineHeight: '1.4'
              }}>
                {message.pauseDescription}
              </div>
            )}

            {type === 'approval' ? (
              (() => {
                const messageId = message.id || `msg-${index}`;
                if (message.approved) {
                  return (
                    <div style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      margin: '0 auto',
                      width: 'fit-content'
                    }}>
                      ✓ Approved
                    </div>
                  );
                } else if (message.declined) {
                  return (
                    <div style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      margin: '0 auto',
                      width: 'fit-content'
                    }}>
                      ✕ Declined
                    </div>
                  );
                } else {
                  return (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleDecline(messageId)}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        ✗ Decline
                      </button>
                      <button
                        onClick={() => handleApprove(messageId)}
                        style={{
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          padding: '7px 16px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        ✓ Approve
                      </button>
                    </div>
                  );
                }
              })()
            ) : (
              // Pause message: resume button
              !message.resumed ? (
                <button
                  onClick={() => handleResume(message.id || `msg-${index}`)}
                  style={{
                    backgroundColor: '#6366f1',
                    color: 'white',
                    border: 'none',
                    padding: '7px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.4)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    margin: '0 auto'
                  }}
                >
                  ▶ Resume
                </button>
              ) : (
                <div style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  margin: '0 auto',
                  width: 'fit-content'
                }}>
                  ✓ Resumed
                </div>
              )
            )}
          </div>
        ) : (
          /* Normal content rendering */
          <div style={{ textAlign: 'left', width: '100%' }}>
            {type === 'assistant' ? (
              // Typewriter animation for assistant messages
              <TypewriterText
                text={message.content}
                speed={15}
                isActive={true}
              />
            ) : (message.isMarkdown || type === 'error') ? (
              <ReactMarkdown
                components={markdownComponents}
                remarkPlugins={[remarkGfm]}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              message.content
            )}
          </div>
        )}

        {/* Actions */}
        {message.actions && message.actions.length > 0 && (
          <div style={{
            marginTop: '6px', fontSize: '10px', opacity: 0.9,
            borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px'
          }}>
            <strong>Actions:</strong>
            <div style={{ marginTop: '2px' }}>
              {message.actions.map((action, i) => (
                <div key={i} style={{
                  margin: '1px 0', padding: '2px 6px',
                  backgroundColor: action.success ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  borderRadius: '6px', fontSize: '10px',
                  color: action.success ? '#6ee7b7' : '#fca5a5'
                }}>
                  {action.success ? '✅' : '❌'} {action.message || action.description}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div style={{
          fontSize: '9px', opacity: 0.5, marginTop: '2px',
          textAlign: type === 'user' ? 'right' : 'left'
        }}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    );
  };

  const templateCommands = [
    {
      id: 'general_chat', emoji: '🤖', title: 'AI Assistant',
      description: 'Ask me anything! I can explain concepts, help with research, or have a conversation',
      command: 'Explain how Artificial Intelligence works in simple terms'
    },
    {
      id: 'social_media', emoji: '📱', title: 'Social Media',
      description: 'Post content, manage accounts, or interact with social platforms',
      command: 'Post a tweet about the latest AI developments'
    },
    {
      id: 'shopping_task', emoji: '🛍️', title: 'Shopping Assistant',
      description: 'Find products, compare prices, add to cart, or complete purchases',
      command: 'Find the best wireless headphones on Amazon and add to cart'
    },
    {
      id: 'page_analysis', emoji: '🔍', title: 'Page Analysis',
      description: 'Analyze current webpage, extract information, or summarize content',
      command: 'Summarize the main points of this article and highlight key insights from the current page'
    }
  ];

  const TemplateCommands = () => (
    <div style={{
      padding: '16px', display: 'flex', flexDirection: 'column',
      gap: '16px', alignItems: 'center', maxWidth: '400px', margin: '0 auto'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2px' }}>
        <h2 style={{
          color: 'var(--text-primary, #f1f5f9)', marginBottom: '2px', fontSize: '18px',
          fontWeight: '700', margin: '0 0 2px 0', letterSpacing: '-0.02em'
        }}>
          How can I help you today?
        </h2>
        <p style={{
          fontSize: '12px', color: 'var(--text-secondary, rgba(241,245,249,0.7))',
          fontWeight: '400', margin: '0', lineHeight: '1.4'
        }}>
          Choose a template below or type your own request
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', width: '100%' }}>
        {templateCommands.map((template) => (
          <button
            key={template.id}
            onClick={() => onTemplateClick?.(template.command)}
            style={{
              background: 'var(--bg-glass, rgba(255, 255, 255, 0.06))',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              borderRadius: '14px', padding: '10px 12px', cursor: 'pointer',
              textAlign: 'left', transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
              display: 'flex', alignItems: 'center', gap: '11px', width: '100%',
              color: 'var(--text-primary, #f1f5f9)', backdropFilter: 'blur(8px)',
              position: 'relative', overflow: 'hidden'
            }}
          >
            <div style={{
              fontSize: '18px', width: '24px', height: '24px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
              borderRadius: '10px'
            }}>
              {template.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{
                fontSize: '13px', fontWeight: '600', margin: '0 0 2px 0',
                color: 'var(--text-primary, #f1f5f9)'
              }}>
                {template.title}
              </h3>
              <p style={{
                fontSize: '11px', color: 'var(--text-tertiary, rgba(241,245,249,0.45))',
                lineHeight: '1.3', margin: 0
              }}>
                {template.description}
              </p>
            </div>
            <div style={{
              fontSize: '12px', color: 'var(--text-accent, #a5b4fc)', flexShrink: 0
            }}>
              Try →
            </div>
          </button>
        ))}
      </div>

      <div style={{
        marginTop: '4px', padding: '12px',
        backgroundColor: 'var(--bg-glass, rgba(255, 255, 255, 0.04))',
        borderRadius: '10px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
        textAlign: 'center', backdropFilter: 'blur(10px)'
      }}>
        <p style={{
          fontSize: '11px', color: 'var(--text-secondary, rgba(241,245,249,0.6))',
          margin: 0, lineHeight: '1.4'
        }}>
          💡 <strong>Tip:</strong> You can also type your own custom commands or questions directly in the chat input below.
        </p>
      </div>
    </div>
  );

  const WelcomeMessage = () => (
    <div style={{ textAlign: 'center', marginTop: '16px', padding: '0 16px' }}>
      <h3 style={{
        color: 'var(--text-primary, #f1f5f9)', marginBottom: '6px', fontSize: '16px',
        fontWeight: '700', letterSpacing: '-0.02em'
      }}>
        🤖 Welcome to OmniBrowse!
      </h3>
      <p style={{
        marginBottom: '16px', fontSize: '12px',
        color: 'var(--text-secondary, rgba(241,245,249,0.7))',
        fontWeight: '400', lineHeight: '1.4'
      }}>
        Your intelligent companion for web automation, shopping, and social media tasks.
      </p>
      <button
        onClick={() => window.location.hash = '/how-to-use'}
        style={{
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '10px', padding: '8px 18px', cursor: 'pointer',
          color: 'var(--text-accent, #a5b4fc)', fontSize: '12px', fontWeight: '600',
          display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto',
          transition: 'all 0.3s ease', backdropFilter: 'blur(10px)'
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
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--bg-primary, #0a0f1e)',
        WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth', position: 'relative'
      }}
    >
      {/* Background Animation */}
      <div className="background-animation" style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none', zIndex: 0
      }}>
        <div className="message-orb-1" style={{
          position: 'absolute', width: '200px', height: '200px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.1))',
          filter: 'blur(50px)', opacity: 0.15, top: '10%', left: '10%',
          animation: 'float 6s ease-in-out infinite'
        }} />
        <div className="message-orb-2" style={{
          position: 'absolute', width: '150px', height: '150px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.2), rgba(99, 102, 241, 0.1))',
          filter: 'blur(50px)', opacity: 0.12, top: '60%', right: '15%',
          animation: 'float 6s ease-in-out infinite 2s'
        }} />
      </div>

      {/* Floating Particles */}
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

      {/* CSS Keyframes */}
      <style>
        {`
          @keyframes slideInFromRight {
            0% { opacity: 0; transform: translateX(20px); }
            100% { opacity: 1; transform: translateX(0); }
          }
          @keyframes slideInFromLeft {
            0% { opacity: 0; transform: translateX(-20px); }
            100% { opacity: 1; transform: translateX(0); }
          }
          @keyframes fadeInScale {
            0% { opacity: 0; transform: scale(0.95) translateY(5px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          .message-item { animation-fill-mode: both; animation: slideInFromLeft 0.3s ease-out forwards; }
          .message-user { animation: slideInFromRight 0.3s ease-out forwards; }
          
          .message-item.message-assistant {
            background-color: rgba(30, 37, 55, 0.7) !important;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            color: #e2e8f0 !important;
            border: 1px solid rgba(139, 92, 246, 0.2) !important;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
          }
          .typing-indicator {
            background-color: transparent !important;
            border: none !important;
            box-shadow: none !important;
            animation: fadeInScale 0.3s ease-out forwards;
          }
        `}
      </style>

      {/* Empty state */}
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

      {/* Grouped message rendering */}
      {messageGroups.map((group, groupIndex) => {
        const isLatestGroup = groupIndex === messageGroups.length - 1;

        return (
          <div key={`group-${groupIndex}`} style={{ position: 'relative', zIndex: 1 }}>
            {/* 1. User message */}
            {group.user && renderMessageBubble(group.user, `g${groupIndex}-user`)}

            {/* 2. Collapsible progress box (system messages) */}
            {group.progress.length > 0 && (
              <ProgressBox
                messages={group.progress}
                isLatestGroup={isLatestGroup}
                isTaskRunning={isTyping}
                markdownComponents={markdownComponents}
              />
            )}

            {/* 3. Completion messages (assistant, error, pause, approval) — outside the box */}
            {group.completion.map((msg, i) => renderMessageBubble(msg, `g${groupIndex}-c${i}`))}
          </div>
        );
      })}

      {/* Typing Indicator */}
      {isTyping && (
        <div className="typing-indicator" style={{
          margin: '4px 12px',
          padding: '6px 12px',
          borderRadius: '12px',
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          alignSelf: 'flex-start',
          width: 'fit-content',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
          position: 'relative',
          zIndex: 1
        }}>
          <div className="typing-dots">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;