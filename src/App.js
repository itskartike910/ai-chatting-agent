import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import useAgent from './hooks/useAgent';
import { isExtension } from './utils/browserHelpers';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { 
    agent, 
    status, 
    loading, 
    error, 
    startAgent, 
    stopAgent, 
    testTweet, 
    testClaude, 
    updateConfig ,
    postTweetViaTab
  } = useAgent();

  const handlePostTweet = async (content) => {
    if (!agent) {
      return { success: false, error: 'Agent not initialized' };
    }
    
    try {
      console.log('App: Posting tweet via tab automation...');
      return await postTweetViaTab(content); // Use the hook method
    } catch (error) {
      console.error('App: Error posting tweet:', error);
      return { success: false, error: error.message };
    }
  };

  const environment = isExtension() ? 'Chrome Extension' : 'Web Application';

  const handleAuthorizeTwitter = async () => {
    return await agent.authorizeTwitter();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI Twitter Agent</h1>
        <div className="environment-indicator">
          Running as: {environment}
        </div>
        <nav className="nav-tabs">
          <button 
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </nav>
      </header>
      
      <main className="App-main">
        {error && (
          <div className="global-error">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}
        
        {activeTab === 'dashboard' && (
          <Dashboard 
            agentStatus={status}
            loading={loading}
            onStartAgent={startAgent}
            onStopAgent={stopAgent}
            onTestTweet={testTweet}
            onTestClaude={testClaude}
            onAuthorizeTwitter={handleAuthorizeTwitter}
            postTweet={handlePostTweet}
          />
        )}
        {activeTab === 'settings' && (
          <Settings 
            onConfigUpdate={updateConfig}
          />
        )}
      </main>
    </div>
  );
}

export default App;