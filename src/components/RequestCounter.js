import React, { useState, useEffect } from 'react';
import { FaCrown, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import apiService from '../services/api';

const RequestCounter = ({ subscriptionState, onUpgradeClick }) => {
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsageData();
  }, []);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      
      // Get user's organizations to determine current plan
      const priceId = process.env.REACT_APP_PRICE_ID;
      const priceIds = [priceId];
      const orgPromises = priceIds.map(priceId => 
        apiService.getOrganizationsForPrice(priceId).catch((error) => {
          console.log(`RequestCounter: Organization fetch failed for ${priceId}:`, error.message);
          return null;
        })
      );
      
      const results = await Promise.all(orgPromises);
      const allOrgs = results.filter(result => result).flatMap(result => result.organizations || []);
      const activeOrg = allOrgs.find(org => org.isActive && org.subscriptionStatus === 'active');
      
      if (activeOrg) {
        // For now, we'll use a default quota based on subscription type
        // In a real implementation, you'd get this from the API
        const quotas = {
          'Free': { limit: 100, used: 0 },
          'Paid': { limit: 1000, used: 0 },
          'Trial': { limit: 1000, used: 0 }
        };
        
        const quota = quotas[activeOrg.subscriptionType] || quotas['Free'];
        setUsageData({
          plan: activeOrg.subscriptionType,
          limit: quota.limit,
          used: quota.used,
          remaining: quota.limit - quota.used,
          status: activeOrg.subscriptionStatus
        });
      } else {
        // Default to free plan
        setUsageData({
          plan: 'Free',
          limit: 100,
          used: 0,
          remaining: 100,
          status: 'active'
        });
      }
      
    } catch (error) {
      console.error('Error loading usage data:', error);
      setError('Failed to load usage information');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    if (loading) return null;
    
    const percentage = usageData ? (usageData.used / usageData.limit) * 100 : 0;
    
    if (percentage >= 90) {
      return <FaExclamationTriangle style={{ color: '#FF6B6B' }} />;
    } else if (usageData?.plan === 'Free') {
      return <FaCrown style={{ color: '#FFD93D' }} />;
    } else {
      return <FaCheckCircle style={{ color: '#4CAF50' }} />;
    }
  };

  const handleClick = () => {
    if (usageData?.plan === 'Free' || (usageData?.remaining / usageData?.limit) < 0.1) {
      // Open subscription page in new tab
      window.open('https://nextjs-app-410940835135.us-central1.run.app/pricing', '_blank');
    } else {
      onUpgradeClick?.();
    }
  };

  const getTooltipText = () => {
    if (loading) return 'Loading usage information...';
    if (error) return 'Error loading usage data';
    
    const percentage = usageData ? (usageData.used / usageData.limit) * 100 : 0;
    
    if (percentage >= 90) {
      return `Warning: ${Math.round(percentage)}% of requests used. Consider upgrading.`;
    } else if (usageData?.plan === 'Free') {
      return `Free plan: ${usageData.remaining} requests remaining. Upgrade for more!`;
    } else {
      return `${usageData?.plan} plan: ${usageData?.remaining} requests remaining`;
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          border: '1px solid transparent',
          borderTop: '1px solid #FF6B6B',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: '12px', color: 'rgba(255, 220, 220, 0.7)' }}>Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}>
        <FaExclamationTriangle style={{ color: '#FF6B6B', fontSize: '12px' }} />
        <span style={{ fontSize: '12px', color: '#FF6B6B' }}>Error</span>
      </div>
    );
  }

  const percentage = usageData ? (usageData.used / usageData.limit) * 100 : 0;
  const isLow = percentage >= 90;
  const isFree = usageData?.plan === 'Free';

  return (
    <div
      className={`request-counter ${isLow ? 'low' : ''}`}
      onClick={handleClick}
      title={getTooltipText()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        backgroundColor: isLow 
          ? 'rgba(220, 53, 69, 0.1)' 
          : isFree 
            ? 'rgba(255, 217, 61, 0.1)' 
            : 'rgba(255, 255, 255, 0.05)',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: isLow 
          ? '1px solid rgba(220, 53, 69, 0.3)' 
          : isFree 
            ? '1px solid rgba(255, 217, 61, 0.3)' 
            : '1px solid rgba(255, 255, 255, 0.1)'
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = 'translateY(-1px)';
        e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = 'none';
      }}
    >
      {getIcon()}
      <span style={{ 
        fontSize: '11px', 
        color: isLow 
          ? '#FF6B6B' 
          : isFree 
            ? '#FFD93D' 
            : 'rgba(255, 220, 220, 0.8)',
        fontWeight: isLow || isFree ? '600' : '400'
      }}>
        {usageData?.remaining || 0} requests
      </span>
    </div>
  );
};

export default RequestCounter; 