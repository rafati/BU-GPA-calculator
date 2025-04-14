import { getAIRecommendation, continueChatConversation } from '@/lib/gemini';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { studentData, plannerData, userResponses, messageHistory, newMessage, studentId } = await request.json();
    
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
      
      const aiResponse = await continueChatConversation(
        messageHistory, 
        newMessage, 
        studentData, 
        plannerData, 
        studentId || null
      );
      
      return NextResponse.json({ recommendation: aiResponse });
    } 
    else if (studentData) {
      // Initial recommendation
      console.log("AI API: Generating initial recommendation");
      
      const recommendation = await getAIRecommendation(
        studentData,
        plannerData || [],
        userResponses || {},
        studentId || null
      );
      
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
    console.error('AI recommendation error:', error.message, error.stack);
    return NextResponse.json(
      { recommendation: "I'm sorry, I encountered an error processing your request. Please try again later." },
      { status: 500 }
    );
  }
} 