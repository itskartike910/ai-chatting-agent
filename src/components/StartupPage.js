import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMagic, FaBookOpen } from 'react-icons/fa';
import '../styles/StartupPageAnimations.css';

// Using consistent icons with the rest of the app
import { RiRobot2Fill, RiSecurePaymentLine, RiSettings4Line } from 'react-icons/ri';
import { BsArrowRight } from 'react-icons/bs';

const StartupPage = () => {
    const navigate = useNavigate();

    const handleContinue = () => {
        // Navigate straight to settings so user can input their API key
        navigate('/settings');
    };

    const handleHowToUse = () => {
        navigate('/how-to-use');
    };

    return (
        <div className="startup-container" style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            backgroundColor: '#002550FF',
            overflow: 'hidden',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            touchAction: 'manipulation'
        }}>
            {/* Background Animation Matches ChatInterface */}
            <div className="background-animation">
                <div className="floating-orb chat-orb-1"></div>
                <div className="floating-orb chat-orb-2"></div>
                <div className="floating-orb chat-orb-3"></div>
            </div>

            {/* Fixed Header */}
            <div className="chat-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                borderBottom: '1px solid #8A8A8AFF',
                background: 'linear-gradient(0deg, #002550FF 0%, #764ba2 100%)',
                flexShrink: 0,
                minHeight: '50px',
                maxHeight: '75px',
                boxSizing: 'border-box',
                zIndex: 20
            }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 className="chat-title" style={{
                        margin: 0,
                        color: '#FFDCDCFF',
                        fontSize: '15px',
                        fontWeight: '600',
                        lineHeight: '20px',
                        textAlign: 'left'
                    }}>
                        Social Shopping Agent
                    </h3>
                </div>
            </div>

            <div className="startup-content" style={{ overflowY: 'auto' }}>
                <div className="logo-container">
                    <RiRobot2Fill className="startup-icon" />
                </div>

                <h1 className="startup-title">AI Agent Assistant</h1>
                <p className="startup-subtitle">
                    Your intelligent assistant for seamless web navigation, planning, and task execution.
                </p>

                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <FaMagic className="feature-icon" />
                        </div>
                        <div className="feature-text">
                            <span className="feature-title">Autonomous Action</span>
                            <span className="feature-desc">Executes complex multi-step browser tasks for you.</span>
                        </div>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <RiSecurePaymentLine className="feature-icon" />
                        </div>
                        <div className="feature-text">
                            <span className="feature-title">Private & Secure</span>
                            <span className="feature-desc">Bring your own API keys. No middleware tracking.</span>
                        </div>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <RiSettings4Line className="feature-icon" />
                        </div>
                        <div className="feature-text">
                            <span className="feature-title">Fully Customizable</span>
                            <span className="feature-desc">Choose between Anthropic, OpenAI, or Gemini AI models.</span>
                        </div>
                    </div>
                </div>

                <div className="startup-actions" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button className="continue-button secondary-btn" onClick={handleHowToUse} style={{
                        background: 'rgba(255, 220, 220, 0.1)',
                        border: '1px solid rgba(255, 220, 220, 0.3)',
                    }}>
                        <FaBookOpen className="continue-icon" style={{ marginRight: '8px' }} />
                        How to Use
                    </button>
                    <button className="continue-button" onClick={handleContinue}>
                        Configure Settings
                        <BsArrowRight className="continue-icon" style={{ marginLeft: '8px' }} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StartupPage;
