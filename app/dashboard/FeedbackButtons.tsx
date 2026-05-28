'use client';

import { useState } from 'react';

export default function FeedbackButtons({ permitId }: { permitId: string }) {
  const [submitted, setSubmitted] = useState(false);

  const submitFeedback = async (rating: 1 | -1) => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permit_id: permitId, rating }),
      });
      setSubmitted(true);
    } catch (e) {
      console.error('Feedback failed', e);
    }
  };

  if (submitted) {
    return <div className="text-sm text-green-600">Thanks for your feedback!</div>;
  }

  return (
    <div className="flex gap-3 text-sm">
      <button
        onClick={() => submitFeedback(1)}
        className="px-3 py-1 border rounded hover:bg-green-50"
      >
        👍 Useful
      </button>
      <button
        onClick={() => submitFeedback(-1)}
        className="px-3 py-1 border rounded hover:bg-red-50"
      >
        👎 Not useful
      </button>
    </div>
  );
}
