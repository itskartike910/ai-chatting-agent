import React, { useState } from 'react';

const SubscriptionPage = ({ onSubscribe, onLogout, user }) => {
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const plans = {
    monthly: {
      name: 'Monthly',
      price: 14.99,
      period: '/month',
      features: [
        'Unlimited web automation',
        'All AI models included',
        'Priority support',
        'Regular updates'
      ]
    },
    yearly: {
      name: 'One Year',
      price: 149.99,
      period: '/year',
      originalPrice: 179.88,
      savings: 'Save $29.89',
      features: [
        'Everything in Monthly',
        '2 months FREE',
        'Priority customer support',
        'Advanced AI models',
        'Beta features access'
      ],
      recommended: true
    }
  };

  const handleSubscribe = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await onSubscribe({
        plan: selectedPlan,
        price: plans[selectedPlan].price,
        user: user
      });

      if (!result.success) {
        throw new Error(result.error || 'Subscription failed');
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleTrial = async () => {
    setError('');
    setLoading(true);

    try {
      // Start 7-day trial
      const result = await onSubscribe({
        plan: 'trial',
        price: 0,
        user: user,
        trial: true
      });

      if (!result.success) {
        throw new Error(result.error || 'Trial activation failed');
      }
    } catch (err) {
      setError(err.message);
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
    backgroundColor: '#1e293b',
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
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    color: 'white',
    textAlign: 'center'
  };

  const contentStyle = {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
    backgroundColor: '#1e293b'
  };

  const planCardStyle = (isSelected, isRecommended) => ({
    backgroundColor: isSelected ? '#374151' : '#2d3748',
    border: `2px solid ${isSelected ? '#3b82f6' : '#4a5568'}`,
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    position: 'relative',
    ...(isRecommended && {
      borderColor: '#10b981',
      boxShadow: '0 0 0 1px #10b981'
    })
  });

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
              ✨ Unleash AI's full powers with Premium
            </h3>
          </div>
        </div>
        <p style={{ margin: '8px 0 0 0', fontSize: '13px', opacity: 0.9 }}>
          Welcome, {user?.name || user?.email}!
        </p>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {/* Features */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '16px'
          }}>
            <span style={{ fontSize: '20px' }}>🎯</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>
                Explore different AI models
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Priority access to powerful models with different skills.
              </div>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '16px'
          }}>
            <span style={{ fontSize: '20px' }}>🔓</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>
                Unlock your creativity
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Access models better suited for creative tasks and content generation.
              </div>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '16px'
          }}>
            <span style={{ fontSize: '20px' }}>📝</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>
                Stay on topic
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Get more accurate answers for more nuanced conversations.
              </div>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '20px'
          }}>
            <span style={{ fontSize: '20px' }}>💬</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>
                Chat for longer
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Get higher rate limits for longer conversations.
              </div>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div style={{ marginBottom: '20px' }}>
          {Object.entries(plans).map(([key, plan]) => (
            <div
              key={key}
              onClick={() => setSelectedPlan(key)}
              style={planCardStyle(selectedPlan === key, plan.recommended)}
            >
              {plan.recommended && (
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#10b981',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: '600',
                  padding: '4px 12px',
                  borderRadius: '12px'
                }}>
                  BEST VALUE
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: 'white' }}>
                    {plan.name}
                  </div>
                  {plan.savings && (
                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '600' }}>
                      {plan.savings}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>
                    USD ${plan.price}
                    <span style={{ fontSize: '12px', fontWeight: '400' }}>
                      {plan.period}
                    </span>
                  </div>
                  {plan.originalPrice && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#94a3b8', 
                      textDecoration: 'line-through' 
                    }}>
                      ${plan.originalPrice}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '14px',
            color: '#dc2626'
          }}>
            {error}
          </div>
        )}

        {/* Trial Button */}
        <button
          onClick={handleTrial}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: loading ? '#4a5568' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '12px',
            transition: 'all 0.3s'
          }}
        >
          {loading ? '🔄 Processing...' : '🎉 Try 7 days free'}
        </button>

        {/* Subscribe Button */}
        <button
          onClick={handleSubscribe}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: loading ? '#4a5568' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '16px',
            transition: 'all 0.3s'
          }}
        >
          {loading ? '🔄 Processing...' : `💳 Subscribe ${plans[selectedPlan].name}`}
        </button>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <p style={{ 
            fontSize: '11px', 
            color: '#94a3b8',
            margin: '0 0 8px 0'
          }}>
            All subscriptions are auto-renewed but can be cancelled at any time before renewal.
          </p>
          <button 
            onClick={onLogout}
            style={{ 
              padding: '4px 8px', 
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;