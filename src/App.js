/*global chrome*/

import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import AuthPage from './components/AuthPage';
import SubscriptionPage from './components/SubscriptionPage';
import './App.css';

function App() {
  const [authState, setAuthState] = useState({
    isLoggedIn: false,
    hasSubscription: false,
    user: null,
    loading: true
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['userAuth', 'userSubscription']);
        
        const isLoggedIn = !!(result.userAuth?.token && result.userAuth?.user);
        const hasSubscription = !!(result.userSubscription?.active && result.userSubscription?.expiresAt > Date.now());
        
        setAuthState({
          isLoggedIn,
          hasSubscription,
          user: result.userAuth?.user || null,
          loading: false
        });
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleLogin = async (credentials) => {
    // TODO: Implement actual API call
    console.log('Login attempt:', credentials);
    
    // Simulate API call for now
    const mockUser = {
      id: '123',
      email: credentials.email,
      name: credentials.name || 'User',
      isNewUser: credentials.isNewUser
    };
    
    const mockToken = 'mock-jwt-token-' + Date.now();
    
    try {
      // Store auth data
      await chrome.storage.local.set({
        userAuth: {
          token: mockToken,
          user: mockUser,
          loginTime: Date.now()
        }
      });
      
      setAuthState({
        isLoggedIn: true,
        hasSubscription: !mockUser.isNewUser, // Existing users have subscription, new users need to subscribe
        user: mockUser,
        loading: false
      });
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Failed to save login data' };
    }
  };

  const handleSubscription = async (subscriptionData) => {
    // TODO: Implement actual payment API
    console.log('Subscription attempt:', subscriptionData);
    
    try {
      // Store subscription data
      await chrome.storage.local.set({
        userSubscription: {
          active: true,
          plan: subscriptionData.plan,
          expiresAt: Date.now() + (subscriptionData.plan === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000),
          subscribedAt: Date.now()
        }
      });
      
      setAuthState(prev => ({
        ...prev,
        hasSubscription: true
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Subscription error:', error);
      return { success: false, error: 'Failed to save subscription data' };
    }
  };

  const handleLogout = async () => {
    try {
      await chrome.storage.local.remove(['userAuth', 'userSubscription']);
      setAuthState({
        isLoggedIn: false,
        hasSubscription: false,
        user: null,
        loading: false
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Loading state
  if (authState.loading) {
    return (
      <div className="App" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f0f0f0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
          <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
        </div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!authState.isLoggedIn) {
    return (
      <div className="App">
        <AuthPage onLogin={handleLogin} />
      </div>
    );
  }

  // Show subscription page if logged in but no subscription (new users)
  if (!authState.hasSubscription) {
    return (
      <div className="App">
        <SubscriptionPage 
          onSubscribe={handleSubscription}
          onLogout={handleLogout}
          user={authState.user}
        />
      </div>
    );
  }

  // Show chat interface if logged in and has subscription
  return (
    <div className="App">
      <ChatInterface 
        user={authState.user}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;