import { getAIRecommendation, continueChatConversation } from '@/lib/gemini';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// Set a safe timeout that's a bit less than Vercel's 10s limit to allow for clean response
const API_TIMEOUT_MS = 9000;

export async function POST(request: NextRequest) {
  // Create a promise that rejects after our timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('API timeout')), API_TIMEOUT_MS);
  });
  
  try {
    // Start a timestamp for logging
    const startTime = Date.now();
    console.log("AI API: Request started");
    
    // Parse request body with error handling
    let requestBody;
    try {
      requestBody = await request.json();
      console.log("AI API: Request body parsed successfully");
    } catch (parseError: any) {
      console.error("AI API: Failed to parse request body", parseError.message);
      return NextResponse.json({
        recommendation: "I couldn't read your request. Please try again."
      }, { status: 400 });
    }
    
    const { studentData, plannerData, userResponses, messageHistory, newMessage, studentId } = requestBody;
    
    // Log request type
    if (messageHistory && newMessage) {
      console.log("AI API: Continuing conversation - History length:", messageHistory.length);
    } else if (studentData) {
      console.log("AI API: New recommendation - Student ID:", studentId || 'unknown');
    }
    
    // Validate required parameters to prevent runtime errors
    if (messageHistory && newMessage) {
      // Continuing a conversation
      console.log("AI API: Continuing conversation");
      
      if (!studentData) {
        console.error("AI API: Missing studentData for conversation continuation");
        return NextResponse.json({ 
          recommendation: "I'm sorry, I couldn't process your request due to missing student data." 
        }, { status: 400 });
      }
      
      // Use Promise.race to handle potential timeouts
      const aiResponse = await Promise.race([
        continueChatConversation(
          messageHistory, 
          newMessage, 
          studentData, 
          plannerData, 
          studentId || null
        ),
        timeoutPromise
      ]);
      
      const elapsedTime = Date.now() - startTime;
      console.log(`AI API: Conversation response completed in ${elapsedTime}ms`);
      
      return NextResponse.json({ recommendation: aiResponse });
    } 
    else if (studentData) {
      // Initial recommendation
      console.log("AI API: Generating initial recommendation");
      
      // Use Promise.race to handle potential timeouts
      const recommendation = await Promise.race([
        getAIRecommendation(
          studentData,
          plannerData || [],
          userResponses || {},
          studentId || null
        ),
        timeoutPromise
      ]);
      
      const elapsedTime = Date.now() - startTime;
      console.log(`AI API: Initial recommendation completed in ${elapsedTime}ms`);
      
      return NextResponse.json({ recommendation });
    } 
    else {
      // Missing required data
      console.error("AI API: Missing required data for recommendations");
      return NextResponse.json({ 
        recommendation: "I'm sorry, I couldn't process your request due to missing data." 
      }, { status: 400 });
    }
  } catch (error: any) {
    // Handle timeout error specifically
    if (error.message === 'API timeout') {
      console.error('AI API: Request timed out after', API_TIMEOUT_MS, 'ms');
      return NextResponse.json({
        recommendation: "I'm sorry, but the recommendation is taking too long to generate. Please try asking a simpler question or try again later."
      }, { status: 504 });
    }
    
    // Handle other errors
    console.error('AI recommendation error:', error.message);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json({
      recommendation: "I'm sorry, I encountered an error processing your request. This might be due to a temporary issue with the AI service. Please try again with a simpler question."
    }, { status: 500 });
  }
} 