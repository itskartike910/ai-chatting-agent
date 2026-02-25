import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import HowToUsePage from './components/HowToUsePage';
import StartupPage from './components/StartupPage';
import './App.css';
import ChatHistoryPage from './components/ChatHistoryPage';

function AppContent() {
  const { isLoggedIn, loading, logout } = useAuth();

  // Only show loading state during initial config check
  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#002550FF',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255, 220, 220, 0.3)',
          borderTopColor: '#FFDCDCFF',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ marginTop: '16px', color: '#FFDCDCFF' }}>Loading config...</div>
      </div>
    );
  }
  return (
    <div className="App-content">
      <SettingsModal />
      <Routes>
        <Route path="/startup" element={<StartupPage />} />

        <Route
          path="/chat"
          element={!isLoggedIn ? <Navigate to="/startup" replace /> : <ChatInterface onLogout={logout} />}
        />
        <Route
          path="/history"
          element={!isLoggedIn ? <Navigate to="/startup" replace /> : <ChatHistoryPage />}
        />
        <Route
          path="/how-to-use"
          element={!isLoggedIn ? <Navigate to="/startup" replace /> : <HowToUsePage />}
        />
        <Route path="/settings" element={<SettingsModal isOpen={true} />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to={isLoggedIn ? "/chat" : "/startup"} replace />} />
      </Routes>
    </div>
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