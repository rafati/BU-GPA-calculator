'use client';

import { useState } from 'react';
import AIChatInterface from '@/components/AIChatInterface';
import { StudentContext } from '@/lib/ai-service';
import { useAI, getCurrentProvider } from '@/hooks/useAI';
import { isAIEnabled } from '@/lib/ai-config';

export default function AIDemo() {
  const [loading, setLoading] = useState(false);
  const [gradeRecommendations, setGradeRecommendations] = useState<string | null>(null);
  const [courseOptimization, setCourseOptimization] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Sample student context
  const studentContext: StudentContext = {
    name: 'John Doe',
    currentGPA: 3.2,
    totalCredits: 60,
    currentSemester: {
      courses: [
        { code: 'CS101', name: 'Introduction to Programming', credits: 4, currentGrade: 'B+' },
        { code: 'MATH202', name: 'Calculus II', credits: 4, currentGrade: 'C' },
        { code: 'PHYS101', name: 'Physics I', credits: 4, currentGrade: 'B-' },
        { code: 'ENG101', name: 'English Composition', credits: 3, currentGrade: 'A-' }
      ]
    },
    targetGPA: 3.5,
    academicHistory: [
      { semester: 'Fall 2022', gpa: 3.1, credits: 15 },
      { semester: 'Spring 2023', gpa: 3.3, credits: 16 },
      { semester: 'Fall 2023', gpa: 3.2, credits: 14 }
    ]
  };
  
  // AI hook
  const { getGradeRecommendations, getOptimalCourseLoad } = useAI();
  
  // Handle grade recommendations button click
  const handleGetGradeRecommendations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getGradeRecommendations(studentContext.currentSemester.courses, studentContext);
      setGradeRecommendations(result);
    } catch (err) {
      setError('Failed to get grade recommendations. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle course optimization button click
  const handleGetCourseOptimization = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Sample available courses for next semester
      const availableCourses = [
        { code: 'CS201', name: 'Data Structures', credits: 4, difficulty: 'high' as const },
        { code: 'CS215', name: 'Algorithms', credits: 4, difficulty: 'high' as const },
        { code: 'MATH303', name: 'Linear Algebra', credits: 3, difficulty: 'medium' as const },
        { code: 'PHYS102', name: 'Physics II', credits: 4, difficulty: 'high' as const },
        { code: 'ENG202', name: 'Technical Writing', credits: 3, difficulty: 'low' as const },
        { code: 'HIST101', name: 'World History', credits: 3, difficulty: 'low' as const },
        { code: 'ECON101', name: 'Microeconomics', credits: 3, difficulty: 'medium' as const }
      ];
      
      const result = await getOptimalCourseLoad(
        availableCourses,
        studentContext.targetGPA,
        studentContext.totalCredits,
        studentContext
      );
      
      setCourseOptimization(result);
    } catch (err) {
      setError('Failed to get course optimization. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Check if AI is enabled
  const aiEnabled = isAIEnabled();
  const currentProvider = getCurrentProvider();
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">AI Integration Demo</h1>
      
      {!aiEnabled ? (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
          <p className="font-bold">AI features are currently disabled</p>
          <p>Enable AI features by setting the NEXT_PUBLIC_AI_ENABLED environment variable to true.</p>
        </div>
      ) : (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
          <p className="font-bold">AI features are enabled</p>
          <p>Current provider: {currentProvider}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Student Context Card */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Student Context</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Name:</span> {studentContext.name}</p>
            <p><span className="font-medium">Current GPA:</span> {studentContext.currentGPA}</p>
            <p><span className="font-medium">Total Credits:</span> {studentContext.totalCredits}</p>
            <p><span className="font-medium">Target GPA:</span> {studentContext.targetGPA}</p>
            
            <h3 className="font-medium mt-4">Current Courses:</h3>
            <ul className="list-disc list-inside">
              {studentContext.currentSemester.courses.map((course) => (
                <li key={course.code}>
                  {course.code} - {course.name} ({course.credits} cr) - Current: {course.currentGrade}
                </li>
              ))}
            </ul>
            
            <h3 className="font-medium mt-4">Academic History:</h3>
            <ul className="list-disc list-inside">
              {studentContext.academicHistory.map((term) => (
                <li key={term.semester}>
                  {term.semester}: GPA {term.gpa} ({term.credits} cr)
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* AI Features Card */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">AI Features</h2>
          
          {!aiEnabled ? (
            <p className="text-gray-600">AI features are disabled. Enable them to use these features.</p>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleGetGradeRecommendations}
                disabled={loading}
                className={`w-full py-2 px-4 rounded-md ${
                  loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-medium`}
              >
                {loading ? 'Loading...' : 'Get Grade Recommendations'}
              </button>
              
              <button
                onClick={handleGetCourseOptimization}
                disabled={loading}
                className={`w-full py-2 px-4 rounded-md ${
                  loading ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'
                } text-white font-medium`}
              >
                {loading ? 'Loading...' : 'Get Course Optimization'}
              </button>
              
              {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Results Section */}
      {(gradeRecommendations || courseOptimization) && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">AI Results</h2>
          
          {gradeRecommendations && (
            <div className="mb-6">
              <h3 className="font-medium text-lg mb-2">Grade Recommendations</h3>
              <div className="bg-gray-50 p-4 rounded border border-gray-200 whitespace-pre-line">
                {gradeRecommendations}
              </div>
            </div>
          )}
          
          {courseOptimization && (
            <div>
              <h3 className="font-medium text-lg mb-2">Course Optimization</h3>
              <div className="bg-gray-50 p-4 rounded border border-gray-200 whitespace-pre-line">
                {courseOptimization}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* AI Chat Interface */}
      <AIChatInterface 
        studentContext={studentContext}
        initialMessage="I can help analyze your current GPA and suggest strategies to reach your target GPA of 3.5. What would you like to know?"
      />
    </div>
  );
} 