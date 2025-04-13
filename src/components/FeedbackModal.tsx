'use client';

import { useState } from 'react';
import html2canvas from 'html2canvas';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  studentId?: string | null;
}

export default function FeedbackModal({ isOpen, onClose, userEmail, studentId }: FeedbackModalProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [includeScreenshot, setIncludeScreenshot] = useState(true);

  if (!isOpen) return null;

  const captureScreenshot = async (): Promise<string | null> => {
    if (!includeScreenshot) return null;
    
    try {
      // Targeting the main calculator container
      const calculatorElement = document.getElementById('root-container');
      
      if (!calculatorElement) {
        console.error('Could not find calculator element for screenshot');
        return null;
      }
      
      // Hide the feedback modal temporarily for the screenshot
      const feedbackModal = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50.flex.items-center.justify-center');
      if (feedbackModal) {
        (feedbackModal as HTMLElement).style.display = 'none';
      }
      
      // Capture the screenshot - simple approach
      const canvas = await html2canvas(calculatorElement, {
        logging: false,
        useCORS: true,
        scale: 1,
        allowTaint: true,
        backgroundColor: null
      });
      
      // Restore the feedback modal
      if (feedbackModal) {
        (feedbackModal as HTMLElement).style.display = 'flex';
      }
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png');
      console.log('Screenshot captured successfully');
      return dataUrl;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackText.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your feedback' });
      return;
    }
    
    setIsSubmitting(true);
    setStatusMessage(null);
    
    try {
      // Capture screenshot if enabled
      const screenshotDataUrl = await captureScreenshot();
      
      // Send feedback to the API
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedbackText,
          studentId,
          screenshotDataUrl,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }
      
      setStatusMessage({ type: 'success', text: 'Feedback submitted successfully!' });
      setFeedbackText('');
      
      // Close the modal after a short delay on success
      setTimeout(() => {
        onClose();
        setStatusMessage(null);
      }, 2000);
    } catch (error: any) {
      setStatusMessage({ type: 'error', text: error.message || 'An error occurred while submitting feedback' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Submit Feedback</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-1">
              Your Feedback
            </label>
            <textarea
              id="feedback"
              rows={5}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Please share your thoughts, suggestions, or report any issues..."
              disabled={isSubmitting}
            />
          </div>
          
          <div className="mb-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="include-screenshot"
                checked={includeScreenshot}
                onChange={(e) => setIncludeScreenshot(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <label htmlFor="include-screenshot" className="ml-2 text-sm text-gray-700">
                Include a screenshot of the calculator
              </label>
            </div>
          </div>
          
          <div className="text-sm text-gray-500 mb-4">
            <p>Your email ({userEmail}) will be included with this feedback.</p>
            {studentId && <p>Student ID ({studentId}) will be included.</p>}
          </div>
          
          {statusMessage && (
            <div className={`p-2 rounded-md mb-4 ${
              statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {statusMessage.text}
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 