import { getAIRecommendation, continueChatConversation } from '@/lib/gemini';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { studentData, plannerData, userResponses, messageHistory, newMessage, studentId } = await request.json();
    
    // If continuing a conversation
    if (messageHistory && newMessage) {
      const aiResponse = await continueChatConversation(messageHistory, newMessage, studentId || null);
      return NextResponse.json({ recommendation: aiResponse });
    } 
    // Initial recommendation
    else {
      const recommendation = await getAIRecommendation(
        studentData,
        plannerData,
        userResponses || {},
        studentId || null
      );
      
      return NextResponse.json({ recommendation });
    }
  } catch (error) {
    console.error('AI recommendation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
} 