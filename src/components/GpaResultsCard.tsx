'use client';

import React from 'react';
import Link from 'next/link';
import { useAnalytics } from '@/hooks/useAnalytics';

// Define types for the props
interface GpaResultsCardProps {
  semesterGPAInfo: {
    status: string;
    overallGPA: string;
    majorGPA: string;
    overallCredits: number;
    majorCredits: number;
  };
  projectedGPAInfo: {
    status: string;
    overallGPA: string;
    majorGPA: string;
    finalOverallCredits: number;
    finalMajorCredits: number;
  };
  requiredSemesterInfo: {
    status?: string;
    overallDisplay: string;
    majorDisplay: string;
    isOverallImpossible: boolean;
    isMajorImpossible: boolean;
    finalCumulativeOverallCredits?: number;
    finalCumulativeMajorCredits?: number;
  };
  baseGPAInfo: {
    overallGPA: string;
    majorGPA: string;
  };
  shareParams: Record<string, any>;
}

const GpaResultsCard: React.FC<GpaResultsCardProps> = ({
  semesterGPAInfo,
  projectedGPAInfo,
  requiredSemesterInfo,
  baseGPAInfo,
  shareParams
}) => {
  // State for active tab
  const [activeTab, setActiveTab] = React.useState('semester');
  
  // Get analytics tracking functions
  const analytics = useAnalytics();
  
  // Enhanced tab change handler with analytics
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Track tab change - Disabled to avoid SQL truncation errors
    // analytics.trackEvent('GPA_TAB_CHANGE', { 
    //   additionalData: { 
    //     tab, 
    //     studentId: shareParams?.studentId 
    //   } 
    // });
  };

  // Function to format GPA to three decimal places
  const formatGPA = (gpaString: string): string => {
    const numericValue = parseFloat(gpaString);
    return isNaN(numericValue) ? "N/A" : numericValue.toFixed(3);
  };

  // Function to extract numeric GPA from the display string and format to three decimal places
  const extractGpaNumber = (displayString: string): { value: string, isNegative: boolean } => {
    // Check if the string contains "points needed" which indicates points rather than GPA
    if (displayString.includes('points needed')) {
      // Updated pattern to handle negative values (-12.34 points needed)
      const pointsMatch = displayString.match(/([-]?\d+\.\d+) points needed/);
      if (pointsMatch) {
        const numericValue = parseFloat(pointsMatch[1]);
        return { 
          value: `${pointsMatch[1]} points`, 
          isNegative: numericValue < 0 
        };
      }
    }
    
    // Regular GPA extraction for normal cases, updated to handle negative values
    const matches = displayString.match(/([-]?\d+\.\d+)/);
    if (!matches) return { value: "N/A", isNegative: false };
    const numericValue = parseFloat(matches[0]);
    return { 
      value: isNaN(numericValue) ? "N/A" : numericValue.toFixed(3),
      isNegative: numericValue < 0
    };
  };

  // Function to extract credits from the display string
  const extractCreditsValue = (displayString: string): string => {
    // Pattern to match the exact format: "0.656 (Based on 16 GPA credits)"
    const creditsMatch = displayString.match(/Based on (\d+) GPA credits/);
    
    // For major credits, pattern would be "Based on X Major GPA credits"
    const majorCreditsMatch = displayString.match(/Based on (\d+) Major GPA credits/);
    
    if (creditsMatch) {
      return creditsMatch[1]; // Returns the number part (16)
    } else if (majorCreditsMatch) {
      return majorCreditsMatch[1]; // Returns the number part (7)
    }
    
    return "0"; // Default fallback
  };

  // New function to extract semester and total credits for display
  const extractSemesterCredits = (displayString: string): { semester: string, total: string } => {
    // For overall: "Overall: 0.656 (Based on 16 GPA credits)"
    const overallMatch = displayString.match(/Based on (\d+) GPA credits/);
    
    // For major: "Major: 0.357 (Based on 7 Major GPA credits)"
    const majorMatch = displayString.match(/Based on (\d+) Major GPA credits/);
    
    if (overallMatch) {
      return {
        semester: overallMatch[1],
        total: Math.round(requiredSemesterInfo.finalCumulativeOverallCredits || 0).toString()
      };
    } else if (majorMatch || displayString.includes("Major")) {
      return {
        semester: majorMatch ? majorMatch[1] : "0",
        total: Math.round(requiredSemesterInfo.finalCumulativeMajorCredits || 0).toString()
      };
    }
    
    return {
      semester: "0",
      total: "0"
    };
  };

  // Helper function to check if GPA is over 4.0
  const isGpaOverFour = (displayString: string): boolean => {
    // If the display contains "points needed", then it's not a GPA value over 4.0
    if (displayString.includes('points needed')) {
      return false;
    }
    
    // Extract the first number from the display string, which should be the GPA
    const matches = displayString.match(/([-]?\d+\.\d+)/);
    if (!matches) return false;
    
    const numericValue = parseFloat(matches[0]);
    console.log("GPA check:", displayString, numericValue, numericValue > 4.0);
    
    return numericValue > 4.0;
  };

  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      {/* Headers */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
        <h2 className="text-sm font-medium text-bu-blue flex items-center">
          <span className="mr-1">📊</span>
          GPA Results
        </h2>
        <div className="flex space-x-1">
          <Link
            href={{
              pathname: '/explanation',
              query: shareParams
            }}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              // Disabled to avoid SQL truncation errors
              // analytics.trackEvent('GPA_EXPLANATION_VIEW', { 
              //   additionalData: { studentId: shareParams?.studentId } 
              // });
            }}
          >
            Details
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b">
        <button 
          className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${activeTab === 'semester' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-600 hover:bg-gray-50'}`}
          onClick={() => handleTabChange('semester')}
        >
          Semester
        </button>
        <button 
          className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${activeTab === 'projected' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
          onClick={() => handleTabChange('projected')}
        >
          Projected
        </button>
        <button 
          className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${activeTab === 'target' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' : 'text-gray-600 hover:bg-gray-50'}`}
          onClick={() => handleTabChange('target')}
        >
          Target
        </button>
      </div>

      {/* Content Area */}
      <div className="p-3">
        {/* Semester GPA Tab */}
        {activeTab === 'semester' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-sm text-gray-800">Semester Planner GPA</h3>
              <span className="text-xs text-gray-500">GPA-affecting grades only</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Overall GPA Card */}
              <div className="p-3 rounded-lg bg-green-50 border border-green-100 flex flex-col items-center">
                <div className="text-xs font-medium text-gray-600 mb-1">Overall</div>
                <div className="text-2xl font-bold text-green-600">{formatGPA(semesterGPAInfo.overallGPA)}</div>
                <div className="text-xs text-gray-500 mt-1">Credits: {Math.round(semesterGPAInfo.overallCredits)}</div>
              </div>
              
              {/* Major GPA Card */}
              <div className="p-3 rounded-lg bg-green-50 border border-green-100 flex flex-col items-center">
                <div className="text-xs font-medium text-gray-600 mb-1">Major</div>
                <div className="text-2xl font-bold text-green-600">{formatGPA(semesterGPAInfo.majorGPA)}</div>
                <div className="text-xs text-gray-500 mt-1">Credits: {Math.round(semesterGPAInfo.majorCredits)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Projected GPA Tab */}
        {activeTab === 'projected' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-sm text-gray-800">Projected Cumulative GPA</h3>
              <span className="text-xs text-gray-500">With repeats applied</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Overall GPA Card */}
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 flex flex-col items-center">
                <div className="text-xs font-medium text-gray-600 mb-1">Overall</div>
                <div className="text-2xl font-bold text-blue-600">{formatGPA(projectedGPAInfo.overallGPA)}</div>
                <div className="flex flex-col items-center">
                  <div className="text-xs text-gray-500 mt-1">Base: {formatGPA(baseGPAInfo.overallGPA)}</div>
                  <div className="text-xs text-gray-500">Credits: {Math.round(projectedGPAInfo.finalOverallCredits)}</div>
                </div>
              </div>
              
              {/* Major GPA Card */}
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 flex flex-col items-center">
                <div className="text-xs font-medium text-gray-600 mb-1">Major</div>
                <div className="text-2xl font-bold text-blue-600">{formatGPA(projectedGPAInfo.majorGPA)}</div>
                <div className="flex flex-col items-center">
                  <div className="text-xs text-gray-500 mt-1">Base: {formatGPA(baseGPAInfo.majorGPA)}</div>
                  <div className="text-xs text-gray-500">Credits: {Math.round(projectedGPAInfo.finalMajorCredits)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Target/Required GPA Tab */}
        {activeTab === 'target' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-sm text-gray-800">Required Semester GPA</h3>
              <span className="text-xs text-gray-500">
                To reach {parseFloat(shareParams?.tO || '2.0').toFixed(3)} cum. GPA and {parseFloat(shareParams?.tM || '2.0').toFixed(3)} major GPA target
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Overall Target GPA Card */}
              <div className={`p-3 rounded-lg border flex flex-col items-center ${requiredSemesterInfo.isOverallImpossible ? 'bg-red-50 border-red-200' : 'bg-purple-50 border-purple-100'}`}>
                <div className="text-xs font-medium text-gray-600 mb-1">Required Semester GPA</div>
                <div className={`text-lg font-bold ${
                  requiredSemesterInfo.isOverallImpossible ? 'text-red-600' : 
                  extractGpaNumber(requiredSemesterInfo.overallDisplay).isNegative ? 'text-red-600' : 'text-purple-600'
                }`}>
                  {extractGpaNumber(requiredSemesterInfo.overallDisplay).value}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Based on {Math.round(requiredSemesterInfo.finalCumulativeOverallCredits || 0)} total credits
                </div>
                <div className="text-xs text-gray-500">
                  Based on {extractSemesterCredits(requiredSemesterInfo.overallDisplay).semester} semester credits
                </div>
              </div>
              
              {/* Major Target GPA Card */}
              <div className={`p-3 rounded-lg border flex flex-col items-center ${requiredSemesterInfo.isMajorImpossible ? 'bg-red-50 border-red-200' : 'bg-purple-50 border-purple-100'}`}>
                <div className="text-xs font-medium text-gray-600 mb-1">Required Semester Major GPA</div>
                <div className={`text-lg font-bold ${
                  requiredSemesterInfo.isMajorImpossible ? 'text-red-600' : 
                  extractGpaNumber(requiredSemesterInfo.majorDisplay).isNegative ? 'text-red-600' : 'text-purple-600'
                }`}>
                  {extractGpaNumber(requiredSemesterInfo.majorDisplay).value}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Based on {Math.round(requiredSemesterInfo.finalCumulativeMajorCredits || 0)} major credits
                </div>
                <div className="text-xs text-gray-500">
                  Based on {extractSemesterCredits(requiredSemesterInfo.majorDisplay).semester} major semester credits
                </div>
              </div>
            </div>
            
            {/* Warning for impossible targets or zero credits */}
            {(requiredSemesterInfo.isOverallImpossible || 
              requiredSemesterInfo.isMajorImpossible || 
              isGpaOverFour(requiredSemesterInfo.overallDisplay) ||
              isGpaOverFour(requiredSemesterInfo.majorDisplay) ||
              extractSemesterCredits(requiredSemesterInfo.overallDisplay).semester === "0" ||
              extractSemesterCredits(requiredSemesterInfo.majorDisplay).semester === "0") && 
              // Only exclude warnings when BOTH values are negative
              !(extractGpaNumber(requiredSemesterInfo.overallDisplay).isNegative && 
                extractGpaNumber(requiredSemesterInfo.majorDisplay).isNegative) && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 text-center">
                {(() => {
                  // Check for GPAs over 4.0 first
                  if (isGpaOverFour(requiredSemesterInfo.overallDisplay) || requiredSemesterInfo.isOverallImpossible) {
                    if (isGpaOverFour(requiredSemesterInfo.majorDisplay) || requiredSemesterInfo.isMajorImpossible) {
                      return "Both overall and major target GPAs require semester GPAs above 4.0, which is impossible. Consider adding more courses or lowering your targets.";
                    }
                    return "The overall target GPA requires a semester GPA above 4.0, which is impossible. Consider adding more courses or lowering your target.";
                  }
                  
                  if (isGpaOverFour(requiredSemesterInfo.majorDisplay) || requiredSemesterInfo.isMajorImpossible) {
                    return "The major target GPA requires a semester GPA above 4.0, which is impossible. Consider adding more major courses or lowering your target.";
                  }
                  
                  // Then check for zero credits cases
                  if (extractSemesterCredits(requiredSemesterInfo.overallDisplay).semester === "0" && 
                      extractSemesterCredits(requiredSemesterInfo.majorDisplay).semester === "0") {
                    return "Target GPA calculation requires at least one course with a grade that affects GPA. Please add courses to your planner.";
                  }
                  
                  if (extractSemesterCredits(requiredSemesterInfo.overallDisplay).semester === "0") {
                    return "Overall target GPA calculation requires courses with grades that affect GPA. Please add non-major courses to your planner.";
                  }
                  
                  if (extractSemesterCredits(requiredSemesterInfo.majorDisplay).semester === "0") {
                    return "Major target GPA calculation requires major courses with grades that affect GPA. Please add major courses to your planner.";
                  }
                  
                  // Default case
                  return "Target GPA appears to be impossible to achieve with current course load. Consider adding more courses or adjusting your target.";
                })()}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Dynamic Footer based on active tab */}
      {activeTab === 'semester' && (
        <div className="px-3 py-2 bg-gray-50 border-t grid grid-cols-2 text-center">
          <div className="border-r">
            <div className="text-xs text-gray-500">Projected: CUM/Major</div>
            <div className="font-medium text-sm text-blue-600">
              {formatGPA(projectedGPAInfo.overallGPA)} / {formatGPA(projectedGPAInfo.majorGPA)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Target: CUM/Major</div>
            <div className={`font-medium text-sm ${requiredSemesterInfo.isOverallImpossible ? 'text-red-600' : 'text-purple-600'}`}>
              <span className={extractGpaNumber(requiredSemesterInfo.overallDisplay).isNegative ? 'text-red-600' : ''}>
                {extractGpaNumber(requiredSemesterInfo.overallDisplay).value}
              </span> / 
              <span className={extractGpaNumber(requiredSemesterInfo.majorDisplay).isNegative ? 'text-red-600' : ''}>
                {extractGpaNumber(requiredSemesterInfo.majorDisplay).value}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'projected' && (
        <div className="px-3 py-2 bg-gray-50 border-t grid grid-cols-2 text-center">
          <div className="border-r">
            <div className="text-xs text-gray-500">Semester: CUM/Major</div>
            <div className="font-medium text-sm text-green-600">
              {formatGPA(semesterGPAInfo.overallGPA)} / {formatGPA(semesterGPAInfo.majorGPA)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Target: CUM/Major</div>
            <div className={`font-medium text-sm ${requiredSemesterInfo.isOverallImpossible ? 'text-red-600' : 'text-purple-600'}`}>
              <span className={extractGpaNumber(requiredSemesterInfo.overallDisplay).isNegative ? 'text-red-600' : ''}>
                {extractGpaNumber(requiredSemesterInfo.overallDisplay).value}
              </span> / 
              <span className={extractGpaNumber(requiredSemesterInfo.majorDisplay).isNegative ? 'text-red-600' : ''}>
                {extractGpaNumber(requiredSemesterInfo.majorDisplay).value}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'target' && (
        <div className="px-3 py-2 bg-gray-50 border-t grid grid-cols-2 text-center">
          <div className="border-r">
            <div className="text-xs text-gray-500">Semester: CUM/Major</div>
            <div className="font-medium text-sm text-green-600">
              {formatGPA(semesterGPAInfo.overallGPA)} / {formatGPA(semesterGPAInfo.majorGPA)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Projected: CUM/Major</div>
            <div className="font-medium text-sm text-blue-600">
              {formatGPA(projectedGPAInfo.overallGPA)} / {formatGPA(projectedGPAInfo.majorGPA)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GpaResultsCard; 