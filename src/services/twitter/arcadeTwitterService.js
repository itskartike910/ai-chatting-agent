/* global chrome */
import { Arcade } from "@arcadeai/arcadejs";

class ArcadeTwitterService {
  constructor() {
    this.client = null;
    this.isInitialized = false;
    this.toolName = "X.PostTweet";
    this.userId = null;
    this.xProvider = null;
  }

  async initialize(config) {
    try {
      console.log('ArcadeTwitterService: Starting initialization...');
      console.log('ArcadeTwitterService: Config received:', {
        hasApiKey: !!config.arcadeApiKey,
        userId: config.arcadeUserId,
        xProvider: config.arcadeXProvider,
        useArcade: config.useArcade
      });
      
      if (!config.arcadeApiKey) {
        console.log('ArcadeTwitterService: No API key provided');
        return { success: false, error: 'Arcade API key is required' };
      }

      if (config.useArcade === false) {
        console.log('ArcadeTwitterService: Arcade disabled in config');
        return { success: false, error: 'Arcade disabled in configuration' };
      }

      // Initialize Arcade client
      console.log('ArcadeTwitterService: Creating Arcade client...');
      this.client = new Arcade({ 
        apiKey: config.arcadeApiKey.trim() // Remove any whitespace
      });
      
      this.userId = config.arcadeUserId || config.twitter?.username || "default-user";
      this.xProvider = config.arcadeXProvider || "x";
      this.isInitialized = true;
      
      console.log('ArcadeTwitterService: Initialization successful');
      console.log('ArcadeTwitterService: Settings:', {
        userId: this.userId,
        xProvider: this.xProvider,
        clientCreated: !!this.client
      });
      
      return { success: true, message: 'Arcade Twitter service initialized' };
      
    } catch (error) {
      console.error('ArcadeTwitterService: Initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  async authorizeTwitter() {
    try {
      console.log('ArcadeTwitterService: Starting Twitter authorization...');
      
      if (!this.isInitialized || !this.client) {
        console.error('ArcadeTwitterService: Service not initialized');
        return { success: false, error: 'Arcade service not initialized' };
      }

      console.log('ArcadeTwitterService: Calling client.tools.authorize with:', {
        toolName: this.toolName,
        userId: this.userId
      });
      
      // CHANGE: Use tools.authorize() instead of auth.start()
      const authResponse = await this.client.tools.authorize({
        tool_name: this.toolName,
        user_id: this.userId,
      });

      console.log('ArcadeTwitterService: Auth response:', authResponse);

      if (authResponse.status !== "completed") {
        console.log('ArcadeTwitterService: Authorization required, opening URL:', authResponse.url);
        
        // Open authorization URL in new tab
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.create({ url: authResponse.url });
        } else {
          window.open(authResponse.url, '_blank');
        }
        
        return {
          success: false,
          needsAuth: true,
          authUrl: authResponse.url,
          message: 'Twitter authorization required - please complete in opened tab'
        };
      }

      console.log('ArcadeTwitterService: Twitter already authorized');
      return { success: true, message: 'Twitter authorization completed' };
      
    } catch (error) {
      console.error('ArcadeTwitterService: Authorization error:', error);
      return { success: false, error: error.message };
    }
  }

  async postTweet(content, credentials) {
    try {
      console.log('ArcadeTwitterService: Attempting to post tweet:', content);
      
      if (!this.isInitialized || !this.client) {
        console.error('ArcadeTwitterService: Service not initialized');
        return {
          success: false,
          error: 'Arcade service not initialized',
          posted: false
        };
      }

      // CHANGE: Use tools.authorize() instead of auth.start()
      console.log('ArcadeTwitterService: Checking tool authorization...');
      const authResponse = await this.client.tools.authorize({
        tool_name: this.toolName,
        user_id: this.userId,
      });

      if (authResponse.status !== "completed") {
        console.log('ArcadeTwitterService: Tool authorization required');
        return {
          success: false,
          needsAuth: true,
          authUrl: authResponse.url,
          message: 'Twitter tool authorization required before posting'
        };
      }

      // Wait for completion if needed
      if (authResponse.status === "pending") {
        console.log('ArcadeTwitterService: Waiting for tool authorization completion...');
        await this.client.auth.waitForCompletion(authResponse);
      }

      // Post tweet using Arcade
      console.log('ArcadeTwitterService: Executing tweet post...');
      const response = await this.client.tools.execute({
        tool_name: this.toolName,
        input: {
          tweet_text: content
        },
        user_id: this.userId,
      });

      console.log('ArcadeTwitterService: Post response:', response);

      if (response.success || response.status === 'success' || response.output) {
        return {
          success: true,
          posted: true,
          message: 'Tweet posted successfully via Arcade',
          content: content,
          arcadeResponse: response
        };
      } else {
        return {
          success: false,
          posted: false,
          error: response.error || response.message || 'Arcade posting failed',
          arcadeResponse: response
        };
      }

    } catch (error) {
      console.error('ArcadeTwitterService: Posting error:', error);
      return {
        success: false,
        error: error.message,
        posted: false
      };
    }
  }

  async checkTwitterAuth() {
    try {
      if (!this.isInitialized || !this.client) {
        return { authorized: false, error: 'Service not initialized' };
      }

      console.log('ArcadeTwitterService: Checking auth status...');
      // CHANGE: Use tools.authorize() instead of auth.start()
      const authResponse = await this.client.tools.authorize({
        tool_name: this.toolName,
        user_id: this.userId,
      });

      console.log('ArcadeTwitterService: Auth check response:', authResponse);

      return {
        authorized: authResponse.status === "completed",
        authUrl: authResponse.status !== "completed" ? authResponse.url : null,
        status: authResponse.status,
        token: authResponse.status === "completed" ? authResponse.context?.token : null
      };

    } catch (error) {
      console.error('ArcadeTwitterService: Auth check error:', error);
      return { authorized: false, error: error.message };
    }
  }

  async checkLogin() {
    const authStatus = await this.checkTwitterAuth();
    return {
      loggedIn: authStatus.authorized,
      message: authStatus.authorized ? 'Twitter authorized via Arcade' : 'Twitter authorization required'
    };
  }
}

export default ArcadeTwitterService;