'use client';

import { useState, useEffect } from 'react';

export default function TestPdfDisclaimerEndpoint() {
  const [disclaimerText, setDisclaimerText] = useState<string>('Loading...');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDisclaimer() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/pdf-disclaimer');
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        setDisclaimerText(data.disclaimer || 'No disclaimer text found');
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch PDF disclaimer');
        console.error('Error fetching PDF disclaimer:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDisclaimer();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">PDF Disclaimer API Test</h1>
      
      {isLoading ? (
        <p className="text-gray-500">Loading PDF disclaimer...</p>
      ) : error ? (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
          <p><strong>Error:</strong> {error}</p>
        </div>
      ) : (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">PDF Disclaimer Text:</h2>
          <div className="p-4 bg-gray-100 border border-gray-300 rounded">
            {disclaimerText}
          </div>
        </div>
      )}
      
      <div className="mt-8">
        <a href="/" className="text-blue-600 hover:underline">Back to Home</a>
      </div>
    </div>
  );
} 