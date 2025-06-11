// Optional LangChain implementation for advanced AI workflows

import { ChatAnthropic } from '@langchain/anthropic';
import { PromptTemplate } from 'langchain/prompts';
import { LLMChain } from 'langchain/chains';

class LangChainClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = new ChatAnthropic({
      anthropicApiKey: apiKey,
      modelName: 'claude-3-sonnet-20240229',
      temperature: 0.7,
      maxTokens: 150
    });
    
    this.setupChains();
  }

  setupChains() {
    // Tweet generation chain
    this.tweetPrompt = new PromptTemplate({
      template: `You are a knowledgeable social media manager. Create an engaging tweet about "{topic}".

Requirements:
- Keep it under 280 characters
- Make it informative and engaging
- Include 2-3 relevant hashtags
- Use a {style} tone
- Make it original and thought-provoking
- Avoid controversial topics
- Focus on providing value to readers

Topic: {topic}
Style: {style}

Generate only the tweet content, nothing else:`,
      inputVariables: ['topic', 'style']
    });

    this.tweetChain = new LLMChain({
      llm: this.model,
      prompt: this.tweetPrompt
    });

    // Tweet improvement chain
    this.improvePrompt = new PromptTemplate({
      template: `Improve this tweet to make it more engaging while keeping it under 280 characters:

Original tweet: "{originalTweet}"

Requirements:
- Keep the core message
- Make it more engaging
- Ensure it's under 280 characters
- Add relevant hashtags if missing
- Improve readability

Improved tweet:`,
      inputVariables: ['originalTweet']
    });

    this.improveChain = new LLMChain({
      llm: this.model,
      prompt: this.improvePrompt
    });
  }

  async generateTweet(topic, options = {}) {
    const { style = 'professional but engaging' } = options;
    
    try {
      const result = await this.tweetChain.call({
        topic: topic,
        style: style
      });
      
      return result.text.trim();
    } catch (error) {
      console.error('Error generating tweet with LangChain:', error);
      throw error;
    }
  }

  async improveTweet(originalTweet) {
    try {
      const result = await this.improveChain.call({
        originalTweet: originalTweet
      });
      
      return result.text.trim();
    } catch (error) {
      console.error('Error improving tweet with LangChain:', error);
      throw error;
    }
  }

  async generateTweetSeries(topic, count = 3) {
    const seriesPrompt = new PromptTemplate({
      template: `Create a series of {count} related tweets about "{topic}". Each tweet should:
- Be under 280 characters
- Be engaging and informative
- Include relevant hashtags
- Build upon the previous tweets
- Form a cohesive narrative

Topic: {topic}
Number of tweets: {count}

Format each tweet as:
Tweet 1: [content]
Tweet 2: [content]
Tweet 3: [content]
etc.`,
      inputVariables: ['topic', 'count']
    });

    const seriesChain = new LLMChain({
      llm: this.model,
      prompt: seriesPrompt
    });

    try {
      const result = await seriesChain.call({
        topic: topic,
        count: count
      });
      
      // Parse the result to extract individual tweets
      const tweets = result.text
        .split(/Tweet \d+:/)
        .slice(1)
        .map(tweet => tweet.trim())
        .filter(tweet => tweet.length > 0);
      
      return tweets;
    } catch (error) {
      console.error('Error generating tweet series:', error);
      throw error;
    }
  }
}

export default LangChainClient;