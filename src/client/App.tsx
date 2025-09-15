import { useState } from 'react';
import { context } from '@devvit/web/client';
import { useCounter } from './hooks/useCounter';

export const App = () => {
  const { right, wrong, username, loading, collectibles, increment, decrement } = useCounter();

  type PostData = {
    name: string;
    setName: string;
    imageUrl: string;
    question: string;
    answer: string;
  };

  const postData = context.postData as unknown as PostData | undefined;

  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

  const checkAnswer = () => {
    if (!postData?.answer) return;
    if (input.trim().toLowerCase() === postData.answer.trim().toLowerCase()) {
      setStatus('correct');
    } else {
      setStatus('wrong'); // ❌ lock them out
    }
  };

  const isLocked = status === 'correct' || status === 'wrong';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#f8f1e1] to-[#e9dcc4] text-gray-900 p-6">
      {/* Question */}
      <h1 className="text-2xl font-bold text-center mb-2">
        {postData?.question ?? 'No question'}
      </h1>
      <p className="text-sm text-gray-700 italic mb-4">
        {postData?.setName ? `Set: ${postData.setName}` : ''}
      </p>

      {/* Input + button */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Your answer..."
          disabled={isLocked}
          className={`px-3 py-2 border border-[#d6b370] rounded-xl bg-[#fcf9f4] focus:outline-none focus:ring-2 focus:ring-[#c69c6d] text-gray-800 ${
            isLocked ? 'bg-gray-200 cursor-not-allowed' : ''
          }`}
        />
        <button
          onClick={checkAnswer}
          disabled={isLocked}
          className={`px-4 py-2 rounded-xl transition text-white ${
            isLocked
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-[#b5854a] hover:bg-[#8b5e34]'
          }`}
        >
          Submit
        </button>
      </div>

      {/* Feedback */}
      {status === 'correct' && (
        <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-xl">
          You claimed <b>{postData?.name}</b>!
        </div>
      )}
      {status === 'wrong' && (
        <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-xl">
          That’s not correct — item locked.
        </div>
      )}
    </div>
  );
};
