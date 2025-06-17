/* eslint-disable default-case */
/* global chrome */
import { useState, useRef, useEffect } from 'react';

export const useAgent = () => {
  const [taskStatus, setTaskStatus] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const portRef = useRef(null);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.warn('Chrome runtime not available');
      return;
    }

    // Setup connection to background script
    try {
      portRef.current = chrome.runtime.connect({ name: 'popup-connection' });
      
      portRef.current.onMessage.addListener((message) => {
        switch (message.type) {
          case 'task_start':
            setIsExecuting(true);
            setTaskStatus({ status: 'starting', message: 'Task started...' });
            break;
            
          case 'status_update':
            setTaskStatus({ 
              status: 'executing', 
              message: message.message,
              task: message.task 
            });
            break;
            
          case 'task_complete':
            setIsExecuting(false);
            setTaskStatus({ status: 'completed', message: 'Task completed!' });
            break;
            
          case 'task_error':
            setIsExecuting(false);
            setTaskStatus({ status: 'error', message: message.error });
            break;
        }
      });

      portRef.current.onDisconnect.addListener(() => {
        portRef.current = null;
        setIsExecuting(false);
      });
    } catch (error) {
      console.error('Failed to connect to background script:', error);
    }

    return () => {
      if (portRef.current) {
        try {
          portRef.current.disconnect();
        } catch (error) {
          console.error('Error disconnecting port:', error);
        }
      }
    };
  }, []);

  const executeTask = async (prompt) => {
    if (isExecuting || !portRef.current) return;

    try {
      portRef.current.postMessage({
        type: 'new_task',
        task: prompt
      });
    } catch (error) {
      console.error('Error sending task:', error);
      setTaskStatus({ status: 'error', message: 'Failed to send task' });
    }
  };

  return { executeTask, taskStatus, isExecuting };
};