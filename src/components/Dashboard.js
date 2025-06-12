import React, { useState } from 'react';
import { isExtension } from '../utils/browserHelpers';

function Dashboard({ 
  agentStatus, 
  loading, 
  onStartAgent, 
  onStopAgent, 
  onTestTweet, 
  onTestClaude,
  onAuthorizeTwitter
}) {
  const [message, setMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleStartAgent = async () => {
    setActionLoading(true);
    setMessage('');
    try {
      const result = await onStartAgent();
      setMessage(result.success ? result.message : `Error: ${result.error}`);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopAgent = async () => {
    setActionLoading(true);
    setMessage('');
    try {
      const result = await onStopAgent();
      setMessage(result.success ? result.message : `Error: ${result.error}`);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestClaude = async () => {
    setActionLoading(true);
    setMessage('');
    try {
      const result = await onTestClaude();
      if (result.success) {
        setMessage(`Claude test successful! Generated: "${result.tweet}"`);
      } else {
        setMessage(`Claude test failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestTweet = async () => {
    setActionLoading(true);
    setMessage('');
    try {
      const result = await onTestTweet();
      if (result.success) {
        const status = result.posted ? 'posted to Twitter' : 'generated successfully';
        setMessage(`✅ Test tweet ${status}: "${result.tweet}"`);
        if (result.error) {
          setMessage(prev => prev + ` (Note: ${result.error})`);
        }
      } else {
        setMessage(`❌ Test failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Make sure this handler exists:
  const handleAuthorizeTwitter = async () => {
    setActionLoading(true);
    setMessage('');
    try {
      console.log('Dashboard: Starting Twitter authorization...');
      const result = await onAuthorizeTwitter();
      console.log('Dashboard: Authorization result:', result);
      
      if (result.success) {
        setMessage('✅ Twitter authorization successful!');
      } else if (result.needsAuth && result.authUrl) {
        setMessage(`🔐 Please complete authorization in the opened tab`);
      } else {
        setMessage(`❌ Authorization failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Dashboard: Authorization error:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const isLoading = loading || actionLoading;

  return (
    <div className="dashboard">
      <div className="status-card">
        <h2>Agent Status</h2>
        <div className={`status-indicator ${agentStatus.isRunning ? 'running' : 'stopped'}`}>
          {agentStatus.isRunning ? '🟢 Running' : '🔴 Stopped'}
        </div>
        <div className="status-details">
          <p>Agent Initialized: {agentStatus.hasAgent ? '✅' : '❌'}</p>
          <p>Anthropic API: {agentStatus.config?.hasAnthropicKey ? '✅' : '❌'}</p>
          <p>Twitter Credentials: {agentStatus.config?.hasTwitterCredentials ? '✅' : '❌'}</p>
          <p>Topics Configured: {agentStatus.config?.topicsCount || 0}</p>
          <p>Environment: {isExtension() ? 'Chrome Extension' : 'Web Application'}</p>
          {agentStatus.config?.interval && (
            <p>Interval: {agentStatus.config.interval} minutes</p>
          )}
          {agentStatus.schedules && agentStatus.schedules.length > 0 && (
            <p>Active Schedules: {agentStatus.schedules.length}</p>
          )}
        </div>
      </div>

      {!isExtension() && (
        <div className="webapp-notice">
          <h3>Web Application Mode</h3>
          <p>
            Running in web mode. Twitter posting requires Chrome extension. 
            You can test Claude AI generation and manage settings.
          </p>
        </div>
      )}

      <div className="controls">
        <button 
          onClick={handleTestClaude} 
          disabled={isLoading}
          className="btn btn-secondary"
        >
          {isLoading ? 'Testing...' : 'Test Claude AI'}
        </button>

        <button 
          onClick={handleStartAgent} 
          disabled={isLoading || agentStatus.isRunning}
          className="btn btn-success"
        >
          {isLoading ? 'Starting...' : 'Start Agent'}
        </button>
        
        <button 
          onClick={handleStopAgent} 
          disabled={isLoading || !agentStatus.isRunning}
          className="btn btn-danger"
        >
          {isLoading ? 'Stopping...' : 'Stop Agent'}
        </button>
        
        <button 
          onClick={handleTestTweet} 
          disabled={isLoading}
          className="btn btn-primary"
        >
          {isLoading ? 'Testing...' : 'Test Tweet'}
        </button>

        <button 
          onClick={handleAuthorizeTwitter} 
          disabled={isLoading}
          className="btn btn-info"
        >
          {isLoading ? 'Authorizing...' : 'Authorize Twitter (Arcade)'}
        </button>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') || message.includes('failed') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {agentStatus.schedules && agentStatus.schedules.length > 0 && (
        <div className="schedules-info">
          <h3>Active Schedules</h3>
          {agentStatus.schedules.map((schedule, index) => (
            <div key={index} className="schedule-item">
              <span>{schedule.name}</span>
              {schedule.periodInMinutes && (
                <span>Every {schedule.periodInMinutes} minutes</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;