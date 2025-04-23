import { useCallback } from 'react';

// Define allowed event types to match the server-side types
const EventType = {
  LOGIN: 'LOGIN',
  STUDENT_LOAD: 'STUDENT_LOAD',
  SHARE: 'SHARE',
  PDF_DOWNLOAD: 'PDF_DOWNLOAD'
} as const;

/**
 * Hook to provide analytics tracking functions to client components
 */
export function useAnalytics() {
  /**
   * Track a client-side event
   */
  const trackEvent = useCallback(async (eventType: string, options: any = {}) => {
    try {
      // Only track events that are defined in the EventType enum to avoid DB errors
      if (!Object.values(EventType).includes(eventType as any)) {
        console.warn(`Event type "${eventType}" is not supported in the database schema. Skipping tracking.`);
        return;
      }

      // Get the base URL for API requests
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const apiUrl = `${baseUrl}/api/analytics`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType,
          ...options,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analytics tracking failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error tracking event:', error);
      return null;
    }
  }, []);

  /**
   * Track login events
   */
  const trackLogin = useCallback((userEmail?: string) => {
    return trackEvent(EventType.LOGIN as string, { userEmail });
  }, [trackEvent]);

  /**
   * Track student data loading
   */
  const trackStudentLoad = useCallback((studentId?: string) => {
    return trackEvent(EventType.STUDENT_LOAD as string, { studentId });
  }, [trackEvent]);

  /**
   * Track share link generation
   */
  const trackShare = useCallback((studentId?: string) => {
    return trackEvent(EventType.SHARE as string, { studentId });
  }, [trackEvent]);

  /**
   * Track PDF downloads
   */
  const trackPdfDownload = useCallback((studentId?: string) => {
    return trackEvent(EventType.PDF_DOWNLOAD as string, { studentId });
  }, [trackEvent]);

  return {
    trackEvent,
    trackLogin,
    trackStudentLoad,
    trackShare,
    trackPdfDownload
  };
} 