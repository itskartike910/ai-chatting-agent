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

            {/* Background Animation Orbs */}
            <div className="background-animation">
                <div className="floating-orb chat-orb-1"></div>
                <div className="floating-orb chat-orb-2"></div>
                <div className="floating-orb chat-orb-3"></div>
            </div>

            {/* No header bar — full immersive startup */}
            <div className="startup-content" style={{ overflowY: 'auto' }}>
                <div className="logo-container">
                    <RiRobot2Fill className="startup-icon" />
                </div>

                <h1 className="startup-title">OmniBrowse</h1>
                <p className="startup-subtitle">
                    Your intelligent assistant for seamless web navigation, planning, and task execution.
                </p>

                <div className="features-grid">
                    <div className="feature-card neon-card">
                        <div className="feature-icon-wrapper">
                            <FaMagic className="feature-icon" />
                        </div>
                        <div className="feature-text">
                            <span className="feature-title">Autonomous Action</span>
                            <span className="feature-desc">Executes complex multi-step browser tasks for you.</span>
                        </div>
                    </div>

                    <div className="feature-card neon-card">
                        <div className="feature-icon-wrapper">
                            <RiSecurePaymentLine className="feature-icon" />
                        </div>
                        <div className="feature-text">
                            <span className="feature-title">Private & Secure</span>
                            <span className="feature-desc">Bring your own API keys. No middleware tracking.</span>
                        </div>
                    </div>

                    <div className="feature-card neon-card">
                        <div className="feature-icon-wrapper">
                            <RiSettings4Line className="feature-icon" />
                        </div>
                        <div className="feature-text">
                            <span className="feature-title">Fully Customizable</span>
                            <span className="feature-desc">Choose between Anthropic, OpenAI, or Gemini AI models.</span>
                        </div>
                    </div>
                </div>

                <div className="startup-actions" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: '320px'
                }}>
                    <button className="neon-btn neon-btn-subtle continue-button secondary-btn" onClick={handleHowToUse} style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        width: '100%',
                        justifyContent: 'center',
                        borderRadius: '9999px'
                    }}>
                        <FaBookOpen className="continue-icon" style={{ marginRight: '8px' }} />
                        How to Use
                    </button>
                    <button className="neon-btn continue-button" onClick={handleContinue} style={{
                        width: '100%',
                        justifyContent: 'center',
                        borderRadius: '9999px'
                    }}>
                        Configure Settings
                        <BsArrowRight className="continue-icon" style={{ marginLeft: '8px' }} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StartupPage;
