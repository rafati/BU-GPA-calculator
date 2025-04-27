import React, { useState } from 'react';
import { useAI } from '../hooks/useAI';
import { StudentContext, Course } from '../lib/ai-service';

const sampleCourses: Course[] = [
  { code: 'CS101', name: 'Introduction to Programming', credits: 4, difficulty: 'medium' },
  { code: 'MATH240', name: 'Linear Algebra', credits: 4, difficulty: 'high' },
  { code: 'ECON101', name: 'Principles of Economics', credits: 3, difficulty: 'medium' },
  { code: 'WR120', name: 'Writing Seminar', credits: 4, difficulty: 'medium' },
  { code: 'CHEM101', name: 'General Chemistry', credits: 4, difficulty: 'high' },
];

const sampleStudentContext: StudentContext = {
  name: 'John Doe',
  currentGPA: 3.5,
  totalCredits: 48,
  targetGPA: 3.7,
  currentSemester: {
    courses: sampleCourses.slice(0, 3)
  },
  academicHistory: [
    { semester: 'Fall 2022', gpa: 3.3, credits: 16 },
    { semester: 'Spring 2023', gpa: 3.5, credits: 16 },
    { semester: 'Fall 2023', gpa: 3.6, credits: 16 }
  ]
};

const AIDemo: React.FC = () => {
  const { isLoading, error, getGradeRecommendations, getOptimalCourseLoad } = useAI();
  const [result, setResult] = useState<string>('');
  
  const handleGradeRecommendations = async () => {
    const response = await getGradeRecommendations(sampleCourses, sampleStudentContext);
    setResult(response);
  };
  
  const handleOptimalCourseLoad = async () => {
    const response = await getOptimalCourseLoad(
      sampleCourses,
      3.7, // target GPA
      12,  // current credits
      sampleStudentContext
    );
    setResult(response);
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">AI Academic Advisor Demo</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Student Context</h2>
        <div className="bg-gray-100 p-4 rounded">
          <p><strong>Name:</strong> {sampleStudentContext.name}</p>
          <p><strong>Current GPA:</strong> {sampleStudentContext.currentGPA}</p>
          <p><strong>Target GPA:</strong> {sampleStudentContext.targetGPA}</p>
          <p><strong>Total Credits:</strong> {sampleStudentContext.totalCredits}</p>
          <p><strong>Academic History:</strong></p>
          <ul className="pl-6 list-disc">
            {sampleStudentContext.academicHistory.map((term, index) => (
              <li key={index}>
                {term.semester}: GPA {term.gpa} ({term.credits} credits)
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Available Courses</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Course Code</th>
                <th className="py-2 px-4 border-b">Name</th>
                <th className="py-2 px-4 border-b">Credits</th>
                <th className="py-2 px-4 border-b">Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {sampleCourses.map(course => (
                <tr key={course.code}>
                  <td className="py-2 px-4 border-b">{course.code}</td>
                  <td className="py-2 px-4 border-b">{course.name}</td>
                  <td className="py-2 px-4 border-b">{course.credits}</td>
                  <td className="py-2 px-4 border-b">{course.difficulty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">AI Actions</h2>
        <div className="flex gap-4">
          <button
            onClick={handleGradeRecommendations}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            disabled={isLoading}
          >
            Get Grade Recommendations
          </button>
          <button
            onClick={handleOptimalCourseLoad}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            disabled={isLoading}
          >
            Get Optimal Course Load
          </button>
        </div>
      </div>
      
      {isLoading && (
        <div className="mb-6">
          <p className="text-gray-600">Loading AI response...</p>
        </div>
      )}
      
      {error && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Error</h2>
          <div className="bg-red-100 p-4 rounded text-red-800">
            {error}
          </div>
        </div>
      )}
      
      {result && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">AI Response</h2>
          <div className="bg-blue-50 p-4 rounded whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIDemo; 