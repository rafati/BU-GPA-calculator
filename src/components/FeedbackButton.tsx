'use client';

import { useState } from 'react';
import { IoMdChatboxes } from 'react-icons/io';
import FeedbackModal from './FeedbackModal';
import { useSession } from 'next-auth/react';

interface FeedbackButtonProps {
  studentId?: string | null;
}

export default function FeedbackButton({ studentId }: FeedbackButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: session } = useSession();
  
  const userEmail = session?.user?.email || 'Unknown';
  
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 z-40"
        aria-label="Send Feedback"
        title="Send Feedback"
      >
        <IoMdChatboxes size={24} />
      </button>
      
      {isModalOpen && (
        <FeedbackModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          userEmail={userEmail}
          studentId={studentId}
        />
      )}
    </>
  );
} 