/* global chrome */

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// console.log('🌍 API Base URL:', API_BASE_URL);

class APIService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
    
    // console.log('🔗 APIService initialized with URL:', this.baseURL);
  }

  setToken(token) {
    this.token = token;
  }

  async getStoredToken() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['userAuth']);
        return result.userAuth?.access_token || null;
      }
    } catch (error) {
      console.error('Error getting stored token:', error);
    }
    return null;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    if (!this.token) {
      this.token = await this.getStoredToken();
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = { ...options, headers };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        await this.clearAuthData();
        throw new Error('Authentication failed. Please log in again.');
      }

      if (response.status === 402) {
        throw new Error('TRIAL_EXPIRED');
      }

      if (response.status === 429) {
        throw new Error('RATE_LIMITED');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  async clearAuthData() {
    this.token = null;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove(['userAuth']);
      }
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  async signup(userData) {
    return await this.makeRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: userData.email,
        username: userData.username || userData.email.split('@')[0],
        password: userData.password,
        full_name: userData.name || userData.full_name
      })
    });
  }

  async login(credentials) {
    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      })
    });

    if (response.access_token) {
      this.token = response.access_token;
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
          userAuth: {
            access_token: response.access_token,
            token_type: response.token_type || 'bearer',
            loginTime: Date.now(),
            tokenExpiry: Date.now() + (30 * 24 * 60 * 60 * 1000)
          }
        });
      }
    }

    return response;
  }

  async getCurrentUser() {
    return await this.makeRequest('/users/me');
  }

  async getUserSubscription() {
    return await this.makeRequest('/users/me/subscription');
  }

  async generateContent(prompt, options = {}) {
    return await this.makeRequest('/gemini/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: options.max_tokens || 150,
        temperature: options.temperature || 0.7,
        ...options
      })
    });
  }

  async getUsageStats() {
    return await this.makeRequest('/gemini/usage');
  }
}

const apiService = new APIService();
export default apiService; 