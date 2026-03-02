import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaRobot, FaShoppingCart, FaSearch, FaShieldAlt, FaLightbulb, FaComments, FaCode } from 'react-icons/fa';
import '../styles/StartupPageAnimations.css';

const HowToUsePage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/chat');
  };

  return (
    <div className="startup-container" style={{
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

      {/* Background Glows */}
      <div className="bg-glow glow-top"></div>
      <div className="bg-glow glow-bottom"></div>
      <div className="bg-glow glow-center"></div>

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

      {/* Background Animation */}
      <div className="background-animation">
        <div className="floating-orb chat-orb-1"></div>
        <div className="floating-orb chat-orb-2"></div>
        <div className="floating-orb chat-orb-3"></div>
      </div>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
        background: 'var(--gradient-header, linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%))',
        flexShrink: 0,
        minHeight: '52px',
        maxHeight: '70px',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 10,
        backdropFilter: 'blur(12px)',
      }}>
        <button
          onClick={handleBack}
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
            transition: 'all 0.2s ease',
          }}
          title="Back"
        >
          <FaArrowLeft />
        </button>

        <div style={{ minWidth: 0, flex: 1, textAlign: 'center' }}>
          <h1 className="shimmer-text" style={{
            margin: 0,
            fontSize: '17px',
            fontWeight: '700',
            lineHeight: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            letterSpacing: '-0.02em',
          }}>
            <FaRobot />
            HOW TO USE
          </h1>
          <p style={{
            margin: '2px 0 0 0',
            color: 'var(--text-secondary, rgba(241,245,249,0.65))',
            fontSize: '11px',
            lineHeight: '14px',
          }}>
            Learn how to use your AI agent
          </p>
        </div>

        <div style={{ width: '35px' }} />
      </div>

      {/* Content */}
      <div className="startup-content" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        position: 'relative',
        zIndex: 1,
        alignItems: 'stretch',
        justifyContent: 'flex-start'
      }}>
        {/* Introduction */}
        <div className="how-to-use-section neon-card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px'
          }}>
            <FaRobot style={{ color: 'var(--accent-tertiary, #06b6d4)', fontSize: '18px', filter: 'drop-shadow(0 0 8px rgba(6,182,212,0.5))' }} />
            <h2 className="shimmer-text" style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: '700',
              letterSpacing: '-0.02em'
            }}>
              Welcome to OmniBrowse
            </h2>
          </div>
          <p style={{
            margin: 0,
            color: 'var(--text-secondary, rgba(241,245,249,0.7))',
            fontSize: '13px',
            lineHeight: '1.5'
          }}>
            OmniBrowse is your intelligent companion for web automation, shopping, social media tasks, and more.
            Simply describe what you want to do, and our AI will handle the rest.
          </p>
        </div>

        {/* Getting Started */}
        <div className="how-to-use-section neon-card">
          <h3 className="section-title">
            <FaLightbulb className="section-title-icon" style={{ color: '#f59e0b' }} />
            <span className="shimmer-text">Getting Started</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="step-item">
              <div className="step-badge">1</div>
              <div>
                <h4 style={{
                  margin: '0 0 3px 0',
                  color: 'var(--text-primary, #f1f5f9)',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  Type Your Request
                </h4>
                <p style={{
                  margin: 0,
                  color: 'var(--text-secondary, rgba(241,245,249,0.6))',
                  fontSize: '12px',
                  lineHeight: '1.4'
                }}>
                  Simply type what you want to do in the chat input. Be specific about your goals.
                </p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-badge">2</div>
              <div>
                <h4 style={{
                  margin: '0 0 3px 0',
                  color: 'var(--text-primary, #f1f5f9)',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  AI Analyzes & Plans
                </h4>
                <p style={{
                  margin: 0,
                  color: 'var(--text-secondary, rgba(241,245,249,0.6))',
                  fontSize: '12px',
                  lineHeight: '1.4'
                }}>
                  Our AI analyzes your request and creates a step-by-step plan to accomplish your goal.
                </p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-badge">3</div>
              <div>
                <h4 style={{
                  margin: '0 0 3px 0',
                  color: 'var(--text-primary, #f1f5f9)',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  Watch It Work
                </h4>
                <p style={{
                  margin: 0,
                  color: 'var(--text-secondary, rgba(241,245,249,0.6))',
                  fontSize: '12px',
                  lineHeight: '1.4'
                }}>
                  The AI executes the plan automatically, navigating websites and completing tasks for you.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What You Can Do */}
        <div className="how-to-use-section neon-card">
          <h3 className="section-title">
            <span className="shimmer-text">What You Can Do</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="capability-item">
              <FaShoppingCart className="capability-icon" />
              <div>
                <h4 style={{ margin: '0 0 3px 0', color: 'var(--text-primary, #f1f5f9)', fontSize: '13px', fontWeight: '600' }}>
                  Shopping & E-commerce
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary, rgba(241,245,249,0.6))', fontSize: '12px', lineHeight: '1.4' }}>
                  Find products, compare prices, add to cart, and complete purchases.
                </p>
              </div>
            </div>
            <div className="capability-item">
              <FaSearch className="capability-icon" />
              <div>
                <h4 style={{ margin: '0 0 3px 0', color: 'var(--text-primary, #f1f5f9)', fontSize: '13px', fontWeight: '600' }}>
                  Research & Information
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary, rgba(241,245,249,0.6))', fontSize: '12px', lineHeight: '1.4' }}>
                  Search for information, analyze content, and gather data.
                </p>
              </div>
            </div>
            <div className="capability-item">
              <FaRobot className="capability-icon" />
              <div>
                <h4 style={{ margin: '0 0 3px 0', color: 'var(--text-primary, #f1f5f9)', fontSize: '13px', fontWeight: '600' }}>
                  Social Media Tasks
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary, rgba(241,245,249,0.6))', fontSize: '12px', lineHeight: '1.4' }}>
                  Post content, manage accounts, and interact with platforms.
                </p>
              </div>
            </div>
            <div className="capability-item">
              <FaCode className="capability-icon" />
              <div>
                <h4 style={{ margin: '0 0 3px 0', color: 'var(--text-primary, #f1f5f9)', fontSize: '13px', fontWeight: '600' }}>
                  Current Page Analysis
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary, rgba(241,245,249,0.6))', fontSize: '12px', lineHeight: '1.4' }}>
                  Analyze any webpage content, extract information, and answer questions about the current page.
                </p>
              </div>
            </div>
            <div className="capability-item">
              <FaComments className="capability-icon" />
              <div>
                <h4 style={{ margin: '0 0 3px 0', color: 'var(--text-primary, #f1f5f9)', fontSize: '13px', fontWeight: '600' }}>
                  Interactive Chat
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary, rgba(241,245,249,0.6))', fontSize: '12px', lineHeight: '1.4' }}>
                  Have conversations with the AI about any topic, get explanations, and receive intelligent responses.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Example Commands */}
        <div className="how-to-use-section neon-card">
          <h3 className="section-title">
            <FaLightbulb className="section-title-icon" style={{ color: '#f59e0b' }} />
            <span className="shimmer-text">Example Commands</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="command-block">
              <code>"Find iPhone 15 Pro on Amazon and add to cart"</code>
            </div>
            <div className="command-block">
              <code>"Search for AI tutorials on YouTube and play the first one"</code>
            </div>
            <div className="command-block">
              <code>"Post a tweet about artificial intelligence"</code>
            </div>
            <div className="command-block">
              <code>"Summarize the main points of this article"</code>
            </div>
            <div className="command-block">
              <code>"Explain how machine learning works in simple terms"</code>
            </div>
          </div>
        </div>

        {/* Safety & Privacy */}
        <div className="how-to-use-section neon-card">
          <h3 className="section-title">
            <FaShieldAlt className="section-title-icon" style={{ color: '#10b981' }} />
            <span className="shimmer-text">Safety & Privacy</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p className="privacy-item">
              • <strong>Secure:</strong> All interactions are encrypted and your data is protected
            </p>
            <p className="privacy-item">
              • <strong>Approval Required:</strong> Sensitive actions like purchases require your explicit approval
            </p>
            <p className="privacy-item">
              • <strong>Transparent:</strong> You can see exactly what the AI is doing at each step
            </p>
            <p className="privacy-item">
              • <strong>Controllable:</strong> You can pause, resume, or cancel any task at any time
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowToUsePage;
