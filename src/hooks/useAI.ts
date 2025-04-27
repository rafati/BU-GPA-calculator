/**
 * Custom hook for interacting with AI services
 */

import { useState } from 'react';
import { AIService, StudentContext, Course } from '../lib/ai-service';

// Create singleton instance of AIService
const aiService = new AIService();

export const getCurrentProvider = (): string | null => {
  // In a real implementation, this would check environment variables or user settings
  // to determine the current AI provider (OpenAI, Gemini, Azure, etc.)
  return 'gemini (mock)'; // For demo purposes, return a mock provider name
};

export function useAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isAIEnabled = (): boolean => {
    // Always return true in development for easier testing
    const enabled = process.env.ENABLE_AI === 'true' || process.env.NODE_ENV === 'development';
    console.log('AI Enabled:', enabled);
    return enabled;
  };
  
  const query = async (
    prompt: string,
    studentContext?: StudentContext
  ): Promise<string> => {
    if (!isAIEnabled()) {
      console.log('AI features are disabled');
      return "AI features are not enabled in your account.";
    }
    
    setIsLoading(true);
    setError(null);
    console.log('Processing AI query:', prompt);
    
    try {
      // For demo purposes, we'll use a simplified mock response
      // In a real implementation, this would call aiService.getChatResponse
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      console.log('AI query completed successfully');
      
      return `Here is a response to your question: "${prompt}".\n\nThis is a placeholder response since we're in demo mode.`;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('AI query error:', errorMessage);
      setError(errorMessage);
      return `Error: ${errorMessage}`;
    } finally {
      setIsLoading(false);
    }
  };
  
  const getGradeRecommendations = async (
    courses: Course[],
    studentContext: StudentContext
  ): Promise<string> => {
    if (!isAIEnabled()) {
      return "AI features are not enabled in your account.";
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await aiService.getGradeRecommendations(courses, studentContext);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return `Error: ${errorMessage}`;
    } finally {
      setIsLoading(false);
    }
  };
  
  const getOptimalCourseLoad = async (
    availableCourses: Course[],
    targetGPA: number,
    currentCredits: number,
    studentContext: StudentContext
  ): Promise<string> => {
    if (!isAIEnabled()) {
      return "AI features are not enabled in your account.";
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await aiService.getOptimalCourseLoad(
        availableCourses, 
        targetGPA, 
        currentCredits, 
        studentContext
      );
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return `Error: ${errorMessage}`;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    isLoading,
    error,
    query,
    isAIEnabled,
    getGradeRecommendations,
    getOptimalCourseLoad,
  };
} 