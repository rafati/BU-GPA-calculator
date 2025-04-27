/**
 * Utility to check if required environment variables are set
 */

export function checkAIEnvironment() {
  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development';
  
  // Check if Google AI API key is set
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  
  if (!hasGeminiKey) {
    const message = "GEMINI_API_KEY is not set in environment variables. AI recommendations will not work.";
    console.error(`⚠️ ${message}`);
    
    // Only throw in development to aid debugging
    if (isDev) {
      throw new Error(message);
    }
    
    return false;
  }
  
  // Key exists but check if it looks valid (basic check)
  const key = process.env.GEMINI_API_KEY;
  if (key === 'your_api_key_here' || key.length < 20) {
    console.warn("⚠️ GEMINI_API_KEY appears to be a placeholder or invalid. AI recommendations may not work.");
    return false;
  }
  
  return true;
}

/**
 * Helper function to check all environment variables for AI functionality
 */
export function logAIAvailability() {
  try {
    const isAIAvailable = checkAIEnvironment();
    
    if (isAIAvailable) {
      console.log("✅ AI environment check passed. AI recommendations should be available.");
    } else {
      console.log("⚠️ AI environment check failed. AI recommendations may not be available.");
    }
    
    return isAIAvailable;
  } catch (error) {
    console.error("❌ AI environment check error:", error.message);
    return false;
  }
} 