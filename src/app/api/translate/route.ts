import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API client
const apiKey = process.env.GOOGLE_AI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Use a model that handles translations well
const modelName = 'gemini-1.5-flash';
const model = genAI.getGenerativeModel({ model: modelName });

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage } = await request.json();
    
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }
    
    // Default to Arabic if no target language is specified
    const language = targetLanguage || 'Arabic';
    
    // Create a prompt for translation
    const prompt = `Translate the following text to ${language}:\n\n${text}\n\nTranslation:`;
    
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const translatedText = response.text();
      
      return NextResponse.json({ translatedText });
    } catch (error: any) {
      console.error('Translation API error:', error.message);
      return NextResponse.json(
        { error: 'Failed to generate translation' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Translation request error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
} 