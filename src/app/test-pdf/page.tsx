'use client';

import { useState, useEffect } from 'react';
import { generatePDF } from '@/components/PDFGenerator';

export default function TestPDFGeneration() {
  const [pdfDisclaimerText, setPdfDisclaimerText] = useState<string>('Loading PDF disclaimer...');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPdfDisclaimer() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/pdf-disclaimer');
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        setPdfDisclaimerText(data.disclaimer || 'No PDF disclaimer text found');
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch PDF disclaimer');
        console.error('Error fetching PDF disclaimer:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPdfDisclaimer();
  }, []);

  const handleGeneratePDF = () => {
    try {
      // Sample data to test PDF generation
      generatePDF({
        studentId: 'TEST-STUDENT',
        baseData: {
          overallCredits: 90,
          overallPoints: 270,
          overallGPA: 3.0,
          majorCredits: 45,
          majorPoints: 135,
          majorGPA: 3.0
        },
        semesterGPA: {
          overallGPA: 3.5,
          overallCredits: 15,
          majorGPA: 3.5,
          majorCredits: 9
        },
        projectedGPA: {
          overallGPA: 3.1,
          finalOverallCredits: 105,
          majorGPA: 3.1,
          finalMajorCredits: 54
        },
        targetGPA: {
          overall: 3.5,
          major: 3.5
        },
        requiredSemesterInfo: {
          overallDisplay: "Required: 4.0 (Based on 15 GPA credits)",
          majorDisplay: "Required: 4.0 (Based on 9 Major GPA credits)",
          isOverallImpossible: false,
          isMajorImpossible: false,
          finalCumulativeOverallCredits: 105,
          finalCumulativeMajorCredits: 54
        },
        courses: [
          {
            id: "TEST-101",
            catalogKey: "TEST-101",
            credits: 3,
            selectedGrade: "A",
            isMajor: true,
            isRepeat: false
          },
          {
            id: "TEST-102",
            catalogKey: "TEST-102",
            credits: 3,
            selectedGrade: "B+",
            isMajor: true,
            isRepeat: false
          },
          {
            id: "TEST-103",
            catalogKey: "TEST-103",
            credits: 3,
            selectedGrade: "A-",
            isMajor: true,
            isRepeat: false
          }
        ],
        disclaimer: pdfDisclaimerText
      });

      console.log("PDF generation triggered with disclaimer:", pdfDisclaimerText);
    } catch (error) {
      console.error("Error in PDF generation:", error);
      setError("Failed to generate PDF. See console for details.");
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test PDF Generation with Disclaimer</h1>
      
      {isLoading ? (
        <p className="text-gray-500">Loading PDF disclaimer...</p>
      ) : error ? (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
          <p><strong>Error:</strong> {error}</p>
        </div>
      ) : (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">PDF Disclaimer Text:</h2>
          <div className="p-4 bg-gray-100 border border-gray-300 rounded mb-6">
            {pdfDisclaimerText}
          </div>

          <button
            onClick={handleGeneratePDF}
            className="px-6 py-3 bg-blue-800 text-white rounded-md hover:bg-blue-900 transition-colors"
          >
            Generate Test PDF
          </button>
        </div>
      )}
      
      <div className="mt-8">
        <a href="/" className="text-blue-600 hover:underline">Back to Home</a>
      </div>
    </div>
  );
} 