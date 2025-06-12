/* global chrome */

class BackgroundTwitterAgent {
  constructor() {
    this.setupMessageHandlers();
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle alarms for scheduled tweets
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'tweet-generator') {
        this.generateAndPostTweet();
      }
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      console.log('Background script received message:', request.action);
      
      switch (request.action) {
        case 'AGENT_INITIALIZE':
          sendResponse({ success: true, message: 'Agent initialized' });
          break;

        case 'AGENT_START':
          const startResult = await this.startAgent(request.config);
          sendResponse(startResult);
          break;

        case 'AGENT_STOP':
          const stopResult = await this.stopAgent();
          sendResponse(stopResult);
          break;

        case 'AGENT_STATUS':
          const status = await this.getAgentStatus();
          sendResponse(status);
          break;

        case 'TEST_CLAUDE':
        case 'CLAUDE_GENERATE':
          const claudeResult = await this.testClaudeAPIWithRetry(request.apiKey, request.topic);
          sendResponse(claudeResult);
          break;

        case 'TEST_TWEET':
          const tweetResult = await this.testClaudeAPIWithRetry(request.apiKey, request.topic || 'Technology');
          sendResponse(tweetResult);
          break;

        case 'UPDATE_CONFIG':
          const configResult = await this.updateConfig(request.config);
          sendResponse(configResult);
          break;

        case 'CLAUDE_IMPROVE':
          const improveResult = await this.improveClaudeAPI(request.apiKey, request.originalTweet);
          sendResponse(improveResult);
          break;

        case 'CLAUDE_MULTIPLE':
          const multipleResult = await this.generateMultipleTweets(request.apiKey, request.topic, request.count);
          sendResponse(multipleResult);
          break;

        case 'AUTHORIZE_TWITTER':
          try {
            // This would coordinate Twitter authorization
            // For now, just acknowledge the request
            sendResponse({ success: true, message: 'Twitter authorization initiated' });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'ARCADE_POST':
          try {
            // Handle Arcade posting from background if needed
            sendResponse({ success: true, message: 'Arcade posting initiated' });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        default:
          console.log('Unknown action:', request.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async startAgent(config) {
    try {
      console.log('Starting agent with config:', config);
      
      // Store config
      await chrome.storage.sync.set({ agentConfig: config });
      
      // Set up alarm for scheduled tweets
      const intervalMinutes = config?.settings?.interval || 240;
      await chrome.alarms.create('tweet-generator', {
        delayInMinutes: 1,
        periodInMinutes: intervalMinutes
      });
      
      console.log(`Agent started with ${intervalMinutes} minute intervals`);
      return { success: true, message: 'Agent started successfully' };
    } catch (error) {
      console.error('Error starting agent:', error);
      return { success: false, error: error.message };
    }
  }

  async stopAgent() {
    try {
      await chrome.alarms.clearAll();
      console.log('Agent stopped successfully');
      return { success: true, message: 'Agent stopped successfully' };
    } catch (error) {
      console.error('Error stopping agent:', error);
      return { success: false, error: error.message };
    }
  }

  async getAgentStatus() {
    try {
      const alarms = await chrome.alarms.getAll();
      const config = await chrome.storage.sync.get(['agentConfig']);
      
      return {
        isRunning: alarms.length > 0,
        hasAgent: true,
        config: config.agentConfig ? {
          hasAnthropicKey: !!config.agentConfig.anthropicApiKey,
          hasTwitterCredentials: !!(config.agentConfig.twitter?.username && config.agentConfig.twitter?.password),
          topicsCount: config.agentConfig.topics?.length || 0,
          interval: config.agentConfig.settings?.interval || 240,
          style: config.agentConfig.settings?.style || 'professional but engaging'
        } : {},
        schedules: alarms.map(alarm => ({
          name: alarm.name,
          periodInMinutes: alarm.periodInMinutes
        }))
      };
    } catch (error) {
      console.error('Error getting agent status:', error);
      return { isRunning: false, hasAgent: false, config: {} };
    }
  }

  async updateConfig(config) {
    try {
      await chrome.storage.sync.set({ agentConfig: config });
      return { success: true, message: 'Configuration updated successfully' };
    } catch (error) {
      console.error('Error updating config:', error);
      return { success: false, error: error.message };
    }
  }

  async testClaudeAPI(apiKey, topic = 'Artificial Intelligence') {
    try {
      console.log('Testing Claude API from background script...');
      console.log('Topic:', topic);
      console.log('API Key present:', !!apiKey);
      
      if (!apiKey) {
        throw new Error('API key is required');
      }
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true' // Add this required header
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 150,
          temperature: 0.7,
          messages: [{
            role: 'user',
            content: `Create an engaging tweet about "${topic}". Keep it under 280 characters with relevant hashtags. Make it original and thought-provoking.`
          }]
        })
      });

      console.log('API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const tweet = data.content[0].text.trim();
      
      console.log('Generated tweet:', tweet);
      
      return {
        success: true,
        tweet: tweet,
        topic: topic,
        message: 'Claude API test successful'
      };
    } catch (error) {
      console.error('Error testing Claude API:', error);
      return { success: false, error: error.message };
    }
  }

  async testClaudeAPIWithRetry(apiKey, topic, retries = 3, delay = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Testing Claude API (attempt ${attempt}/${retries})...`);
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 150,
            temperature: 0.7,
            messages: [{
              role: 'user',
              content: `Create an engaging tweet about "${topic}". Keep it under 280 characters with relevant hashtags. Make it original and thought-provoking.`
            }]
          })
        });

        console.log('API Response status:', response.status);

        if (response.status === 529) {
          // Overloaded - wait longer before retry
          if (attempt < retries) {
            const backoffDelay = delay * Math.pow(2, attempt - 1); // Exponential backoff
            console.log(`API overloaded, waiting ${backoffDelay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', errorText);
          throw new Error(`Claude API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const tweet = data.content[0].text.trim();
        
        console.log('Generated tweet:', tweet);
        
        return {
          success: true,
          tweet: tweet,
          topic: topic,
          message: 'Claude API test successful'
        };
      } catch (error) {
        if (attempt === retries) {
          console.error('Error testing Claude API after all retries:', error);
          return { success: false, error: error.message };
        }
        console.log(`Attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async improveClaudeAPI(apiKey, originalTweet) {
    try {
      console.log('Improving tweet with Claude API from background script...');
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true' // Add this required header
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 150,
          temperature: 0.7,
          messages: [{
            role: 'user',
            content: `Improve this tweet to make it more engaging and concise: "${originalTweet}". Keep it under 280 characters.`
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const improvedTweet = data.content[0].text.trim();
      
      return {
        success: true,
        tweet: improvedTweet,
        message: 'Tweet improvement successful'
      };
    } catch (error) {
      console.error('Error improving tweet with Claude API:', error);
      return { success: false, error: error.message };
    }
  }

  async generateMultipleTweets(apiKey, topic, count = 3) {
    try {
      console.log(`Generating ${count} tweets about: ${topic}`);
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true' // Add this required header
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 500,
          temperature: 0.8,
          messages: [{
            role: 'user',
            content: `Create ${count} different engaging tweets about "${topic}". Each tweet should be under 280 characters, include relevant hashtags, and have a different angle. Separate each tweet with "---".`
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const tweets = data.content[0].text
        .split('---')
        .map(tweet => tweet.trim())
        .filter(tweet => tweet.length > 0);
      
      return {
        success: true,
        tweets: tweets,
        message: 'Multiple tweets generated successfully'
      };
    } catch (error) {
      console.error('Error generating multiple tweets:', error);
      return { success: false, error: error.message };
    }
  }

  async generateAndPostTweet() {
    try {
      console.log('Generating scheduled tweet...');
      
      const { agentConfig } = await chrome.storage.sync.get(['agentConfig']);
      if (!agentConfig || !agentConfig.anthropicApiKey) {
        console.error('No config or API key found');
        return;
      }

      const topics = agentConfig.topics || ['Technology'];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      
      const result = await this.testClaudeAPI(agentConfig.anthropicApiKey, randomTopic);
      
      if (result.success) {
        console.log('Scheduled tweet generated:', result.tweet);
        // Here you would normally post to Twitter
        // For now, just log it
      } else {
        console.error('Failed to generate scheduled tweet:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('Error in generateAndPostTweet:', error);
      return { success: false, error: error.message };
    }
  }
}

// Initialize the background agent
console.log('Background script loading...');
const backgroundAgent = new BackgroundTwitterAgent();
console.log('Background agent initialized');