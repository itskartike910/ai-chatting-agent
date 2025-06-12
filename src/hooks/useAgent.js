import { useState, useEffect } from 'react';
import BrowserTwitterAgent from '../agents/browserTwitterAgent';
import BrowserStorage from '../services/storage/browserStorage';

const useAgent = () => {
  const [agent, setAgent] = useState(null);
  const [storage] = useState(new BrowserStorage()); // Add this line
  const [status, setStatus] = useState({
    isRunning: false,
    hasAgent: false,
    config: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAgent = async () => {
      const newAgent = new BrowserTwitterAgent();
      setAgent(newAgent);
      await updateStatus(newAgent);
    };
    
    initAgent();
  }, []);

  const updateStatus = async (agentInstance = agent) => {
    if (agentInstance) {
      const newStatus = await agentInstance.getStatus();
      setStatus(newStatus);
    }
  };

  const startAgent = async () => {
    if (!agent) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get current config before starting
      const currentConfig = await storage.getConfig();
      
      console.log('Starting agent with config:', currentConfig);
      
      // CRITICAL: Initialize the agent with config first
      const initResult = await agent.initialize();
      console.log('useAgent: Agent initialization result:', initResult);
      
      if (!initResult.success) {
        throw new Error(initResult.error || 'Agent initialization failed');
      }
      
      const result = await agent.start(currentConfig);
      if (result.success) {
        await updateStatus();
      } else {
        setError(result.error);
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const stopAgent = async () => {
    if (!agent) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await agent.stop();
      if (result.success) {
        await updateStatus();
      } else {
        setError(result.error);
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const testTweet = async () => {
    if (!agent) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await agent.testTweet();
      if (!result.success) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const testClaude = async () => {
    if (!agent) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await agent.testClaude();
      if (!result.success) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newConfig) => {
    if (!agent) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await agent.updateConfig(newConfig);
      if (result.success) {
        await updateStatus();
      } else {
        setError(result.error);
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    agent,
    status,
    loading,
    error,
    startAgent,
    stopAgent,
    testTweet,
    testClaude,
    updateConfig,
    updateStatus
  };
};

export default useAgent;