/* global chrome */
import { useState, useEffect, useCallback } from 'react';
import { useChatHistory } from './useChatHistory';

export const useChat = (chatId = null) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentChatId, setCurrentChatId] = useState(chatId);
  const { saveChatHistory, getChatHistory, updateChatHistory } = useChatHistory();

  useEffect(() => {
    if (chatId) {
      loadChatFromHistory(chatId);
    } else {
      setLoading(false);
    }
  }, [chatId]);

  const loadChatFromHistory = useCallback(async (id) => {
    try {
      setLoading(true);
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['chatHistories']);
        const histories = result.chatHistories || [];
        const chatHistory = histories.find(chat => chat.id === id);
        
        if (chatHistory && chatHistory.messages) {
          setMessages(chatHistory.messages);
          setCurrentChatId(id);
          console.log('Loaded chat history:', chatHistory.title, 'with', chatHistory.messages.length, 'messages');
        } else {
          console.warn('Chat history not found for ID:', id);
          setMessages([]);
          setCurrentChatId(null);
        }
      }
    } catch (error) {
      console.error('Error loading chat from history:', error);
      setMessages([]);
      setCurrentChatId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const addMessage = useCallback((message) => {
    const newMessage = {
      ...message,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      timestamp: message.timestamp || Date.now()
    };
    
    setMessages(prev => {
      const updated = [...prev, newMessage];
      const limited = updated.slice(-100);
      
      return limited;
    });
  }, []);

  const clearMessages = useCallback(async () => {
    setMessages([]);
    setCurrentChatId(null);
  
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove(['chatHistory']);
      }
    } catch (error) {
      console.error('Error clearing current chat:', error);
    }
  }, []);

  const updateMessage = useCallback((messageId, updates) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  // Manual save function (called only when explicitly needed)
  const saveCurrentChat = useCallback(async () => {
    if (messages.length >= 2) {
      const userMessages = messages.filter(msg => msg.type === 'user' || msg.type === 'assistant');
      if (userMessages.length >= 2) {
        if (currentChatId) {
          await updateChatHistory(currentChatId, messages);
        } else {
          const newChatId = await saveChatHistory(messages);
          if (newChatId) {
            setCurrentChatId(newChatId);
          }
        }
      }
    }
  }, [messages, currentChatId, updateChatHistory, saveChatHistory]);

  return { 
    messages, 
    addMessage, 
    clearMessages, 
    updateMessage,
    loading,
    currentChatId,
    saveCurrentChat
  };
};