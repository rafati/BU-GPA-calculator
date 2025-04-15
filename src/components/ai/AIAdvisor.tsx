import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './AIAdvisor.module.css';

interface Message {
  type: 'user' | 'ai';
  text: string;
}

interface AIAdvisorProps {
  studentData: {
    overallGPA: number;
    majorGPA: number;
    overallCredits: number;
    majorCredits: number;
  };
  plannerData: any[]; // Array of courses
  isOpen: boolean;
  onClose: () => void;
  chatHistory?: Message[];
  setChatHistory?: React.Dispatch<React.SetStateAction<Message[]>>;
  userResponses?: Record<string, string>;
  setUserResponses?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  studentId?: string | null;
}

const CLARIFICATION_QUESTIONS = {
  emptyPlanner: [
    { id: 'repeatCourses', text: 'Are you planning to repeat any courses this semester?' },
    { id: 'creditLoad', text: 'Do you prefer to take a full course load or a reduced schedule?' },
    { id: 'majorFocus', text: 'Do you want to focus more on major courses or general requirements?' },
    { id: 'gpaGoals', text: 'Are you trying to improve your GPA, maintain your current standing, or fulfill specific graduation requirements?' }
  ],
  populatedPlanner: [
    { id: 'planningIntent', text: 'Would you like to modify your current registration, plan for future semesters, or evaluate your current courses?' },
    { id: 'semesterPlanning', text: 'Are you planning for just this semester or multiple future semesters?' },
    { id: 'gpaGoals', text: 'What are your GPA goals for this academic year?' }
  ]
};

export default function AIAdvisor({ 
  studentData, 
  plannerData, 
  isOpen, 
  onClose, 
  chatHistory, 
  setChatHistory, 
  userResponses: initialUserResponses, 
  setUserResponses: parentSetUserResponses,
  studentId 
}: AIAdvisorProps) {
  // Use parent state if provided, otherwise use local state
  const [messages, setMessages] = useState<Message[]>(chatHistory || []);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [userResponses, setUserResponses] = useState<Record<string, string>>(initialUserResponses || {});
  const [showClarificationQuestions, setShowClarificationQuestions] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [disclaimer, setDisclaimer] = useState<string>("");
  const [showTranslationOptions, setShowTranslationOptions] = useState(false);
  const [lastAiMessageIndex, setLastAiMessageIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Determine if planner is empty
  const isPlannerEmpty = !plannerData || plannerData.length === 0;
  
  // Get appropriate questions based on planner state
  const questions = isPlannerEmpty 
    ? CLARIFICATION_QUESTIONS.emptyPlanner 
    : CLARIFICATION_QUESTIONS.populatedPlanner;
  
  // Fetch disclaimer from API
  useEffect(() => {
    // Only fetch if disclaimer is empty
    if (!disclaimer) {
      const fetchDisclaimer = async () => {
        try {
          const response = await fetch('/api/disclaimer');
          const data = await response.json();
          if (data.disclaimer) {
            setDisclaimer(data.disclaimer);
          } else {
            setDisclaimer("This calculator provides estimates only and does not replace official academic records.");
          }
        } catch (error) {
          console.error("Error fetching disclaimer:", error);
          setDisclaimer("This calculator provides estimates only and does not replace official academic records.");
        }
      };
      
      fetchDisclaimer();
    }
  }, [disclaimer]);
  
  // Update local state from props when they change
  useEffect(() => {
    if (chatHistory && JSON.stringify(chatHistory) !== JSON.stringify(messages)) {
      setMessages(chatHistory);
    }
  }, [chatHistory, messages]);

  useEffect(() => {
    if (initialUserResponses && JSON.stringify(initialUserResponses) !== JSON.stringify(userResponses)) {
      setUserResponses(initialUserResponses);
    }
  }, [initialUserResponses, userResponses]);

  // Sync local state with parent state - only when local state changes from internal actions
  // Use a ref to track if the change originated internally
  const isInternalMessagesChange = useRef(false);
  const isInternalResponsesChange = useRef(false);
  
  useEffect(() => {
    if (setChatHistory && isInternalMessagesChange.current) {
      setChatHistory(messages);
      isInternalMessagesChange.current = false;
    }
  }, [messages, setChatHistory]);

  useEffect(() => {
    if (parentSetUserResponses && isInternalResponsesChange.current) {
      parentSetUserResponses(userResponses);
      isInternalResponsesChange.current = false;
    }
  }, [userResponses, parentSetUserResponses]);
  
  // Modify all setMessages calls to set the internal change flag
  const setMessagesWithFlag = useCallback((value: Message[] | ((prev: Message[]) => Message[])) => {
    isInternalMessagesChange.current = true;
    setMessages(value);
  }, []);
  
  const setUserResponsesWithFlag = useCallback((value: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
    isInternalResponsesChange.current = true;
    setUserResponses(value);
  }, []);
  
  // Keep track of the previous student ID to detect changes
  const previousStudentIdRef = useRef<string | null | undefined>(studentId);
  
  // Handle clearing the chat
  const handleClearChat = useCallback(() => {
    if (!disclaimer) {
      console.error("Disclaimer not loaded yet");
      return;
    }
    
    // Start with a dummy user message to comply with Gemini API requirements
    const dummyUserMessage = {
      type: 'user' as const,
      text: 'Hi, I need help with my GPA planning.'
    };
    
    // Add the disclaimer message
    const disclaimerMessage = {
      type: 'ai' as const,
      text: disclaimer
    };
    
    // Then add the AI greeting message
    const initialMessage = {
      type: 'ai' as const,
      text: `Hello! I'm your GPA Advisor. I can help you plan your academic semester and achieve your GPA goals. ${
        isPlannerEmpty 
          ? "I notice you don't have any courses in your planner yet." 
          : "I see you have some courses loaded in your planner."
      } Let me ask you a few questions to provide better recommendations.`
    };
    
    // Reset state
    setUserResponsesWithFlag({});
    setShowClarificationQuestions(false);
    setCurrentQuestionIndex(0);
    setShowTranslationOptions(false);
    
    // Update messages with initial conversation
    setMessagesWithFlag([dummyUserMessage, disclaimerMessage, initialMessage]);
    
    // Update parent state directly here to avoid triggering update cycles
    if (setChatHistory) {
      setChatHistory([dummyUserMessage, disclaimerMessage, initialMessage]);
    }
    if (parentSetUserResponses) {
      parentSetUserResponses({});
    }
    
    // Show clarification questions
    setShowClarificationQuestions(true);
  }, [disclaimer, isPlannerEmpty, setChatHistory, parentSetUserResponses, setMessagesWithFlag, setUserResponsesWithFlag]);
  
  // Clear chat when studentId changes
  useEffect(() => {
    // Only reinitialize if studentId has actually changed
    if (studentId !== previousStudentIdRef.current && disclaimer && isOpen) {
      // Use a slight delay to ensure all state updates are processed
      const timer = setTimeout(() => {
        handleClearChat();
      }, 50);
      
      // Update the ref to the current studentId
      previousStudentIdRef.current = studentId;
      
      return () => clearTimeout(timer);
    }
  }, [studentId, disclaimer, isOpen, handleClearChat]);
  
  // Initialize chat when component mounts or is opened
  useEffect(() => {
    if (isOpen && disclaimer && messages.length === 0) {
      handleClearChat();
    }
  }, [isOpen, disclaimer, messages.length, handleClearChat]);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Translate message to Arabic
  const handleTranslate = async (messageIndex: number) => {
    setIsLoading(true);
    
    try {
      const messageToTranslate = messages[messageIndex].text;
      
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: messageToTranslate,
          targetLanguage: 'Arabic'
        })
      });
      
      const data = await response.json();
      
      if (data.translatedText) {
        // Add the translated message
        setMessagesWithFlag(prev => [
          ...prev,
          { type: 'ai', text: `Arabic translation:\n\n${data.translatedText}` } as Message
        ]);
      } else {
        throw new Error('Translation failed');
      }
    } catch (error) {
      console.error('Translation error:', error);
      setMessagesWithFlag(prev => [
        ...prev,
        { type: 'ai', text: 'Sorry, I could not translate the message to Arabic at this time.' } as Message
      ]);
    } finally {
      setIsLoading(false);
      setShowTranslationOptions(false);
    }
  };

  // Ask for specific GPA advice
  const handleAskGpaAdvice = () => {
    const gpaAdviceMessage: Message = { 
      type: 'user', 
      text: 'Can you give me specific advice on how to improve my GPA this semester?' 
    };
    
    setMessagesWithFlag(prev => [...prev, gpaAdviceMessage]);
    setIsLoading(true);
    
    // Process this message through the AI service
    fetch('/api/ai-recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageHistory: [...messages, gpaAdviceMessage],
        newMessage: gpaAdviceMessage.text,
        studentData,
        plannerData,
        studentId
      })
    })
    .then(response => response.json())
    .then(data => {
      setMessagesWithFlag(prev => [
        ...prev,
        { type: 'ai', text: data.recommendation } as Message
      ]);
    })
    .catch(error => {
      console.error('Error getting GPA advice:', error);
      setMessagesWithFlag(prev => [
        ...prev,
        { type: 'ai', text: 'Sorry, I encountered an error generating GPA advice.' } as Message
      ]);
    })
    .finally(() => {
      setIsLoading(false);
      setShowTranslationOptions(false);
    });
  };

  // Handle course selection advice request
  const handleAskCourseAdvice = () => {
    const courseAdviceMessage: Message = { 
      type: 'user', 
      text: 'What courses would you recommend for improving my GPA?' 
    };
    
    setMessagesWithFlag(prev => [...prev, courseAdviceMessage]);
    setIsLoading(true);
    
    // Process this message through the AI service
    fetch('/api/ai-recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageHistory: [...messages, courseAdviceMessage],
        newMessage: courseAdviceMessage.text,
        studentData,
        plannerData,
        studentId
      })
    })
    .then(response => response.json())
    .then(data => {
      setMessagesWithFlag(prev => [
        ...prev,
        { type: 'ai', text: data.recommendation } as Message
      ]);
    })
    .catch(error => {
      console.error('Error getting course advice:', error);
      setMessagesWithFlag(prev => [
        ...prev,
        { type: 'ai', text: 'Sorry, I encountered an error generating course recommendations.' } as Message
      ]);
    })
    .finally(() => {
      setIsLoading(false);
      setShowTranslationOptions(false);
    });
  };
  
  // Handle answering a clarification question
  const handleAnswerQuestion = async (questionId: string, answer: string) => {
    // Update user responses
    setUserResponsesWithFlag(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    // Add user message
    const newMessages: Message[] = [
      ...messages,
      { type: 'user', text: answer }
    ];
    setMessagesWithFlag(newMessages);
    
    // Move to next question or get recommendations
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      
      // Add AI follow-up question after a short delay
      setTimeout(() => {
        setMessagesWithFlag(prev => [
          ...prev, 
          { type: 'ai', text: questions[currentQuestionIndex + 1].text }
        ]);
      }, 500);
    } else {
      // All questions answered, get recommendations
      setShowClarificationQuestions(false);
      setIsLoading(true);
      
      try {
        // Include studentId in the request if available
        const response = await fetch('/api/ai-recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentData,
            plannerData,
            userResponses: {
              ...userResponses,
              [questionId]: answer
            },
            studentId
          })
        });
        
        const data = await response.json();
        
        // Add AI response
        setMessagesWithFlag(prev => {
          const newMessages = [
            ...prev,
            { type: 'ai', text: data.recommendation } as Message
          ];
          
          // Store the index of this message for translation options
          setLastAiMessageIndex(newMessages.length - 1);
          // Show translation options after receiving recommendations
          setShowTranslationOptions(true);
          
          return newMessages;
        });
      } catch (error) {
        console.error('Error getting recommendations:', error);
        setMessagesWithFlag(prev => [
          ...prev,
          { type: 'ai', text: 'Sorry, I encountered an error generating recommendations.' }
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Handle sending a custom message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    
    const newMessage: Message = { type: 'user', text: userInput };
    const updatedMessages: Message[] = [...messages, newMessage];
    setMessagesWithFlag(updatedMessages);
    setUserInput('');
    setIsLoading(true);
    setShowTranslationOptions(false);
    
    try {
      const response = await fetch('/api/ai-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageHistory: updatedMessages,
          newMessage: userInput,
          studentData,
          plannerData,
          studentId
        })
      });
      
      const data = await response.json();
      
      // Add AI response
      setMessagesWithFlag(prev => {
          const newMessages = [
            ...prev,
            { type: 'ai', text: data.recommendation } as Message
          ];
          
          // Store the index of this message for translation options
          setLastAiMessageIndex(newMessages.length - 1);
          // Show translation options after receiving an AI response
          setShowTranslationOptions(true);
          
          return newMessages;
      });
    } catch (error) {
      console.error('Error in conversation:', error);
      setMessagesWithFlag(prev => [
        ...prev,
        { type: 'ai', text: 'Sorry, I encountered an error processing your message.' } as Message
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className={styles.chatPanel}>
      <div className={styles.header}>
        <h3>GPA Advisor</h3>
        <div className={styles.headerButtons}>
          <button 
            className={styles.clearButton} 
            onClick={handleClearChat}
            title="Clear conversation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
      </div>
      
      <div className={styles.messagesContainer}>
        {messages.map((msg, index) => {
          // Skip rendering the dummy user message that's only there for API compatibility
          if (index === 0 && msg.type === 'user' && msg.text === 'Hi, I need help with my GPA planning.') {
            return null;
          }
          return (
            <div key={index} className={`${styles.message} ${styles[msg.type]}`}>
              {msg.text}
            </div>
          );
        })}
        
        {isLoading && (
          <div className={`${styles.message} ${styles.ai}`}>
            <div className={styles.typingIndicator}>
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        
        {/* Translation and suggestion options */}
        {showTranslationOptions && lastAiMessageIndex !== null && !isLoading && (
          <div className={styles.optionsContainer}>
            <h4>What would you like to do next?</h4>
            <div className={styles.optionsButtons}>
              <button onClick={() => handleTranslate(lastAiMessageIndex)}>
                Translate to Arabic
              </button>
              <button onClick={handleAskGpaAdvice}>
                Get GPA Improvement Tips
              </button>
              <button onClick={handleAskCourseAdvice}>
                Recommend Courses
              </button>
            </div>
          </div>
        )}
        
        {showClarificationQuestions && currentQuestionIndex < questions.length && (
          <div className={styles.questionButtons}>
            {questions[currentQuestionIndex].id === 'repeatCourses' && (
              <>
                <button onClick={() => handleAnswerQuestion('repeatCourses', 'Yes')}>Yes</button>
                <button onClick={() => handleAnswerQuestion('repeatCourses', 'No')}>No</button>
              </>
            )}
            
            {questions[currentQuestionIndex].id === 'creditLoad' && (
              <>
                <button onClick={() => handleAnswerQuestion('creditLoad', 'Full load')}>Full load</button>
                <button onClick={() => handleAnswerQuestion('creditLoad', 'Reduced schedule')}>Reduced</button>
              </>
            )}
            
            {questions[currentQuestionIndex].id === 'majorFocus' && (
              <>
                <button onClick={() => handleAnswerQuestion('majorFocus', 'Major courses')}>Major courses</button>
                <button onClick={() => handleAnswerQuestion('majorFocus', 'General requirements')}>General requirements</button>
                <button onClick={() => handleAnswerQuestion('majorFocus', 'Balanced mix')}>Balanced mix</button>
              </>
            )}
            
            {questions[currentQuestionIndex].id === 'gpaGoals' && (
              <>
                <button onClick={() => handleAnswerQuestion('gpaGoals', 'Improve GPA')}>Improve GPA</button>
                <button onClick={() => handleAnswerQuestion('gpaGoals', 'Maintain standing')}>Maintain standing</button>
                <button onClick={() => handleAnswerQuestion('gpaGoals', 'Meet graduation requirements')}>Meet graduation requirements</button>
              </>
            )}
            
            {questions[currentQuestionIndex].id === 'planningIntent' && (
              <>
                <button onClick={() => handleAnswerQuestion('planningIntent', 'Modify current registration')}>Modify current</button>
                <button onClick={() => handleAnswerQuestion('planningIntent', 'Plan future semesters')}>Plan future</button>
                <button onClick={() => handleAnswerQuestion('planningIntent', 'Evaluate current courses')}>Evaluate current</button>
              </>
            )}
            
            {questions[currentQuestionIndex].id === 'semesterPlanning' && (
              <>
                <button onClick={() => handleAnswerQuestion('semesterPlanning', 'Just this semester')}>This semester</button>
                <button onClick={() => handleAnswerQuestion('semesterPlanning', 'Multiple semesters')}>Multiple semesters</button>
              </>
            )}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className={styles.inputForm}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading || showClarificationQuestions}
        />
        <button type="submit" disabled={isLoading || !userInput.trim() || showClarificationQuestions}>
          Send
        </button>
      </form>
    </div>
  );
} 