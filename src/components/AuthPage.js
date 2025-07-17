import React, { useState } from 'react';

const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!formData.email || !formData.password) {
        throw new Error('Email and password are required');
      }

      if (!isLogin) {
        if (!formData.name) {
          throw new Error('Name is required for signup');
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
      }

      const credentials = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        isNewUser: !isLogin
      };

      const result = await onLogin(credentials);
      
      if (!result.success) {
        throw new Error(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    width: '100vw',
    height: '100vh',
    maxWidth: '500px',
    maxHeight: '600px',
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
    touchAction: 'manipulation'
  };

  const headerStyle = {
    padding: '0px 10px 0px 10px',
    textAlign: 'center',
    background: 'linear-gradient(0deg, #002550FF 0%, #764ba2 100%)',
    color: 'white'
  };

  const contentStyle = {
    flex: 1,
    padding: '20px',
    overflowY: 'auto'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '2px solid #FFFFFFFF',
    fontSize: '16px',
    color: '#FFDCDCFF',
    placeholder: '#FFDCDCFF',
    marginBottom: '16px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    backgroundColor: '#003A7CFF',
    transition: 'border-color 0.3s',
    userSelect: 'text',
    WebkitUserSelect: 'text'
  };

  const passwordContainerStyle = {
    position: 'relative',
    marginBottom: '16px'
  };

  const eyeButtonStyle = {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#FFDCDCFF',
    cursor: 'pointer',
    fontSize: '20px',
    padding: '5px'
  };

  const buttonStyle = {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid #FFCFCFFF',
    fontSize: '16px',
    fontWeight: '600',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s',
    marginBottom: '20px'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: loading ? '#94a3b8' : '#3B83F6FF',
    color: '#FFFFFFFF'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: 'transparent',
    color: '#FFFFFFFF',
    border: '1px solid #FFCFCFFF'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ fontSize: '40px', marginBottom: '5px', cursor: 'pointer' }}>
          <span style={{ display: 'inline-block', animation: 'cursor-track 3s infinite' }}>🤖</span>
          <style>{`
            @keyframes cursor-track {
              0%, 100% { transform: translateX(-5px); }
              50% { transform: translateX(5px); }
            }`}
          </style>
        </div>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>
          AI CHAT AGENT
        </h2>
        <p style={{ margin: '5px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
          Your intelligent web automation companion
        </p>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#FFDCDCFF',
            margin: '0 0 5px 0'
          }}>
            {isLogin ? 'Welcome Back!' : 'Create Account'}
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: '#FFDCDCFF',
            margin: 0
          }}>
            {isLogin ? 'Sign in to continue using AI Chat Agent' : 'Join thousands of users automating their web tasks'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              style={inputStyle}
              disabled={loading}
            />
          )}
          
          <input
            type="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            style={inputStyle}
            disabled={loading}
          />
          
          <div style={passwordContainerStyle}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              style={{...inputStyle, marginBottom: 0}}
              disabled={loading}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={eyeButtonStyle}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>

          {!isLogin && (
            <div style={passwordContainerStyle}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                style={{...inputStyle, marginBottom: 0}}
                disabled={loading}
              />
              <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={eyeButtonStyle}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '14px',
              color: '#dc2626'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={primaryButtonStyle}
            disabled={loading}
          >
            {loading ? '🔄 Processing...' : (isLogin ? '🚀 Sign In' : '✨ Create Account')}
          </button>
        </form>

        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
            setFormData({
              email: '',
              password: '',
              name: '',
              confirmPassword: ''
            });
          }}
          style={secondaryButtonStyle}
          disabled={loading}
        >
          {isLogin ? '📝 Need an account? Sign Up' : '🔑 Already have an account? Sign In'}
        </button>

        <div style={{
          marginTop: '10px',
          padding: '10px',
          backgroundColor: '#FFF9C3FF',
          borderRadius: '10px',
          border: '1px solid #FFFFFFFF'
        }}>
          <div style={{ fontSize: '12px', color: '#000000FF', textAlign: 'center' }}>
            <p style={{ margin: '0 0 6px 0' }}>
              ✨ <strong>New users get a 7-day free trial!</strong>
            </p>
            <p style={{ margin: 0 }}>
              🔒 Your data is secure and encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;