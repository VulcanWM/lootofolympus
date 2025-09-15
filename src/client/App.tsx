import { useState } from 'react';
import { context } from '@devvit/web/client';
import { useCounter } from './hooks/useCounter';

export const App = () => {
  const { right, wrong, username, loading, collectibles, setState: setCounterState } = useCounter();

  type PostData = {
    name: string;
    setName: string;
    imageUrl: string;
    question: string;
    answer: string;
  };

  const postData = context.postData as unknown as PostData | undefined;

  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong' | 'tooLate' | 'alreadyGot' | 'alreadyFailed'>('idle');
  const [feedback, setFeedback] = useState<string>('');
  const [claimCount, setClaimCount] = useState<number>(0);
  const [maxClaims, setMaxClaims] = useState<number>(100);

  const checkAnswer = async () => {
    if (!postData) return;

    try {
      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: input }),
      });

      const data: {
        status: 'correct' | 'wrong' | 'tooLate' | 'alreadyGot' | 'alreadyFailed';
        message: string;
        collectible?: string;
        claimCount?: number;
        maxClaims?: number
      } = await res.json();

      // Update local status
      setStatus(data.status);
      setFeedback(data.message);

      if (data.claimCount !== undefined) setClaimCount(data.claimCount);
      if (data.maxClaims !== undefined) setMaxClaims(data.maxClaims);

      // Update collectibles, right/wrong counters
      setCounterState((prev) => {
        const newCollectibles = [...prev.collectibles];
        if (data.status === 'correct' && data.collectible && !newCollectibles.includes(data.collectible)) {
          newCollectibles.push(data.collectible);
        }

        return {
          ...prev,
          right: data.status === 'correct' ? prev.right + 1 : prev.right,
          wrong: data.status === 'wrong' ? prev.wrong + 1 : prev.wrong,
          collectibles: newCollectibles,
        };
      });
    } catch (err) {
      console.error('Failed to submit answer', err);
    }
  };

  const isLocked = status !== 'idle';

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#f8f1e1] to-[#e9dcc4] text-gray-900 p-6">
      {/* Item preview */}
      {postData?.imageUrl && (
        <img
          src={postData.imageUrl}
          alt={postData.name}
          className="w-32 h-32 object-contain mb-4 drop-shadow-lg"
        />
      )}

      {/* Question / input */}
      {(status === 'idle' || status === 'tooLate') && status !== 'tooLate' && (
        <>
          <h1 className="text-2xl font-bold text-center mb-2">{postData?.question ?? 'No question'}</h1>
          <p className="text-sm text-gray-700 italic mb-4">
            {postData?.setName ? `Set: ${postData.setName}` : ''}
          </p>

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
        </>
      )}

      {/* Feedback */}
      {status === 'correct' && <Feedback message={`✅ You claimed ${postData?.name}!`} color="green" />}
      {status === 'wrong' && <Feedback message={`❌ That’s not correct — item locked.`} color="red" />}
      {status === 'tooLate' && <Feedback message={`⚠️ Too late! Max ${maxClaims} people already claimed this item.`} color="yellow" />}
      {status === 'alreadyGot' && <Feedback message={`✅ You already claimed ${postData?.name}!`} color="green" />}
      {status === 'alreadyFailed' && <Feedback message={`❌ You already failed this item.`} color="red" />}

      {feedback && <p className="mt-2 text-gray-700 italic text-center">{feedback}</p>}
    </div>
  );
};

const Feedback = ({ message, color }: { message: string; color: string }) => (
  <div className={`mt-4 p-3 rounded-xl text-center ${color === 'green' ? 'bg-green-100 text-green-800' : color === 'red' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
    {message}
  </div>
);
