/**
 * AI API Route
 * 
 * This route handles all AI-related requests from the client
 * providing a secure server-side interface to AI services
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryAI, getGradeRecommendations, getOptimalCourseLoad, StudentContext } from '@/lib/ai-service';
import { isAIEnabled } from '@/lib/ai-config';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

// Define request types
type AIQueryRequest = {
  action: 'query';
  prompt: string;
  context?: StudentContext;
};

type GradeRecommendationRequest = {
  action: 'gradeRecommendations';
  courses: any[];
  context: StudentContext;
};

type CourseOptimizationRequest = {
  action: 'courseOptimization';
  availableCourses: any[];
  targetGPA: number;
  currentCredits: number;
  context: StudentContext;
};

type AIRequest = AIQueryRequest | GradeRecommendationRequest | CourseOptimizationRequest;

/**
 * Handle POST requests to the AI API
 */
export async function POST(req: NextRequest) {
  try {
    // Check if AI features are enabled
    if (!isAIEnabled()) {
      return NextResponse.json(
        { error: 'AI features are disabled' },
        { status: 403 }
      );
    }
    
    // Authenticate the request (optional - comment out if not needed for shared links)
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const requestData = await req.json() as AIRequest;
    
    // Validate the request
    if (!requestData.action) {
      return NextResponse.json(
        { error: 'Missing action parameter' },
        { status: 400 }
      );
    }
    
    let result: string;
    
    // Route to the appropriate handler based on the action
    switch (requestData.action) {
      case 'query':
        if (!requestData.prompt) {
          return NextResponse.json(
            { error: 'Missing prompt' },
            { status: 400 }
          );
        }
        result = await queryAI(requestData.prompt, requestData.context);
        break;
        
      case 'gradeRecommendations':
        if (!requestData.courses || !Array.isArray(requestData.courses)) {
          return NextResponse.json(
            { error: 'Invalid courses data' },
            { status: 400 }
          );
        }
        result = await getGradeRecommendations(requestData.courses, requestData.context);
        break;
        
      case 'courseOptimization':
        if (
          !requestData.availableCourses || 
          !Array.isArray(requestData.availableCourses) ||
          typeof requestData.targetGPA !== 'number' ||
          typeof requestData.currentCredits !== 'number'
        ) {
          return NextResponse.json(
            { error: 'Invalid course optimization data' },
            { status: 400 }
          );
        }
        result = await getOptimalCourseLoad(
          requestData.availableCourses,
          requestData.targetGPA,
          requestData.currentCredits,
          requestData.context
        );
        break;
        
      default:
        return NextResponse.json(
          { error: `Unknown action: ${(requestData as any).action}` },
          { status: 400 }
        );
    }
    
    // Return the result
    return NextResponse.json({
      result,
      status: 'success'
    });
  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json(
      { 
        error: `AI processing error: ${error instanceof Error ? error.message : String(error)}`,
        status: 'error'
      },
      { status: 500 }
    );
  }
}

/**
 * Simple health check for AI services (GET request)
 */
export async function GET() {
  return NextResponse.json({
    enabled: isAIEnabled(),
    status: 'operational'
  });
} 