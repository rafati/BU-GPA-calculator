import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkAIEnvironment, logAIAvailability } from "./checkEnvironment";

// Check if AI environment is properly configured
const isAIAvailable = logAIAvailability();

// Initialize the Gemini API client
const apiKey = process.env.GOOGLE_AI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Primary model (Gemini 2.5 Pro Experimental)
const primaryModelName = "gemini-2.5-pro-exp-03-25";
// Fallback model (Gemini 1.5 Flash)
const fallbackModelName = "gemini-1.5-flash";

// Create model instances
const primaryModel = genAI.getGenerativeModel({ model: primaryModelName });
const fallbackModel = genAI.getGenerativeModel({ model: fallbackModelName });

// Track if we've switched to fallback
let usingFallbackModel = false;

/**
 * Get the appropriate model, with fallback handling
 */
const getModel = () => {
  return usingFallbackModel ? fallbackModel : primaryModel;
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
  
  // GPA calculation rules for Bethlehem University
  const calculationRules = `
BETHLEHEM UNIVERSITY GPA CALCULATION RULES:
------------------------------------------
1. GENERAL GPA CALCULATION:
   - GPA = Total Points / Total Credits
   - Points for a course = Course Credits × Grade Point Value
   - Grades are assigned point values (A=4.0, A-=3.7, B+=3.3, B=3.0, etc.)
   - Only courses with grades that affect GPA are included in calculations (W, E, I, IP, and non-repeat P grades do not affect GPA)

2. REPEAT COURSE HANDLING:
   - Grade Replacement: When a course is repeated, the previous points are removed from GPA calculation
   - Credits Handling: For P-repeats (Pass), previous credits are also removed; for other repeats, only points are removed
   - All repeated courses must be identified with the "Repeat" flag and include the previous grade
   - P-repeats must additionally indicate if the original course was a major course

3. MAJOR GPA CALCULATION:
   - Only courses marked as "Major" are included in Major GPA calculation
   - Same repeat rules apply for major courses
   - Major flag must be properly set for accurate calculation

4. TARGET GPA LOGIC (v34):
   - Target GPA calculation identifies the required semester GPA needed to reach a target cumulative GPA
   - Steps for calculation:
     1. Identify relevant planner courses (exclude W, E, I, IP and non-repeat P)
     2. Calculate AdjustedBasePoints/Credits (Base - P-repeat credits/points - ALL relevant repeat points)
     3. Calculate NetCreditsAddedByPlanner (only non-repeats from relevant courses)
     4. Calculate FinalCumulativeCredits (AdjustedBaseCredits + NetCreditsAddedByPlanner)
     5. Calculate TotalPointsNeeded (TargetCumulativeGPA × FinalCumulativeCredits)
     6. Calculate RequiredSemesterPoints (TotalPointsNeeded - AdjustedBasePoints)
     7. Calculate SemesterDivisorCredits (from relevant courses: sum credits if grade is blank OR grade AffectsGPA)
     8. If SemesterDivisorCredits > 0, RequiredSemesterGPA = RequiredSemesterPoints / SemesterDivisorCredits
     9. Else, output RequiredSemesterPoints needed over 0 GPA credits
     10. Format output string including divisor credits. Handle Overall/Major separately

5. POINTS CORRECTION:
   - Bethlehem University applies a "Points/10" rule for base cumulative points from the Students sheet
   - This normalization only applies to the initial cumulative data, not to new calculations

6. SPECIAL GRADE HANDLING:
   - WF (Withdrawal Fail) is treated as equivalent to F grade
   - Pass/Fail (P) grades do not affect GPA unless they are replacing a previous grade (P-repeat)
   - Courses with blank grades or non-GPA affecting grades are excluded from semester GPA calculation
   - For target GPA calculation, courses with blank grades are included in the divisor credits
`;
  
  // Complete prompt
  return `
You are an academic advisor at Bethlehem University assisting a student with GPA planning.

${formattedStudentData}

${formattedPlannerData}

${userResponsesText}

${calculationRules}

${plannerStateInstructions}

Based on this information, please provide:

1. A recommended target semester GPA (to three decimal places)
2. Credit recommendations (total number and major/non-major breakdown)
3. Specific strategies tailored to this student's situation, considering all the GPA calculation rules
4. If the student has repeat courses or is planning to repeat courses, address the specific impact on their GPA
5. If there are any courses with special grading (P/F, WF), address the specific implications

Format your response in a conversational, supportive tone. Use bullet points for clarity where appropriate.
Present numeric GPA values with exactly three decimal places (e.g., "3.250").
Ensure credit values are whole numbers.

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
    return "AI recommendations are not available. Please check your environment configuration.";
  }
  
  try {
    const prompt = buildPrompt(studentData, plannerData, userResponses, studentId);
    
    // For debugging
    console.log("Sending prompt to Gemini:", prompt);
    
    try {
      // First try with primary model
      const result = await getModel().generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (primaryError) {
      // If primary model fails and we're not already using fallback
      if (!usingFallbackModel) {
        console.log("Primary model failed, switching to fallback model:", primaryError.message);
        usingFallbackModel = true;
        
        // Try again with fallback model
        const fallbackResult = await getModel().generateContent(prompt);
        const fallbackResponse = fallbackResult.response;
        return fallbackResponse.text();
      } else {
        // If even the fallback model fails, rethrow
        throw primaryError;
      }
    }
  } catch (error) {
    console.error("Error getting AI recommendation:", error);
    return "I'm sorry, I couldn't generate recommendations at this time. Please try again later.";
  }
}

/**
 * Function to handle chat history
 */
export async function continueChatConversation(history, newUserMessage, studentId = null) {
  // Check if AI is available
  if (!isAIAvailable) {
    return "AI conversation is not available. Please check your environment configuration.";
  }
  
  try {
    // Gemini API requires the first history message to be from a user
    // Process history to ensure compliance with this requirement
    let processedHistory = [...history];
    
    // Check if the first message is from the AI (model)
    if (processedHistory.length > 0 && processedHistory[0].type === 'ai') {
      // If we only have an AI greeting, create a minimal conversation
      if (processedHistory.length === 1) {
        // Create a new history with a dummy user message first, followed by the AI greeting
        processedHistory = [
          { type: 'user', text: 'Hi, I need help with my GPA planning.' },
          processedHistory[0]
        ];
      } else if (processedHistory.length > 1) {
        // If we have more than one message, remove the first AI message
        // and handle it separately in our response
        const aiGreeting = processedHistory.shift();
        console.log("Removed initial AI greeting for Gemini API compatibility:", aiGreeting.text);
      }
    }
    
    // Add student ID context if available
    const contextualPrompt = studentId ? `Context: Student ID is ${studentId}. ` : '';
    
    // Create formatted history for the API
    const formattedHistory = processedHistory.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    
    // If we have a valid history with at least one message (which must be a user message now)
    if (formattedHistory.length > 0) {
      // Create a chat instance
      const chat = getModel().startChat({
        history: formattedHistory
      });
      
      // Send the new message with context if needed
      const result = await chat.sendMessage(contextualPrompt + newUserMessage);
      return result.response.text();
    } else {
      // If we somehow have no valid history, start fresh with just the new message
      // This is a fallback case that shouldn't normally happen
      const result = await getModel().generateContent(
        contextualPrompt + "The student asks: " + newUserMessage + 
        "\nProvide a helpful response about GPA planning."
      );
      return result.response.text();
    }
  } catch (error) {
    console.error("Error in chat conversation:", error);
    return "I'm sorry, I couldn't process your message. Please try again.";
  }
} 