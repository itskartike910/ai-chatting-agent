export class MessageManager {
  constructor() {
    this.messages = [];
    this.maxMessages = 100;
  }

  addMessage(role, content, metadata = {}) {
    const message = {
      role,
      content,
      timestamp: Date.now(),
      id: this.generateId(),
      ...metadata
    };
    
    this.messages.push(message);
    
    // Trim old messages
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
    
    return message;
  }

  getMessages() {
    return this.messages;
  }

  getConversationHistory(limit = 10) {
    return this.messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-limit);
  }

  clearMessages() {
    this.messages = [];
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  formatForLLM(messages) {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));
  }
}