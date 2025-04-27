/**
 * AI Engine Configuration
 * 
 * This file centralizes AI provider configuration and allows for easy switching between
 * different AI engines (Google Gemini, Hugging Face, etc.)
 */

// AI Provider options
export type AIProvider = 'gemini' | 'huggingface' | 'openai' | 'none';

// Configuration interface
export interface AIConfig {
  // The selected AI provider
  provider: AIProvider;
  
  // API keys for different providers
  apiKeys: {
    gemini?: string;
    huggingface?: string;
    openai?: string;
  };
  
  // Default model names for each provider
  models: {
    gemini: string;
    huggingface: string;
    openai: string;
  };
  
  // Common model parameters
  parameters: {
    maxTokens: number;
    temperature: number;
    topP: number;
  };
  
  // Feature flags
  features: {
    enabled: boolean;
    chatInterface: boolean;
    gradeRecommendations: boolean;
    courseAnalysis: boolean;
  };
}

// Load configuration from environment variables
export const AI_CONFIG: AIConfig = {
  // Select provider based on environment variable, default to 'gemini' for easier testing
  provider: (process.env.AI_PROVIDER as AIProvider) || 'gemini',
  
  // API keys for different providers
  apiKeys: {
    gemini: process.env.GEMINI_API_KEY || 'dummy-key-for-testing',
    huggingface: process.env.HUGGINGFACE_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  },
  
  // Default model names for each provider
  models: {
    gemini: process.env.GEMINI_MODEL || 'gemini-pro',
    huggingface: process.env.HUGGINGFACE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2',
    openai: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  },
  
  // Common parameters with defaults
  parameters: {
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '500'),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    topP: parseFloat(process.env.AI_TOP_P || '0.9'),
  },
  
  // Feature flags - Enable all features in development mode for easier testing
  features: {
    enabled: process.env.ENABLE_AI === 'true' || process.env.NODE_ENV === 'development',
    chatInterface: process.env.ENABLE_AI_CHAT === 'true' || process.env.NODE_ENV === 'development',
    gradeRecommendations: process.env.ENABLE_AI_RECOMMENDATIONS === 'true' || process.env.NODE_ENV === 'development',
    courseAnalysis: process.env.ENABLE_AI_COURSE_ANALYSIS === 'true' || process.env.NODE_ENV === 'development',
  }
};

/**
 * Helper function to check if AI features are enabled
 */
export function isAIEnabled(): boolean {
  const isEnabled = AI_CONFIG.features.enabled && AI_CONFIG.provider !== 'none';
  console.log('AI Config:', { 
    enabled: AI_CONFIG.features.enabled, 
    provider: AI_CONFIG.provider,
    result: isEnabled
  });
  return isEnabled;
}

/**
 * Helper function to get the current AI provider
 */
export function getAIProvider(): AIProvider {
  return AI_CONFIG.provider;
}

/**
 * Helper function to get the current AI provider (alias for getAIProvider for consistent naming)
 */
export function getCurrentProvider(): AIProvider {
  return AI_CONFIG.provider;
}

/**
 * Helper function to get the API key for the current provider
 */
export function getCurrentAPIKey(): string | undefined {
  const provider = AI_CONFIG.provider;
  if (provider === 'none') return undefined;
  return AI_CONFIG.apiKeys[provider as keyof typeof AI_CONFIG.apiKeys];
}

/**
 * Helper function to get the model for the current provider
 */
export function getCurrentModel(): string | undefined {
  const provider = AI_CONFIG.provider;
  if (provider === 'none') return undefined;
  return AI_CONFIG.models[provider as keyof typeof AI_CONFIG.models];
} 