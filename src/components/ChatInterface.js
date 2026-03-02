/* global chrome */

import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import TaskStatus from './TaskStatus';
import { useChat } from '../hooks/useChat';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaCog,
  FaWifi,
  FaExclamationTriangle,
  FaHistory,
  FaCoins
} from 'react-icons/fa';
import { RiChatNewFill } from 'react-icons/ri';

const ChatInterface = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get chat ID from URL params
  const urlParams = new URLSearchParams(location.search);
  const historyId = urlParams.get('history');

  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  // eslint-disable-next-line no-unused-vars
  const { messages, addMessage, clearMessages, updateMessageState, loading, saveCurrentChat, totalTokens, updateTotalTokens } = useChat(historyId);
  const [isExecuting, setIsExecuting] = useState(false);
  const [taskStatus, setTaskStatus] = useState(null);
  const portRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isConnectingRef = useRef(false);

  // Add state for message input
  const [messageInput, setMessageInput] = useState('');

  // Add state for typing indicator
  const [isTyping, setIsTyping] = useState(false);

  // Add function to handle template clicks
  const handleTemplateClick = (templateCommand) => {
    setMessageInput(templateCommand);
  };

  // Helper function to detect markdown content
  const hasMarkdownContent = (content) => {
    if (!content || typeof content !== 'string') return false;

    // Check for common markdown patterns
    const markdownPatterns = [
      /```[\s\S]*?```/,  // Code blocks
      /`[^`]+`/,         // Inline code
      /\*\*[^*]+\*\*/,   // Bold
      /\*[^*]+\*/,       // Italic
      /^#{1,3}\s+/m,     // Headers
      /^\s*[-*+]\s+/m,   // Bullet points
      /^\s*\d+\.\s+/m    // Numbered lists
    ];

    return markdownPatterns.some(pattern => pattern.test(content));
  };

  useEffect(() => {
    let mounted = true;

    const setupConnection = () => {
      if (!mounted || isConnectingRef.current) return;

      isConnectingRef.current = true;

      try {
        console.log('Setting up connection...');

        // Clear existing connection safely
        if (portRef.current) {
          try {
            portRef.current.onMessage.removeListener();
            portRef.current.onDisconnect.removeListener();
            portRef.current.disconnect();
          } catch (e) {
            // Ignore disconnect errors
          }
          portRef.current = null;
        }

        setIsExecuting(false);
        setIsTyping(false);
        setTaskStatus(null);

        // Create new connection
        portRef.current = chrome.runtime.connect({ name: 'popup-connection' });

        portRef.current.onMessage.addListener((message) => {
          if (!mounted) return;

          console.log('Received message:', message.type);

          switch (message.type) {
            case 'connected':
              setConnectionStatus('connected');
              isConnectingRef.current = false;
              console.log('Connection established');

              // Request current status including execution state
              portRef.current.postMessage({ type: 'get_status' });
              break;

            case 'restore_message':
              // Validate restored message structure
              if (message.message &&
                message.message.type &&
                message.message.timestamp) {

                console.log('🔍 Restoring message:', message.message);
                console.log('🔍 Message type check:', {
                  type: message.message.type,
                  isTaskPaused: message.message.type === 'task_paused',
                  pause_reason: message.message.pause_reason,
                  pauseReason: message.message.pauseReason,
                  allKeys: Object.keys(message.message)
                });

                // Ensure message has all required fields
                const restoredMessage = {
                  ...message.message,
                  id: message.message.id || Date.now().toString(36) + Math.random().toString(36).substr(2),
                  type: message.message.type,
                  content: message.message.content || '',
                  timestamp: message.message.timestamp,
                  isMarkdown: message.message.isMarkdown || hasMarkdownContent(message.message.content),
                  // Preserve state information for pause/approval messages
                  resumed: message.message.resumed || false,
                  approved: message.message.approved || false,
                  declined: message.message.declined || false,
                  pauseReason: message.message.pauseReason,
                  pauseDescription: message.message.pauseDescription
                };

                // Convert task_paused messages to appropriate type based on pause_reason
                if (restoredMessage.type === 'task_paused') {
                  const pauseReason = restoredMessage.pause_reason || restoredMessage.pauseReason;
                  restoredMessage.type = pauseReason === 'approval' ? 'approval' : 'pause';
                }

                // Special handling for task_complete messages that might have nested result structure
                if (message.message.type === 'task_complete' && message.message.result) {
                  const responseContent = message.message.result.response || message.message.result.message;
                  if (responseContent && responseContent !== restoredMessage.content) {
                    console.log('🔄 Extracting content from task_complete result:', responseContent);
                    restoredMessage.content = responseContent;
                    restoredMessage.isMarkdown = message.message.result.isMarkdown || hasMarkdownContent(responseContent);
                  }
                }

                // Final validation before adding
                if (!restoredMessage.content && !restoredMessage.message) {
                  console.warn('⚠️ Restored message has no content:', restoredMessage);
                  return;
                }

                // For task_paused messages, use the message field as content
                if (restoredMessage.type === 'pause' || restoredMessage.type === 'approval') {
                  if (restoredMessage.message && !restoredMessage.content) {
                    restoredMessage.content = restoredMessage.message;
                  }
                }

                console.log('✅ Restoring message:', restoredMessage);
                addMessage(restoredMessage);
              } else {
                console.warn('❌ Skipped invalid restored message:', message.message);
              }
              break;

            case 'status_response':
              // Handle execution state from background
              if (message.isExecuting) {
                setIsExecuting(true);
                setIsTyping(message.isTyping || false);
                if (message.taskStatus) {
                  setTaskStatus(message.taskStatus);
                } else {
                  setTaskStatus({ status: 'executing', message: 'Task in progress...' });
                }
              }
              break;

            case 'execution_state':
              // Handle execution state sent on connection
              if (message.isExecuting) {
                setIsExecuting(true);
                setTaskStatus({ status: 'executing', message: 'Task in progress...' });
              }
              break;

            case 'config_updated':
              console.log('🔄 Config updated:', message.provider);
              break;

            case 'chat_cleared':
              console.log('Chat cleared by background, session:', message.sessionId);
              // Additional cleanup if needed
              setTaskStatus(null);
              setIsExecuting(false);
              updateTotalTokens(0);
              break;

            case 'token_update':
              updateTotalTokens(message.tokens);
              break;

            case 'task_start':
              setIsExecuting(true);
              setIsTyping(true);
              setTaskStatus({ status: 'starting', message: 'Task started...' });
              addMessage({
                type: 'system',
                content: '🚀 Task started...',
                timestamp: Date.now()
              });
              break;

            case 'execution_start':
              setIsExecuting(true);
              setIsTyping(true);
              setTaskStatus({ status: 'executing', message: 'Execution started...' });
              addMessage({
                type: 'system',
                content: '⚡ Execution started...',
                timestamp: Date.now()
              });
              break;

            case 'status_update':
              setIsExecuting(true);
              setIsTyping(true);
              setTaskStatus({
                status: 'executing',
                message: message.message
              });
              addMessage({
                type: 'system',
                content: `⚡ ${message.message}`,
                timestamp: Date.now()
              });
              break;

            case 'step_complete':
              setIsExecuting(true);
              setIsTyping(true);
              setTaskStatus({
                status: 'executing',
                message: message.message || 'Step completed, continuing...'
              });
              addMessage({
                type: 'system',
                content: `✅ ${message.message || 'Step completed, continuing...'}`,
                timestamp: Date.now()
              });
              break;

            case 'observation_strategy':
              setIsExecuting(true);
              setIsTyping(true);
              setTaskStatus({
                status: 'executing',
                message: 'Analyzing current situation...'
              });

              let obsStratContent = '🔍 **Current Analysis:**\n\n';
              if (message.observation) {
                obsStratContent += `**Observation:** ${message.observation}\n\n`;
              }
              if (message.strategy) {
                obsStratContent += `**Strategy:** ${message.strategy}`;
              }

              addMessage({
                type: 'system',
                content: obsStratContent,
                timestamp: Date.now(),
                isMarkdown: true
              });
              break;

            case 'task_complete':
              setIsExecuting(false);
              setIsTyping(false); // Hide typing indicator
              setTaskStatus({ status: 'completed', message: 'Task completed!' });

              const responseContent = message.result.response || message.result.message;

              addMessage({
                type: 'assistant',
                content: responseContent,
                timestamp: Date.now(),
                isMarkdown: message.result.isMarkdown || hasMarkdownContent(responseContent), // Use flag from backend first
                actions: message.result.actions
              });
              break;

            case 'task_error':
              setIsExecuting(false);
              setIsTyping(false); // Hide typing indicator
              setTaskStatus({ status: 'error', message: message.error });
              addMessage({
                type: 'error',
                content: `❌ **Task Error**\n\n${message.error}`,
                timestamp: Date.now(),
                isMarkdown: true
              });
              break;

            case 'task_cancelled':
              setIsExecuting(false);
              setIsTyping(false); // Hide typing indicator
              setTaskStatus({ status: 'cancelled', message: 'Task cancelled' });

              // Show cancellation message with progress
              let cancelContent = '🛑 **Task Cancelled**\n\n';
              if (message.progress && message.progress !== 'No progress made') {
                cancelContent += `**Progress Made:** ${message.progress}\n\n`;
              } else {
                cancelContent += '**Status:** Task was cancelled before significant progress was made.\n\n';
              }
              cancelContent += 'The task has been cancelled as requested. You can start a new task anytime.';

              addMessage({
                type: 'system',
                content: '🛑 Task cancelled by user',
                timestamp: Date.now()
              });

              addMessage({
                type: 'assistant',
                content: cancelContent,
                timestamp: Date.now(),
                isMarkdown: true
              });
              break;

            case 'task_paused':
              setIsExecuting(false);
              setIsTyping(false); // Hide typing indicator
              setTaskStatus({ status: 'paused', message: 'Task paused - waiting for user action' });

              // Add pause message with continue button
              addMessage({
                type: message.pause_reason === 'approval' ? 'approval' : 'pause',
                content: message.message || 'Task execution paused',
                pauseReason: message.pause_reason || 'unknown',
                pauseDescription: message.pause_description || '',
                timestamp: Date.now()
              });
              break;

            case 'task_resumed':
              setIsExecuting(true);
              setIsTyping(true);
              setTaskStatus({ status: 'executing', message: 'Task resumed - continuing execution...' });

              // Add a system message to show task was resumed
              addMessage({
                type: 'system',
                content: '✅ Task resumed - continuing execution...',
                timestamp: Date.now()
              });
              break;

            case 'error':
              setIsTyping(false); // Hide typing indicator
              addMessage({
                type: 'error',
                content: `❌ **Error**\n\n${message.error}`,
                timestamp: Date.now(),
                isMarkdown: true
              });
              break;

            default:
              console.warn('Unknown message type:', message.type);
          }
        });

        portRef.current.onDisconnect.addListener(() => {
          if (!mounted) return;

          console.log('Port disconnected');
          setConnectionStatus('disconnected');
          setIsExecuting(false);
          setIsTyping(false);
          setTaskStatus(null);
          isConnectingRef.current = false;
          portRef.current = null;

          // Auto-reconnect after delay (only if not intentionally disconnected)
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            if (mounted && !isConnectingRef.current) {
              console.log('Attempting to reconnect...');
              setupConnection();
            }
          }, 2000);
        });

        setConnectionStatus('connecting');

      } catch (error) {
        console.error('Connection setup failed:', error);
        setConnectionStatus('error');
        isConnectingRef.current = false;

        // Retry connection
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          if (mounted && !isConnectingRef.current) {
            setupConnection();
          }
        }, 3000);
      }
    };

    // Initial connection setup with small delay
    const initialTimeout = setTimeout(() => {
      if (mounted) {
        setupConnection();
      }
    }, 100);

    // Cleanup
    return () => {
      mounted = false;
      isConnectingRef.current = false;

      if (initialTimeout) {
        clearTimeout(initialTimeout);
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (portRef.current) {
        try {
          portRef.current.disconnect();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendMessage = async (message) => {
    // Send message immediately without any subscription checks
    addMessage({
      type: 'user',
      content: message,
      timestamp: Date.now()
    });

    // Show typing indicator
    setIsTyping(true);

    // Fallback to background script (existing logic)
    if (portRef.current && connectionStatus === 'connected' && !isExecuting) {
      try {
        console.log('Sending message to background:', message);
        portRef.current.postMessage({
          type: 'new_task',
          task: message
        });
      } catch (error) {
        console.error('Error sending message:', error);
        setIsTyping(false); // Hide typing indicator on error
        addMessage({
          type: 'error',
          content: '❌ Failed to send message. Connection lost.',
          timestamp: Date.now()
        });
        setConnectionStatus('disconnected');
      }
    } else {
      setIsTyping(false); // Hide typing indicator if can't send
      const statusMessage = isExecuting
        ? '⏳ Please wait for current task to complete...'
        : '❌ Not connected to background service. Please wait...';

      addMessage({
        type: 'error',
        content: statusMessage,
        timestamp: Date.now()
      });
    }
  };

  const handleStopExecution = () => {
    if (portRef.current && isExecuting) {
      try {
        console.log('Stopping task execution...');
        portRef.current.postMessage({
          type: 'cancel_task'
        });
      } catch (error) {
        console.error('Error stopping task:', error);
        setIsExecuting(false);
        setTaskStatus({ status: 'error', message: 'Failed to stop task' });
      }
    }
  };

  const handleResumeExecution = () => {
    if (portRef.current) {
      try {
        console.log('Resuming task execution...');
        portRef.current.postMessage({
          type: 'resume_task'
        });
      } catch (error) {
        console.error('Error resuming task:', error);
        addMessage({
          type: 'error',
          content: '❌ Failed to resume task. Connection lost.',
          timestamp: Date.now()
        });
      }
    }
  };

  const handleApproveTask = () => {
    if (portRef.current) {
      try {
        console.log('Approving task execution...');
        portRef.current.postMessage({
          type: 'resume_task'
        });
      } catch (error) {
        console.error('Error approving task:', error);
        addMessage({
          type: 'error',
          content: '❌ Failed to approve task. Connection lost.',
          timestamp: Date.now()
        });
      }
    }
  };

  const handleDeclineTask = () => {
    if (portRef.current) {
      try {
        console.log('Declining task execution...');
        portRef.current.postMessage({
          type: 'cancel_task'
        });
      } catch (error) {
        console.error('Error declining task:', error);
        addMessage({
          type: 'error',
          content: '❌ Failed to decline task. Connection lost.',
          timestamp: Date.now()
        });
      }
    }
  };

  const handleNewChat = async () => {
    if (messages.length >= 2) {
      const userMessages = messages.filter(msg => msg.type === 'user' || msg.type === 'assistant');
      if (userMessages.length >= 2) {
        await saveCurrentChat();
      }
    }

    // Clear current chat state
    clearMessages();

    // Send new_chat message to background
    if (portRef.current) {
      portRef.current.postMessage({ type: 'new_chat' });
    }

    // Reset UI state
    setMessageInput('');
    setIsExecuting(false);
    setTaskStatus(null);
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#17bf63';
      case 'connecting': return '#ffad1f';
      case 'error': return '#e0245e';
      default: return '#657786';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <FaWifi />;
      case 'connecting': return <FaWifi style={{ opacity: 0.6 }} />;
      case 'error': return <FaExclamationTriangle />;
      default: return <FaWifi style={{ opacity: 0.3 }} />;
    }
  };

  // Add subscription choice modal as an overlay in the return statement
  return (
    <div className={`chat-interface${isExecuting ? ' neon-active' : ''}`} style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "var(--font-sans, 'Inter', -apple-system, sans-serif)",
      backgroundColor: 'var(--bg-primary, #0a0f1e)',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
      touchAction: 'manipulation'
    }}>
      {/* Neon App Border */}
      <div className="neon-app-border"></div>

      {/* Background Animation */}
      <div className="background-animation">
        <div className="floating-orb chat-orb-1"></div>
        <div className="floating-orb chat-orb-2"></div>
        <div className="floating-orb chat-orb-3"></div>
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

      {/* Fixed Header - Updated with consistent styling */}
      <div className="chat-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
        background: 'var(--gradient-header, linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%))',
        flexShrink: 0,
        minHeight: '52px',
        maxHeight: '70px',
        boxSizing: 'border-box',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 className="chat-title" style={{
            margin: 0,
            color: 'var(--text-primary, #f1f5f9)',
            fontSize: '16px',
            fontWeight: '700',
            lineHeight: '20px',
            textAlign: 'left',
            letterSpacing: '-0.02em'
          }}>
            OmniBrowse
          </h3>
          <div className="chat-status-bar" style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginTop: '2px', alignItems: 'center' }}>
            <div className="chat-status" style={{
              fontSize: '11px',
              color: getConnectionStatusColor(),
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              lineHeight: '14px',
              fontWeight: '500'
            }}>
              {getConnectionIcon()}
              <span>{getConnectionStatusText()}</span>
            </div>
            {totalTokens > 0 && (
              <div className="token-usage" style={{
                fontSize: '10px',
                color: 'var(--accent-warning, #f59e0b)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                lineHeight: '14px',
                fontWeight: '500',
                opacity: 0.9
              }}>
                <FaCoins style={{ fontSize: '9px' }} />
                <span>{totalTokens.toLocaleString()} tokens</span>
              </div>
            )}
          </div>
        </div>
        <div className="chat-header-buttons" style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={handleNewChat}
            className="chat-header-button"
            style={{
              padding: '7px 9px',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '15px',
              color: 'var(--text-accent, #a5b4fc)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title="New Chat"
          >
            <RiChatNewFill />
          </button>

          <button
            onClick={() => navigate('/history')}
            className="chat-header-button"
            style={{
              padding: '7px 9px',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '15px',
              color: 'var(--text-accent, #a5b4fc)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title="Chat History"
          >
            <FaHistory />
          </button>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => navigate('/settings')}
              className="chat-header-button"
              style={{
                padding: '7px 9px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                color: 'var(--text-accent, #a5b4fc)',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              title="Settings"
            >
              <FaCog />
            </button>
          </div>
        </div>
      </div>

      {/* Task Status - Only if executing */}
      {isExecuting && taskStatus && <TaskStatus status={taskStatus} />}

      {/* Scrollable Messages Area */}
      <div className="messages-container" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}>
        <MessageList
          messages={messages}
          onTemplateClick={handleTemplateClick}
          onResumeExecution={handleResumeExecution}
          onApproveTask={handleApproveTask}
          onDeclineTask={handleDeclineTask}
          isTyping={isTyping}
          updateMessageState={updateMessageState}
        />
      </div>

      {/* Fixed Input at Bottom - Pass stop handler and execution state */}
      <div className="chat-input-container">
        <ChatInput
          onSendMessage={handleSendMessage}
          onStopExecution={handleStopExecution}
          isExecuting={isExecuting}
          disabled={connectionStatus !== 'connected'}
          placeholder={
            connectionStatus === 'connected'
              ? (isExecuting ? "Processing..." : "Ask me anything...")
              : "Connecting..."
          }
          value={messageInput}
          onChange={setMessageInput}
        />
      </div>
    </div>
  );
};

export default ChatInterface;