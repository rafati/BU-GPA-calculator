import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkAIEnvironment, logAIAvailability } from "./checkEnvironment";

// Check if AI environment is properly configured
const isAIAvailable = logAIAvailability();

// Initialize the Gemini API client
const apiKey = process.env.GOOGLE_AI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Debug logging to help troubleshoot Vercel deployment
console.log("Gemini API initialization - API Key length:", apiKey ? apiKey.length : 0);
console.log("Environment:", process.env.NODE_ENV);
console.log("Is AI available:", isAIAvailable);

// Use more stable, widely available models
// Primary model (Gemini 1.5 Flash) - Using Flash as primary for better performance
const primaryModelName = "gemini-1.5-flash";
// Fallback model (Gemini 1.5 Pro) - Pro model kept as fallback
const fallbackModelName = "gemini-1.5-pro";

console.log("Using models - Primary:", primaryModelName, "Fallback:", fallbackModelName);

// Create model instances
let primaryModel;
let fallbackModel;

try {
  primaryModel = genAI.getGenerativeModel({ 
    model: primaryModelName,
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 0.95,
      maxOutputTokens: 2048,
    }
  });
  console.log("Primary model (Flash) initialized successfully");
} catch (error) {
  console.error("Error initializing primary model (Flash):", error.message);
}

try {
  fallbackModel = genAI.getGenerativeModel({ 
    model: fallbackModelName,
    generationConfig: {
      temperature: 0.3,
      topK: 32,
      topP: 0.95,
      maxOutputTokens: 4096,
    }
  });
  console.log("Fallback model (Pro) initialized successfully");
} catch (error) {
  console.error("Error initializing fallback model (Pro):", error.message);
}

// Track if we've switched to fallback
let usingFallbackModel = false;

/**
 * Get the appropriate model, with fallback handling
 */
const getModel = () => {
  if (usingFallbackModel) {
    console.log("Using fallback model");
    return fallbackModel;
  }
  console.log("Using primary model");
  return primaryModel;
};

/**
 * Formats student data for the AI prompt
 */
function formatStudentData(studentData) {
  // Calculate if the student is close to probation
  const probationThreshold = 2.0;
  const overallGPA = parseFloat(studentData.overallGPA.toFixed(3));
  const majorGPA = parseFloat(studentData.majorGPA.toFixed(3));
  const isProbationRisk = overallGPA < probationThreshold + 0.25;
  
  // Determine academic standing based on GPA
  let academicStanding = "Good Standing";
  if (overallGPA < probationThreshold) {
    academicStanding = "Academic Probation";
  } else if (isProbationRisk) {
    academicStanding = "At Risk (close to probation threshold)";
  }
  
  // Calculate remaining credits needed for graduation (assuming 120 total needed)
  // This is a simplification - adjust based on your institution's requirements
  const totalCreditsNeeded = 120;
  const remainingCredits = Math.max(0, totalCreditsNeeded - studentData.overallCredits);
  
  return `
STUDENT ACADEMIC PROFILE:
-----------------------
Current Overall GPA: ${overallGPA.toFixed(3)} (based on ${studentData.overallCredits} credits)
Current Major GPA: ${majorGPA.toFixed(3)} (based on ${studentData.majorCredits} credits)
Academic Standing: ${academicStanding}
Probation Threshold: ${probationThreshold.toFixed(3)}
Estimated Remaining Credits Needed: ${remainingCredits} (assuming 120 total credits required)

GPA EVALUATION:
-----------------------
${overallGPA >= 3.5 ? "• Excellent academic performance (GPA ≥ 3.5)" : 
  overallGPA >= 3.0 ? "• Good academic performance (GPA 3.0-3.49)" :
  overallGPA >= 2.5 ? "• Satisfactory academic performance (GPA 2.5-2.99)" :
  overallGPA >= 2.0 ? "• Acceptable academic performance, but improvement recommended (GPA 2.0-2.49)" :
  "• Below acceptable academic performance, immediate improvement needed (GPA < 2.0)"}
${isProbationRisk ? "• WARNING: Student is at risk of academic probation" : ""}
${majorGPA < overallGPA - 0.2 ? "• Major GPA is significantly lower than overall GPA - focus on major courses recommended" : 
  majorGPA > overallGPA + 0.2 ? "• Major GPA is significantly higher than overall GPA - student performs well in their discipline" : 
  "• Major and overall GPA are relatively balanced"}
`;
}

/**
 * Formats planner data for the AI prompt
 */
function formatPlannerData(plannerData) {
  if (!plannerData || plannerData.length === 0) {
    return "Current Planner: Empty";
  }
  
  const courseList = plannerData.map(course => {
    // Get details about the grade and its GPA impact (assuming this is accessible)
    const gradeDisplay = course.grade || 'Not selected';
    const gradePointValue = getGradePointValue(course.grade); // You would need to implement this function
    const gpaImpact = affectsGPA(course.grade) ? 'Affects GPA' : 'Does not affect GPA'; // You would need to implement this function
    const repeatInfo = course.isRepeat ? 
      `Repeat: Yes, Previous Grade: ${course.previousGrade || 'Not specified'}` : 
      'Repeat: No';
      
    return `- ${course.catalogKey || course.courseId}: ${course.credits} credits, Grade: ${gradeDisplay}, Point Value: ${gradePointValue}, ${gpaImpact}, Major: ${course.isMajor ? 'Yes' : 'No'}, ${repeatInfo}`;
  }).join('\n');
  
  return `
Current Planner Courses:
${courseList}
`;
}

/**
 * Helper function to get grade point value
 * This is a simplified version - you may need to adapt it to your actual grade scale
 */
function getGradePointValue(grade) {
  if (!grade) return 'N/A';
  
  const gradePoints = {
    'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0.0, 'WF': 0.0,
    'P': 'Pass', 'W': 'Withdrawal', 'I': 'Incomplete', 'IP': 'In Progress', 'E': 'Exempt'
  };
  
  return gradePoints[grade] !== undefined ? gradePoints[grade] : 'Unknown';
}

/**
 * Helper function to determine if a grade affects GPA
 */
function affectsGPA(grade) {
  if (!grade) return false;
  
  // These grades typically don't affect GPA
  const nonGpaGrades = ['P', 'W', 'I', 'IP', 'E'];
  
  return !nonGpaGrades.includes(grade);
}

/**
 * Creates a comprehensive prompt based on all available data
 */
function buildPrompt(studentData, plannerData, userResponses, studentId = null) {
  const isEmpty = !plannerData || plannerData.length === 0;
  const formattedStudentData = formatStudentData(studentData);
  const formattedPlannerData = formatPlannerData(plannerData);
  
  // Format user responses to clarification questions
  let userResponsesText = "";
  if (userResponses && Object.keys(userResponses).length > 0) {
    userResponsesText = `
User's Responses to Clarification Questions:
${Object.entries(userResponses).map(([question, answer]) => `- ${question}: ${answer}`).join('\n')}
`;
  }
  
  // Build appropriate instructions based on planner state
  const plannerStateInstructions = isEmpty 
    ? "The student has no courses in their planner yet. Recommend a suitable credit load and course strategy."
    : "The student has courses loaded in their planner. Consider these existing courses in your recommendations.";
  
  // GPA calculation rules for Bethlehem University - Simplified version to reduce token count
  const calculationRules = `
BETHLEHEM UNIVERSITY GPA CALCULATION RULES (SUMMARY):
------------------------------------------
- GPA = Total Points / Total Credits
- Points = Course Credits × Grade Point Value (A=4.0, A-=3.7, B+=3.3, etc.)
- Major GPA includes only courses flagged as major courses
- Repeated courses replace previous grade points in GPA calculation
- Non-GPA affecting grades: W, I, IP, E, and non-repeated P grades
- Minimum acceptable GPA: 2.000 (academic probation threshold)
`;
  
  // Complete prompt
  return `
You are an academic advisor at Bethlehem University assisting a student with GPA planning.

${formattedStudentData}

${formattedPlannerData}

${userResponsesText}

${calculationRules}

${plannerStateInstructions}

Based on this information, provide:
1. A recommended target semester GPA (to three decimal places)
2. Credit recommendations (total number and major/non-major breakdown)
3. Specific strategies tailored to this student's situation
4. Brief advice for any repeat courses or special grading cases

Format your response in a conversational, supportive tone using bullet points for clarity.
Present numeric GPA values with exactly three decimal places (e.g., "3.250").
Remember that Bethlehem University requires a minimum 2.000 GPA to avoid academic probation.

Student ID: ${studentId || 'N/A'}
`;
}

/**
 * Main function to get AI recommendations
 */
export async function getAIRecommendation(studentData, plannerData, userResponses = {}, studentId = null) {
  // Check if AI is available
  if (!isAIAvailable) {
    console.error("AI recommendations not available - environment check failed");
    return "AI recommendations are not available. Please check your environment configuration.";
  }
  
  // Validate input data
  if (!studentData || typeof studentData !== 'object') {
    console.error("Invalid studentData provided:", studentData);
    return "Unable to generate recommendations due to invalid student data. Please reload the page and try again.";
  }
  
  try {
    const prompt = buildPrompt(studentData, plannerData, userResponses, studentId);
    
    // For debugging
    console.log("Sending prompt to Gemini (length):", prompt.length);
    
    if (!primaryModel && !fallbackModel) {
      console.error("No AI models available - both primary and fallback models failed to initialize");
      return "AI service is temporarily unavailable. Please try again later.";
    }
    
    let result;
    
    // Setup AbortController for timeout
    const timeoutMs = 8000; // 8 seconds to leave buffer for other operations
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      // First try with primary model
      if (!primaryModel) {
        throw new Error("Primary model not available");
      }
      
      console.log("Attempting to generate content with primary model");
      const model = getModel();
      
      // Pass the AbortController signal to the API call
      result = await model.generateContent(prompt, { signal: controller.signal });
      console.log("Content generation successful");
      
      // Clear timeout since we got a response
      clearTimeout(timeoutId);
      
    } catch (primaryError) {
      // Clear timeout to prevent memory leaks
      clearTimeout(timeoutId);
      
      // Handle timeout specifically
      if (primaryError.name === 'AbortError') {
        console.error("Primary model request timed out");
        return "The request took too long to process. I'll provide a simpler response. Please try asking a more specific question next time.";
      }
      
      // Log the primary model error
      console.error("Primary model error:", primaryError.message);
      
      // If we haven't tried the fallback yet, try it now
      if (!usingFallbackModel && fallbackModel) {
        try {
          console.log("Switching to fallback model");
          usingFallbackModel = true;
          
          // Setup a new AbortController for the fallback request
          const fallbackController = new AbortController();
          const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), timeoutMs);
          
          const model = getModel();
          result = await model.generateContent(prompt, { signal: fallbackController.signal });
          console.log("Fallback model content generation successful");
          
          // Clear timeout since we got a response
          clearTimeout(fallbackTimeoutId);
          
        } catch (fallbackError) {
          // Handle timeout for fallback
          if (fallbackError.name === 'AbortError') {
            console.error("Fallback model request timed out");
            return "Both models took too long to respond. Please try a simpler question or try again later.";
          }
          
          console.error("Fallback model error:", fallbackError.message);
          throw new Error(`Both models failed. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`);
        }
      } else {
        // Either we're already using fallback or it's not available
        throw primaryError;
      }
    }
    
    // Extract and return the response text
    if (result && result.response) {
      return result.response.text();
    } else {
      console.error("Unexpected response format:", result);
      return "Sorry, I received an unexpected response format from the AI service. Please try again later.";
    }
    
  } catch (error) {
    console.error("Error in getAIRecommendation:", error.message, error.stack);
    return `Sorry, I encountered an error generating recommendations: ${error.message}. This may be due to a temporary issue with the AI service. Please try again later.`;
  }
}

/**
 * Continues an existing conversation with chat history
 */
export async function continueChatConversation(history, newUserMessage, studentData, plannerData, studentId = null) {
  // Check if AI is available
  if (!isAIAvailable) {
    console.error("AI chat continuation not available - environment check failed");
    return "AI chat service is not available. Please check your environment configuration.";
  }
  
  try {
    // Format chat history for the Gemini API
    const formattedHistory = history.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    
    // Add the new user message
    const userMessage = {
      role: 'user',
      parts: [{ text: newUserMessage }]
    };
    
    console.log("Chat history length:", formattedHistory.length);
    console.log("New message:", newUserMessage.substring(0, 50) + (newUserMessage.length > 50 ? '...' : ''));
    
    if (!primaryModel && !fallbackModel) {
      console.error("No AI models available for chat - both models failed to initialize");
      return "AI chat service is temporarily unavailable. Please try again later.";
    }
    
    let result;
    
    // Setup AbortController for timeout
    const timeoutMs = 8000; // 8 seconds to leave buffer for other operations
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      // Try with primary model first
      if (!primaryModel) {
        throw new Error("Primary chat model not available");
      }
      
      console.log("Attempting chat with primary model");
      
      // Create a chat session
      const chat = primaryModel.startChat({
        history: formattedHistory,
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      });
      
      // Send the message and get the response with timeout
      result = await chat.sendMessage(userMessage.parts[0].text, { signal: controller.signal });
      console.log("Chat response received successfully");
      
      // Clear timeout since we got a response
      clearTimeout(timeoutId);
      
    } catch (primaryError) {
      // Clear timeout to prevent memory leaks
      clearTimeout(timeoutId);
      
      // Handle timeout specifically
      if (primaryError.name === 'AbortError') {
        console.error("Primary chat model request timed out");
        return "The request took too long to process. Please try a shorter or simpler question.";
      }
      
      console.error("Primary model chat error:", primaryError.message);
      
      // If we haven't tried the fallback yet, try it now
      if (!usingFallbackModel && fallbackModel) {
        try {
          console.log("Switching to fallback model for chat");
          usingFallbackModel = true;
          
          // Setup a new AbortController for the fallback request
          const fallbackController = new AbortController();
          const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), timeoutMs);
          
          // Create a chat session with the fallback model
          const chat = fallbackModel.startChat({
            history: formattedHistory,
            generationConfig: {
              temperature: 0.3,
              topK: 32,
              topP: 0.95,
              maxOutputTokens: 4096,
            }
          });
          
          // Send the message and get the response with timeout
          result = await chat.sendMessage(userMessage.parts[0].text, { signal: fallbackController.signal });
          console.log("Fallback chat response received successfully");
          
          // Clear timeout since we got a response
          clearTimeout(fallbackTimeoutId);
          
        } catch (fallbackError) {
          // Handle timeout for fallback
          if (fallbackError.name === 'AbortError') {
            console.error("Fallback chat model request timed out");
            return "Both models took too long to respond. Please try a simpler question or try again later.";
          }
          
          console.error("Fallback model chat error:", fallbackError.message);
          throw new Error(`Both chat models failed. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`);
        }
      } else {
        // Either we're already using fallback or it's not available
        throw primaryError;
      }
    }
    
    // Extract and return the response text
    if (result && result.response) {
      return result.response.text();
    } else {
      console.error("Unexpected chat response format:", result);
      return "Sorry, I received an unexpected response format from the AI service. Please try again later.";
    }
    
  } catch (error) {
    console.error("Error in continueChatConversation:", error.message, error.stack);
    return `Sorry, I encountered an error processing your message: ${error.message}. This may be due to a temporary issue with the AI service. Please try again later.`;
  }
} 