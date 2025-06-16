import BrowserClaudeClient from '../services/ai/claudeClient';
import BrowserTwitterService from '../services/twitter/browserTwitter';
import BrowserStorage from '../services/storage/browserStorage';
import WebScheduler from '../services/scheduler/webScheduler';

class BrowserTwitterAgent {
  constructor() {
    this.storage = new BrowserStorage();
    this.scheduler = new WebScheduler();
    this.twitter = new BrowserTwitterService();
    this.claude = null;
    this.isRunning = false;
    this.config = null;
  }

  async initialize() {
    try {
      console.log('BrowserTwitterAgent: Starting initialization...');
      this.config = await this.storage.getConfig();
      
      console.log('BrowserTwitterAgent: Config loaded:', {
        hasAnthropicKey: !!this.config.anthropicApiKey
      });
      
      if (!this.config.anthropicApiKey) {
        throw new Error('Anthropic API key not configured');
      }
      
      this.claude = new BrowserClaudeClient(this.config.anthropicApiKey);
      
      // Initialize Twitter service with config
      console.log('BrowserTwitterAgent: Initializing Twitter service...');
      const twitterInitResult = await this.twitter.initialize(this.config);
      console.log('BrowserTwitterAgent: Twitter service init result:', twitterInitResult);
      
      if (!twitterInitResult.success) {
        console.warn('Twitter service initialization failed:', twitterInitResult.error);
        // Don't throw error, continue with limited functionality
      }
      
      console.log('Browser Twitter Agent initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('Error initializing agent:', error);
      return { success: false, error: error.message };
    }
  }

  async start() {
    try {
      if (!this.claude) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          throw new Error(initResult.error);
        }
      }

      const intervalMinutes = this.config.settings.interval || 240;
      
      await this.scheduler.scheduleRepeating(
        'tweet-generator',
        intervalMinutes,
        () => this.generateAndPostTweet()
      );

      this.isRunning = true;
      
      // Update config
      this.config.settings.enabled = true;
      await this.storage.setConfig(this.config);

      console.log(`Agent started with ${intervalMinutes} minute intervals`);
      return { success: true, message: 'Agent started successfully' };
    } catch (error) {
      console.error('Error starting agent:', error);
      return { success: false, error: error.message };
    }
  }

  async stop() {
    try {
      await this.scheduler.cancelAll();
      this.isRunning = false;
      
      // Update config
      if (this.config) {
        this.config.settings.enabled = false;
        await this.storage.setConfig(this.config);
      }

      console.log('Agent stopped successfully');
      return { success: true, message: 'Agent stopped successfully' };
    } catch (error) {
      console.error('Error stopping agent:', error);
      return { success: false, error: error.message };
    }
  }

  async generateAndPostTweet() {
    try {
      if (!this.claude || !this.config) {
        throw new Error('Agent not properly initialized');
      }

      // Select random topic
      const topics = this.config.topics || ['Technology'];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      
      console.log(`Generating tweet about: ${randomTopic}`);
      
      // Generate tweet
      const tweet = await this.claude.generateTweet(randomTopic, {
        style: this.config.settings.style || 'professional but engaging'
      });
      
      console.log('Generated tweet:', tweet);
      
      // Validate and improve if needed
      let finalTweet = tweet;
      if (finalTweet.length > 280) {
        console.warn('Tweet too long, improving...');
        finalTweet = await this.claude.improveTweet(finalTweet);
        
        if (finalTweet.length > 280) {
          finalTweet = finalTweet.substring(0, 277) + '...';
        }
      }
      
      // Save to history
      await this.storage.addTweetToHistory(finalTweet);
      
      // Post to Twitter using tab automation
      let posted = false;
      let postError = null;
      
      try {
        console.log('BrowserTwitterAgent: Attempting to post tweet...');
        const result = await this.twitter.postTweet(finalTweet, this.config);
        
        console.log('BrowserTwitterAgent: Post result:', result);
        
        if (result.success && result.posted) {
          posted = true;
          console.log('Tweet posted successfully!');
          
          // Mark as posted in history
          const history = await this.storage.getTweetHistory();
          if (history.length > 0) {
            await this.storage.markTweetAsPosted(history[0].id);
          }
        } else {
          postError = result.error || 'Posting failed';
          console.log('Tweet posting failed:', postError);
        }
      } catch (error) {
        postError = error.message;
        console.error('Error posting tweet:', error);
      }
      
      return {
        success: true,
        tweet: finalTweet,
        topic: randomTopic,
        posted: posted,
        error: postError,
        method: 'tab-automation'
      };
      
    } catch (error) {
      console.error('Error in generateAndPostTweet:', error);
      return { success: false, error: error.message };
    }
  }

  async testTweet() {
    return await this.generateAndPostTweet();
  }

  async testClaude() {
    try {
      if (!this.claude) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          throw new Error(initResult.error);
        }
      }

      const testTopic = 'Artificial Intelligence';
      const tweet = await this.claude.generateTweet(testTopic);
      
      return {
        success: true,
        tweet: tweet,
        topic: testTopic,
        message: 'Claude API test successful'
      };
    } catch (error) {
      console.error('Error testing Claude:', error);
      return { success: false, error: error.message };
    }
  }

  async updateConfig(newConfig) {
    try {
      this.config = { ...this.config, ...newConfig };
      await this.storage.setConfig(this.config);
      
      // Reinitialize Claude if API key changed
      if (newConfig.anthropicApiKey) {
        this.claude = new BrowserClaudeClient(newConfig.anthropicApiKey);
      }
      
      return { success: true, message: 'Configuration updated successfully' };
    } catch (error) {
      console.error('Error updating config:', error);
      return { success: false, error: error.message };
    }
  }

  async getStatus() {
    const schedules = await this.scheduler.getActiveSchedules();
    
    return {
      isRunning: this.isRunning,
      hasAgent: !!this.claude,
      config: this.config ? {
        hasAnthropicKey: !!this.config.anthropicApiKey,
        hasTwitterCredentials: !!(this.config.twitter?.username && this.config.twitter?.password),
        topicsCount: this.config.topics?.length || 0,
        interval: this.config.settings?.interval || 240,
        style: this.config.settings?.style || 'professional but engaging'
      } : {},
      schedules: schedules
    };
  }

  // Add the missing postTweetViaTab method
  async postTweetViaTab(content) {
    try {
      console.log('BrowserTwitterAgent: Posting tweet via tab automation...');
      
      if (!this.twitter) {
        throw new Error('Twitter service not initialized');
      }
      
      // Use the twitter service's postViaTabAutomation method
      const result = await this.twitter.postViaTabAutomation(content);
      
      console.log('BrowserTwitterAgent: Tab automation result:', result);
      return result;
      
    } catch (error) {
      console.error('BrowserTwitterAgent: Error in postTweetViaTab:', error);
      return { 
        success: false, 
        error: error.message, 
        posted: false 
      };
    }
  }
}

export default BrowserTwitterAgent;