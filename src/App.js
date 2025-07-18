/*global chrome*/

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useSubscription } from './hooks/useSubscription';
import ChatInterface from './components/ChatInterface';
import AuthPage from './components/AuthPage';
import SubscriptionPage from './components/SubscriptionPage';
import SettingsModal from './components/SettingsModal';
import SubscriptionChoice from './components/SubscriptionChoice';
import ProfilePage from './components/ProfilePage';
import './App.css';

function AppContent() {
  const { isLoggedIn, user, loading, login, signup, logout } = useAuth();
  const subscription = useSubscription(user);

  // Loading state
  if (loading) {
    return (
      <div className="App" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#002550FF'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', color: '#FFDCDCFF' }}>🤖</div> 
          <div style={{ fontSize: '16px', color: '#FFDCDCFF' }}>Loading...</div>
        </div>
      </div>
    );
  }

  const handleLogin = async (credentials) => {
    if (credentials.isNewUser) {
      return await signup(credentials);
    } else {
      return await login(credentials);
    }
  };

  return (
    <Routes>
      <Route 
        path="/auth" 
        element={
          isLoggedIn ? (
            <Navigate to="/chat" replace />
          ) : (
            <AuthPage onLogin={handleLogin} />
          )
        } 
      />
      
      <Route 
        path="/chat" 
        element={
          !isLoggedIn ? (
            <Navigate to="/auth" replace />
          ) : subscription.isTrialExpired() && !subscription.usingPersonalAPI ? (
            <SubscriptionChoice 
              onSubscribe={() => window.location.hash = '/subscription'}
              onUseAPI={() => window.location.hash = '/settings'}
              onClose={() => {}}
              user={user}
            />
          ) : (
            <ChatInterface 
              user={user}
              subscription={subscription}
              onLogout={logout}
            />
          )
        } 
      />
      
      <Route 
        path="/subscription" 
        element={
          !isLoggedIn ? (
            <Navigate to="/auth" replace />
          ) : (
            <SubscriptionPage 
              onSubscribe={async (data) => {
                console.log('Subscription:', data);
                return { success: true };
              }}
              onLogout={logout}
              onOpenSettings={() => window.location.hash = '/settings'}
              user={user}
            />
          )
        } 
      />
      
      <Route 
        path="/settings" 
        element={
          !isLoggedIn ? (
            <Navigate to="/auth" replace />
          ) : (
            <SettingsModal onClose={() => window.location.hash = '/chat'} />
          )
        } 
      />

      <Route 
        path="/profile" 
        element={
          !isLoggedIn ? (
            <Navigate to="/auth" replace />
          ) : (
            <ProfilePage 
              user={user}
              subscription={subscription}
              onLogout={logout}
            />
          )
        } 
      />
      
      <Route 
        path="/" 
        element={<Navigate to={isLoggedIn ? "/chat" : "/auth"} replace />} 
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <AppContent />
      </div>
    </Router>
  );
}

export default App;