/**
 * AI Service Module
 * 
 * Provides a unified interface for interacting with different AI providers
 * (Google Gemini, Hugging Face, OpenAI)
 */

import { AIProvider, getAIProvider, getCurrentAPIKey, getCurrentModel, AI_CONFIG } from './ai-config';

// Type for AI query options
export interface AIQueryOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

// Types for AI features integration

export interface Course {
  code: string;
  name: string;
  credits: number;
  currentGrade?: string;
  difficulty?: 'low' | 'medium' | 'high';
}

export interface Semester {
  courses: Course[];
}

export interface AcademicTerm {
  semester: string;
  gpa: number;
  credits: number;
}

export interface StudentContext {
  name: string;
  currentGPA: number;
  totalCredits: number;
  currentSemester: Semester;
  targetGPA: number;
  academicHistory: AcademicTerm[];
}

export interface AIServiceOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface IAIProvider {
  getCompletion(prompt: string, options?: AIServiceOptions): Promise<string>;
}

export class AIService {
  private provider: IAIProvider | null = null;

  constructor(provider: IAIProvider | null = null) {
    this.provider = provider;
  }

  setProvider(provider: IAIProvider) {
    this.provider = provider;
  }

  async getAIResponse(prompt: string, options?: AIServiceOptions): Promise<string> {
    if (!this.provider) {
      throw new Error('AI provider not set');
    }
    
    return this.provider.getCompletion(prompt, options);
  }

  async getGradeRecommendations(
    courses: Course[],
    studentContext: StudentContext
  ): Promise<string> {
    // In a real implementation, we would create a proper prompt with the course and student data
    const prompt = `
      Based on the following student information:
      - Current GPA: ${studentContext.currentGPA}
      - Target GPA: ${studentContext.targetGPA}
      - Total Credits: ${studentContext.totalCredits}
      
      And these current courses:
      ${courses.map(c => `- ${c.code}: ${c.name} (${c.credits} credits) - Current Grade: ${c.currentGrade || 'N/A'}`).join('\n')}
      
      Recommend what final grades would be needed in these courses to achieve the target GPA.
    `;
    
    // For demo purposes, we'll return a mock response if no provider is set
    if (!this.provider) {
      return this.getMockGradeRecommendations(courses, studentContext);
    }
    
    return this.getAIResponse(prompt, { temperature: 0.7 });
  }
  
  async getOptimalCourseLoad(
    availableCourses: Course[],
    targetGPA: number,
    currentCredits: number,
    studentContext: StudentContext
  ): Promise<string> {
    // In a real implementation, we'd create a proper prompt with course and student data
    const prompt = `
      Based on the following student information:
      - Current GPA: ${studentContext.currentGPA}
      - Target GPA: ${targetGPA}
      - Total Credits: ${currentCredits}
      - Academic History: ${studentContext.academicHistory.map(term => 
        `${term.semester}: GPA ${term.gpa} (${term.credits} credits)`).join(', ')}
      
      And these available courses for next semester:
      ${availableCourses.map(c => 
        `- ${c.code}: ${c.name} (${c.credits} credits, ${c.difficulty} difficulty)`).join('\n')}
      
      Recommend the optimal course selection for next semester to help the student reach their target GPA.
    `;
    
    // For demo purposes, we'll return a mock response if no provider is set
    if (!this.provider) {
      return this.getMockCourseOptimization(availableCourses, targetGPA, currentCredits, studentContext);
    }
    
    return this.getAIResponse(prompt, { temperature: 0.7 });
  }
  
  async getChatResponse(
    message: string,
    studentContext: StudentContext,
    chatHistory: { role: 'user' | 'ai'; content: string }[]
  ): Promise<string> {
    // In a real implementation, we'd create a proper prompt with the chat history and student data
    const historyText = chatHistory
      .map(msg => `${msg.role === 'user' ? 'Student' : 'Advisor'}: ${msg.content}`)
      .join('\n');
    
    const prompt = `
      You are an academic advisor AI assistant for a student with the following information:
      - Name: ${studentContext.name}
      - Current GPA: ${studentContext.currentGPA}
      - Target GPA: ${studentContext.targetGPA}
      - Total Credits: ${studentContext.totalCredits}
      
      Chat history:
      ${historyText}
      
      Student: ${message}
      
      Provide a helpful response as an academic advisor:
    `;
    
    // For demo purposes, we'll return a mock response if no provider is set
    if (!this.provider) {
      return this.getMockChatResponse(message, studentContext, chatHistory);
    }
    
    return this.getAIResponse(prompt, { temperature: 0.8 });
  }
  
  // Mock implementations for demo purposes
  private getMockGradeRecommendations(courses: Course[], studentContext: StudentContext): string {
    return `
Based on your current GPA of ${studentContext.currentGPA} and target of ${studentContext.targetGPA}, here are my recommendations:

1. ${courses[0].code} (${courses[0].name}): Currently ${courses[0].currentGrade} → Aim for at least an A-
2. ${courses[1].code} (${courses[1].name}): Currently ${courses[1].currentGrade} → Aim for at least a B
3. ${courses[2].code} (${courses[2].name}): Currently ${courses[2].currentGrade} → Aim for at least a B+
4. ${courses[3].code} (${courses[3].name}): Currently ${courses[3].currentGrade} → Maintain your A-

Focus particularly on improving your grade in ${courses[1].code}, as it currently has the lowest grade and would have the most impact on your overall GPA if improved.
`;
  }
  
  private getMockCourseOptimization(
    availableCourses: Course[],
    targetGPA: number,
    currentCredits: number,
    studentContext: StudentContext
  ): string {
    return `
Based on your academic history and target GPA of ${targetGPA}, here's my recommended course selection for next semester:

Recommended courses (15 credits total):
1. ${availableCourses[2].code}: ${availableCourses[2].name} (${availableCourses[2].credits} credits, ${availableCourses[2].difficulty} difficulty)
2. ${availableCourses[4].code}: ${availableCourses[4].name} (${availableCourses[4].credits} credits, ${availableCourses[4].difficulty} difficulty)
3. ${availableCourses[5].code}: ${availableCourses[5].name} (${availableCourses[5].credits} credits, ${availableCourses[5].difficulty} difficulty)
4. ${availableCourses[6].code}: ${availableCourses[6].name} (${availableCourses[6].credits} credits, ${availableCourses[6].difficulty} difficulty)

This selection balances your workload with two lower-difficulty courses and two medium-difficulty courses, avoiding the high-difficulty options. This should give you the best chance of achieving strong grades while still challenging yourself academically.
`;
  }
  
  private getMockChatResponse(
    message: string,
    studentContext: StudentContext,
    chatHistory: { role: 'user' | 'ai'; content: string }[]
  ): string {
    const lowercaseMessage = message.toLowerCase();
    
    if (lowercaseMessage.includes('gpa') && lowercaseMessage.includes('improve')) {
      return `Based on your current GPA of ${studentContext.currentGPA} and your goal of ${studentContext.targetGPA}, I'd recommend focusing on improving your performance in MATH202 first, as it's your lowest grade. Consider forming a study group or visiting office hours regularly. Also, make sure you're dedicating at least 2-3 hours of study time for every hour of class time.`;
    }
    
    if (lowercaseMessage.includes('course') && (lowercaseMessage.includes('recommend') || lowercaseMessage.includes('suggestion'))) {
      return `Looking at your academic history and target GPA, I'd recommend taking a balanced course load next semester. Consider including some courses in areas where you've performed well historically, while also including necessary prerequisite courses for your major. For your elective slots, look for courses with professors who have good teaching ratings.`;
    }
    
    if (lowercaseMessage.includes('stress') || lowercaseMessage.includes('overwhelm')) {
      return `It's completely normal to feel stressed about your GPA. Remember that your current 3.2 GPA is solid, and reaching 3.5 is achievable with focused effort. Break down your goal into smaller targets for each course, and make sure to maintain a healthy balance between academics and self-care. The university's counseling services are also available if you need additional support.`;
    }
    
    return `I understand you're working toward improving your GPA from ${studentContext.currentGPA} to ${studentContext.targetGPA}. That's a great goal! Is there a specific aspect of your academic planning you'd like help with? I can provide advice on course selection, study strategies, or how to prioritize your efforts across your current courses.`;
  }
}

/**
 * Main AI query function that routes to the appropriate provider
 */
export async function queryAI(
  prompt: string, 
  context?: StudentContext, 
  options?: AIQueryOptions
): Promise<string> {
  const provider = getAIProvider();
  const apiKey = getCurrentAPIKey();
  
  if (!apiKey) {
    throw new Error('AI API key not configured');
  }
  
  // Use provider-specific implementation based on configuration
  try {
    switch (provider) {
      case 'gemini':
        return await queryGemini(prompt, context, options);
      case 'huggingface':
        return await queryHuggingFace(prompt, context, options);
      case 'openai':
        return await queryOpenAI(prompt, context, options);
      case 'none':
      default:
        throw new Error('No AI provider configured');
    }
  } catch (error) {
    console.error('AI query error:', error);
    throw error;
  }
}

/**
 * Implements Google Gemini API integration
 */
async function queryGemini(
  prompt: string, 
  context?: StudentContext, 
  options?: AIQueryOptions
): Promise<string> {
  const apiKey = getCurrentAPIKey();
  const model = getCurrentModel();
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }
  
  try {
    // Dynamically import the Google Generative AI SDK
    // This avoids issues with server/client hydration
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    // Initialize the API client
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-pro' });
    
    // Build the content with context if provided
    let content = prompt;
    if (context) {
      content += '\n\nStudent Context:\n' + JSON.stringify(context, null, 2);
    }
    
    // Configure generation options
    const generationConfig = {
      maxOutputTokens: options?.maxTokens || AI_CONFIG.parameters.maxTokens,
      temperature: options?.temperature || AI_CONFIG.parameters.temperature,
      topP: options?.topP || AI_CONFIG.parameters.topP,
    };
    
    // Generate response
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: content }] }],
      generationConfig,
    });
    
    // Extract and return the text response
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Failed to query Gemini API: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Implements Hugging Face Inference API integration
 */
async function queryHuggingFace(
  prompt: string, 
  context?: StudentContext, 
  options?: AIQueryOptions
): Promise<string> {
  const apiKey = getCurrentAPIKey();
  const model = getCurrentModel();
  
  if (!apiKey) {
    throw new Error('Hugging Face API key not configured');
  }
  
  try {
    // Prepare the full prompt with context
    let fullPrompt = prompt;
    if (context) {
      fullPrompt += '\n\nStudent Context:\n' + JSON.stringify(context, null, 2);
    }
    
    // Prepare the API request
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: options?.maxTokens || AI_CONFIG.parameters.maxTokens,
          temperature: options?.temperature || AI_CONFIG.parameters.temperature,
          top_p: options?.topP || AI_CONFIG.parameters.topP,
          return_full_text: false,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Handle different response formats from different models
    if (Array.isArray(result) && result.length > 0) {
      if (typeof result[0].generated_text === 'string') {
        return result[0].generated_text;
      }
    }
    
    // Fallback for other response formats
    return JSON.stringify(result);
  } catch (error) {
    console.error('Hugging Face API error:', error);
    throw new Error(`Failed to query Hugging Face API: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Implements OpenAI API integration (optional fallback)
 */
async function queryOpenAI(
  prompt: string, 
  context?: StudentContext, 
  options?: AIQueryOptions
): Promise<string> {
  const apiKey = getCurrentAPIKey();
  const model = getCurrentModel();
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  try {
    // Prepare the full system message with context
    let systemMessage = "You are an academic advisor assistant for Bethlehem University's GPA calculator.";
    if (context) {
      systemMessage += " Here is information about the student: " + JSON.stringify(context, null, 2);
    }
    
    // Prepare the request to OpenAI's API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        max_tokens: options?.maxTokens || AI_CONFIG.parameters.maxTokens,
        temperature: options?.temperature || AI_CONFIG.parameters.temperature,
        top_p: options?.topP || AI_CONFIG.parameters.topP,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Extract the response from the completion
    if (result.choices && result.choices.length > 0 && result.choices[0].message) {
      return result.choices[0].message.content;
    }
    
    throw new Error('Invalid response format from OpenAI API');
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`Failed to query OpenAI API: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Specialized function for generating grade recommendations
 */
export async function getGradeRecommendations(
  courses: any[], 
  studentContext: StudentContext
): Promise<string> {
  const prompt = `
    As an academic advisor, please analyze the following courses and provide grade recommendations
    to help the student achieve their target GPA. Consider the student's previous performance and
    the importance of each course for their overall and major GPA.
    
    Courses: ${JSON.stringify(courses)}
    
    Please provide specific grade targets for each course, focusing on achievable improvements
    that would have the most impact on the student's GPA.
  `;
  
  return queryAI(prompt, studentContext);
}

/**
 * Specialized function for course selection optimization
 */
export async function getOptimalCourseLoad(
  availableCourses: any[],
  targetGPA: number,
  currentCredits: number,
  studentContext: StudentContext
): Promise<string> {
  const prompt = `
    As an academic advisor, please analyze the following available courses and recommend
    an optimal course selection to help the student achieve their target GPA of ${targetGPA}.
    The student currently has ${currentCredits} credits.
    
    Available courses: ${JSON.stringify(availableCourses)}
    
    Please recommend which courses to take, considering:
    1. The student's previous performance in similar courses
    2. The balance between major and non-major courses
    3. The total credit load (recommend an appropriate number of credits)
    4. Which courses would have the most positive impact on their GPA
  `;
  
  return queryAI(prompt, studentContext);
} 