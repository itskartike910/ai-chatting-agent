/* global chrome */

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const AUTH_URL = API_BASE_URL.replace('/api', '');

// console.log('🌍 API Base URL:', API_BASE_URL);

class APIService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.sessionToken = null;
    this.clientId = null;
    this.ablyToken = null;
    this.encryptionKey = null;
    this._pollTimer = null;
    this._safetyTimeout = null;
    
    // console.log('🔗 APIService initialized with URL:', this.baseURL);
  }

  setSessionToken(token) {
    this.sessionToken = token;
  }

  async getStoredSessionToken() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['userAuth']);
        return result.userAuth?.sessionToken || null;
      }
    } catch (error) {
      console.error('Error getting stored session token:', error);
    }
    return null;
  }

  // ---- API helpers ----
  async _fetchMe() {
    const res = await fetch(`${this.baseURL}/user/`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user || null;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    if (!this.sessionToken) {
      this.sessionToken = await this.getStoredSessionToken();
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const config = { 
      ...options, 
      headers,
      credentials: 'include' // Include cookies for NextAuth.js
    };

    // Add session cookie if available
    if (this.sessionToken) {
      config.headers['Cookie'] = `__Secure-authjs.session-token=${this.sessionToken}`;
    }

    try {
      const response = await fetch(url, config);
      
      // Always try to get the response body for error details
      let responseData = {};
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch (parseError) {
          console.warn('Failed to parse response JSON:', parseError);
        }
      } else {
        // If not JSON, try to get text
        try {
          const text = await response.text();
          responseData = { message: text };
        } catch (textError) {
          console.warn('Failed to get response text:', textError);
        }
      }

      if (response.status === 401) {
        // For authentication endpoints, don't clear auth data immediately
        if (endpoint === '/auth/login' || endpoint === '/auth/signup') {
          const errorMessage = responseData.detail || responseData.message || 'Authentication failed';
          throw new Error(errorMessage);
        }
        
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
        // Extract the most specific error message available
        let errorMessage = 'An error occurred';
        
        if (responseData.detail) {
          errorMessage = responseData.detail;
        } else if (responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData.error) {
          errorMessage = responseData.error;
        } else {
          errorMessage = `HTTP ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }

      return responseData;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      
      // If it's already our custom error, just throw it
      if (error.message.includes('TRIAL_EXPIRED') || 
          error.message.includes('RATE_LIMITED') ||
          error.message.includes('Authentication failed') ||
          error.message.includes('detail')) {
        throw error;
      }
      
      // For network errors or other issues
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection.');
      }
      
      throw error;
    }
  }

  async clearAuthData() {
    this.sessionToken = null;
    this.clientId = null;
    this.ablyToken = null;
    this.encryptionKey = null;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove(['userAuth', 'authData']);
      }
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  // Authentication methods following the provided pattern
  async checkAuthentication() {
    try {
      const user = await this._fetchMe();
      if (user) {
        await this.saveAuthUser(user);
        return { isAuthenticated: true, user };
      }
    } catch {}
    return { isAuthenticated: false, user: null };
  }

  async saveAuthUser(user) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // Save user auth data
        await chrome.storage.local.set({
          userAuth: {
            user: user,
            isAuthenticated: true,
            timestamp: Date.now()
          }
        });

        // Also save auth data in the format expected by MultiLLMService
        if (user && user.sessionToken) {
          await chrome.storage.local.set({
            authData: {
              user: user,
              sessionToken: user.sessionToken,
              userId: user.userId || user.id,
              expires: user.expires,
              timestamp: Date.now()
            }
          });
        }
      }
    } catch (error) {
      console.error('Error saving auth user:', error);
    }
  }

  async isUserAuthenticated() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['userAuth']);
        return result.userAuth?.isAuthenticated || false;
      }
    } catch (error) {
      console.error('Error checking authentication status:', error);
    }
    return false;
  }

  async getAuthSession() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['userAuth']);
        return result.userAuth || { isAuthenticated: false, user: null };
      }
    } catch (error) {
      console.error('Error getting auth session:', error);
    }
    return { isAuthenticated: false, user: null };
  }

  async clearAuthSession() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove(['userAuth', 'authData']);
      }
    } catch (error) {
      console.error('Error clearing auth session:', error);
    }
  }

  _beginPolling() {
    this._stopPolling();
    this._pollTimer = setInterval(async () => {
      try {
        const user = await this._fetchMe();
        if (user) {
          await this.saveAuthUser(user);
          this._stopPolling();
        }
      } catch {}
    }, 2000);
    this._safetyTimeout = setTimeout(() => this._stopPolling(), 300000); // 5 min
  }

  _stopPolling() {
    if (this._pollTimer) clearInterval(this._pollTimer);
    if (this._safetyTimeout) clearTimeout(this._safetyTimeout);
    this._pollTimer = null;
    this._safetyTimeout = null;
  }

  // Chrome Extension Authentication
  async openAuthPopup() {
    try {
      if (typeof chrome !== 'undefined' && chrome.windows) {
        const popup = await chrome.windows.create({
          url: `${AUTH_URL}/ext/sign-in`,
          type: 'popup',
          width: 500,
          height: 600
        });
        return popup;
      }
    } catch (error) {
      console.error('Error opening auth popup:', error);
      throw error;
    }
  }

  // Chrome Extension Background Tab Authentication
  async openAuthBackgroundTab() {
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const tab = await chrome.tabs.create({
          url: `${AUTH_URL}/ext/sign-in`,
          active: true
        });
        return tab;
      }
    } catch (error) {
      console.error('Error opening auth background tab:', error);
      throw error;
    }
  }

  async startGitHubLogin() {
    const authUrl = `${AUTH_URL}/ext/sign-in`;
    this._beginPolling();

    // 1) Try new tab (preferred method)
    try {
      if (chrome?.tabs?.create) {
        const tab = await chrome.tabs.create({ url: authUrl, active: true });

        const closer = setInterval(async () => {
          if (await this.isUserAuthenticated()) {
            try { tab?.id && (await chrome.tabs.remove(tab.id)); } catch {}
            clearInterval(closer);
          }
        }, 2000);

        return new Promise((resolve) => {
          const check = setInterval(async () => {
            const s = await this.getAuthSession();
            if (s.isAuthenticated) { 
              clearInterval(check); 
              // Get fresh user data after authentication
              try {
                const userData = await this.getCurrentUser();
                resolve(userData);
              } catch (error) {
                console.error('Error getting user data after auth:', error);
                resolve(s.user);
              }
            }
          }, 1000);
          setTimeout(() => { clearInterval(check); resolve(null); }, 300000);
        });
      }
    } catch (e) {
      console.warn('[Auth] tabs.create failed:', e?.message || e);
    }

    // 2) Fallback: popup window
    try {
      if (chrome?.windows?.create) {
        const popup = await chrome.windows.create({ url: authUrl, type: 'popup', width: 500, height: 600 });

        const closer = setInterval(async () => {
          if (await this.isUserAuthenticated()) {
            try { popup?.id && (await chrome.windows.remove(popup.id)); } catch {}
            clearInterval(closer);
          }
        }, 2000);

        return new Promise((resolve) => {
          const check = setInterval(async () => {
            const s = await this.getAuthSession();
            if (s.isAuthenticated) { 
              clearInterval(check); 
              // Get fresh user data after authentication
              try {
                const userData = await this.getCurrentUser();
                resolve(userData);
              } catch (error) {
                console.error('Error getting user data after auth:', error);
                resolve(s.user);
              }
            }
          }, 1000);
          setTimeout(() => { clearInterval(check); resolve(null); }, 300000);
        });
      }
    } catch (e) {
      console.warn('[Auth] windows.create failed:', e?.message || e);
    }

    // 3) Manual link case — caller should show `${AUTH_URL}/ext/sign-in`
    console.warn('[Auth] No extension window/tab APIs available. Show manual link.');
    return null;
  }

  async checkAuthStatus() {
    try {
      if (typeof chrome !== 'undefined' && chrome.cookies) {
        const cookie = await chrome.cookies.get({
          url: AUTH_URL,
          name: '__Secure-authjs.session-token'
        });
        
        if (cookie) {
          this.sessionToken = cookie.value;
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking auth status:', error);
      return false;
    }
  }

  // User Management APIs
  async getCurrentUser() {
    const response = await this.makeRequest('/user/');
    return response.user;
  }

  // Organization Management APIs
  async getOrganizationsForPrice(priceId) {
    return await this.makeRequest(`/products/${priceId}/organizations/`);
  }

  async createOrganizationForPrice(priceId, organizationData) {
    return await this.makeRequest(`/products/${priceId}/organizations/`, {
      method: 'POST',
      body: JSON.stringify(organizationData)
    });
  }

  // Mobile Streaming APIs
  async createStreamingSession() {
    const response = await this.makeRequest('/streamMobile/createSession/', {
      method: 'POST'
    });
    
    if (response.success) {
      this.clientId = response.clientId;
    }
    
    return response;
  }

  async getStreamingToken() {
    if (!this.clientId) {
      throw new Error('Client ID not available. Create a streaming session first.');
    }

    const response = await this.makeRequest('/streamMobile/getToken/', {
      method: 'POST',
      body: JSON.stringify({ clientId: this.clientId })
    });

    if (response.success) {
      this.ablyToken = response.tokenRequest;
      this.encryptionKey = response.encryptionKey;
    }

    return response;
  }

  async startAIChat(prompt, orgId) {
    if (!this.clientId) {
      throw new Error('Client ID not available. Create a streaming session first.');
    }

    return await this.makeRequest('/streamMobile/startChat/', {
      method: 'POST',
      body: JSON.stringify({
        prompt: prompt,
        clientId: this.clientId,
        orgId: orgId
      })
    });
  }

  // LLM Generate API for AI content generation using DeepHUD API
  async generateContent(prompt, options = {}) {
    try {
      // Get authentication data from chrome.storage.local
      const authData = await new Promise((resolve) => {
        chrome.storage.local.get(['authData'], (result) => {
          resolve(result.authData || null);
        });
      });

      if (!authData) {
        throw new Error('Authentication data not found. Please sign in first.');
      }

      // Get user's organization for the default price ID
      const priceId = process.env.REACT_APP_PRICE_ID;
      const orgResponse = await fetch(`${this.baseURL}/products/${priceId}/organizations/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `__Secure-authjs.session-token=${authData.sessionToken}`
        },
        credentials: 'include'
      });

      if (!orgResponse.ok) {
        throw new Error(`Failed to get organization: ${orgResponse.status}`);
      }

      const orgData = await orgResponse.json();
      const organizations = orgData.organizations || [];
      
      if (organizations.length === 0) {
        throw new Error('No organizations found. Please create an organization first.');
      }

      // Use the first active organization
      const activeOrg = organizations.find(org => org.isActive) || organizations[0];
      
      // Create streaming session
      const sessionResponse = await fetch(`${this.baseURL}/streamMobile/createSession/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `__Secure-authjs.session-token=${authData.sessionToken}`
        },
        credentials: 'include'
      });

      if (!sessionResponse.ok) {
        throw new Error(`Failed to create session: ${sessionResponse.status}`);
      }

      const sessionData = await sessionResponse.json();
      const clientId = sessionData.clientId;

      // Start AI chat session
      const chatResponse = await fetch(`${this.baseURL}/streamMobile/startChat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `__Secure-authjs.session-token=${authData.sessionToken}`
        },
        credentials: 'include',
        body: JSON.stringify({
          prompt: prompt,
          clientId: clientId,
          orgId: activeOrg.id
        })
      });

      if (!chatResponse.ok) {
        throw new Error(`Failed to start chat: ${chatResponse.status}`);
      }

      const chatData = await chatResponse.json();
      
      // For now, return a success message since the actual response comes via Ably streaming
      // In a full implementation, you would need to set up Ably subscription to get the streaming response
      return `AI chat session started successfully. Response will be streamed via Ably channel: llm-response-${clientId}`;
      
    } catch (error) {
      console.error('DeepHUD LLM API error:', error);
      throw error;
    }
  }

  // Legacy methods for backward compatibility
  async signup(userData) {
    // For Chrome extension, we'll use the popup authentication
    throw new Error('Please use the authentication popup for signup');
  }

  async login(credentials) {
    // For Chrome extension, we'll use the popup authentication
    throw new Error('Please use the authentication popup for login');
  }

  async getUserSubscription() {
    // This will be handled through organization management
    // For now, return a default structure
    return {
      status: 'active',
      plan_type: 'free_trial',
      monthly_request_limit: 100,
      requests_used: 0,
      remaining_requests: 100,
      trial_end: null
    };
  }

  async getUsageStats() {
    // This will be handled through organization management
    return {
      monthly_limit: 100,
      requests_used: 0
    };
  }

  // Helper methods for streaming
  getClientId() {
    return this.clientId;
  }

  getAblyToken() {
    return this.ablyToken;
  }

  getEncryptionKey() {
    return this.encryptionKey;
  }

  async logout() {
    // optionally: await fetch(`${this.baseURL}/auth/logout`, { method:'POST', credentials:'include' });
    await this.clearAuthSession();
    return { success: true };
  }

  async isAuthenticated() {
    return this.isUserAuthenticated();
  }

  async getUser() {
    const s = await this.getAuthSession();
    return s.user;
  }
}

const apiService = new APIService();
export default apiService; 