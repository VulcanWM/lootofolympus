import { useEffect, useState } from 'react';
import { context } from '@devvit/web/client';
import { useCounter } from './hooks/useCounter';
import { questions } from '../shared/lists';

// Find image from questions list
const getImageForItem = (name?: string) => {
  if (!name) return undefined;
  const q = questions.find(q => q.name === name);
  return q?.imageUrl;
};


// Feedback component
const Feedback = ({ message, color }: { message: string; color: string }) => (
  <div className={`mt-4 p-3 rounded-xl text-center ${
    color === 'green' ? 'bg-green-100 text-green-800' :
      color === 'red' ? 'bg-red-100 text-red-800' :
        'bg-yellow-100 text-yellow-800'
  }`}>
    {message}
  </div>
);

// Profile component
const Profile = ({ username, collectibles, right, wrong, onBack }: any) => {
  // Group items by set
  const setsMap: Record<string, { name: string; imageUrl: string }[]> = {};
  questions.forEach(q => {
    if (!setsMap[q.setName]) setsMap[q.setName] = [];
    setsMap[q.setName].push({ name: q.name, imageUrl: q.imageUrl });
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f1e1] to-[#e9dcc4] text-gray-900 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-4">{username}’s Profile</h1>

        <div className="flex justify-around mb-6">
          <div className="text-center">
            <p className="font-semibold">Right</p>
            <p className="text-green-700 font-bold">{right}</p>
          </div>
          <div className="text-center">
            <p className="font-semibold">Wrong</p>
            <p className="text-red-700 font-bold">{wrong}</p>
          </div>
          <div className="text-center">
            <p className="font-semibold">Collectibles</p>
            <p className="text-yellow-700 font-bold">{collectibles.length}</p>
          </div>
        </div>

        {Object.entries(setsMap).map(([setName, items]) => (
          <div key={setName} className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{setName}</h2>
            <div className="grid grid-cols-3 gap-4">
              {items.map(item => {
                const ownedNames = collectibles.map(c => (typeof c === 'string' ? c : c.name));
                const owned = ownedNames.includes(item.name);

                return (
                  <div
                    key={item.name}
                    className={`p-3 rounded-lg border text-center ${
                      owned ? 'bg-[#fcf9f4] border-[#d6b370]' : 'bg-gray-200 border-gray-400'
                    }`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className={`w-16 h-16 object-contain mx-auto mb-2 ${owned ? '' : 'opacity-40 grayscale'}`}
                    />
                    <p className="text-sm">{owned ? item.name : 'Locked'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <button
          onClick={onBack}
          className="mt-6 px-4 py-2 rounded-xl bg-gray-500 hover:bg-gray-700 text-white transition"
        >
          Back
        </button>
      </div>
    </div>
  );
};

// Main App component
export const App = () => {
  const {
    right,
    wrong,
    username,
    loading,
    collectibles,
    itemStatus,
    claimCount: initClaimCount,
    maxClaims,
    setState: setCounterState,
  } = useCounter();

  console.log(collectibles)

  const postData = context.postData as typeof questions[number] | undefined;

  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong' | 'tooLate' | 'alreadyGot' | 'alreadyFailed'>('idle');
  const [feedback, setFeedback] = useState('');
  const [claimCount, setClaimCount] = useState(0);
  const [view, setView] = useState<'main' | 'profile'>('main');

  useEffect(() => {
    if (!loading) {
      switch (itemStatus) {
        case 'correct':
          setStatus('alreadyGot');
          break;
        case 'wrong':
          setStatus('alreadyFailed');
          break;
        case 'tooLate':
          setStatus('tooLate');
          break;
        default:
          setStatus('idle');
      }
      setClaimCount(initClaimCount ?? 0);
    }
  }, [loading, itemStatus, initClaimCount]);

  const checkAnswer = async () => {
    if (!postData || status !== 'idle') return;

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
        maxClaims?: number;
      } = await res.json();

      setStatus(data.status);
      setFeedback(data.message);

      if (typeof data.claimCount === 'number') setClaimCount(data.claimCount);

      setCounterState(prev => {
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
      console.error(err);
      setFeedback((err as Error)?.message ?? 'Submission failed');
    }
  };

  const isLocked = status !== 'idle';

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  // Show Profile page
  if (view === 'profile') {
    return (
      <Profile
        username={username}
        collectibles={collectibles}
        right={right}
        wrong={wrong}
        onBack={() => setView('main')}
      />
    );
  }

  // Main quiz page
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#f8f1e1] to-[#e9dcc4] text-gray-900 p-6">

      {/* Profile button top-right */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setView('profile')}
          className="px-4 py-2 bg-[#b5854a] hover:bg-[#8b5e34] text-white rounded-xl shadow-lg"
        >
          Profile
        </button>
      </div>

      {(status === "alreadyGot" || status === "correct") && (
        <img
          src={getImageForItem(postData?.name)}
          alt={postData?.name}
          className="w-32 h-32 object-contain mb-4 drop-shadow-lg"
        />
      )}

      {status === 'tooLate' && <h2 className="text-xl font-semibold text-red-700">⛔ Too late — max claims reached</h2>}
      {status === 'alreadyGot' && <Feedback message={`✅ You already claimed ${postData?.name}`} color="green" />}
      {status === 'alreadyFailed' && <Feedback message={`❌ You already failed this item`} color="red" />}

      {status === 'idle' && (
        <>
          <h1 className="text-2xl font-bold text-center mb-2">{postData?.question}</h1>
          <p className="text-sm text-gray-700 italic mb-4">{postData?.setName}</p>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Your answer..."
              disabled={isLocked}
              className={`px-3 py-2 border border-[#d6b370] rounded-xl bg-[#fcf9f4] focus:outline-none focus:ring-2 focus:ring-[#c69c6d] text-gray-800 ${
                isLocked ? 'bg-gray-200 cursor-not-allowed' : ''
              }`}
            />
            <button
              onClick={checkAnswer}
              disabled={isLocked || input.trim() === ''}
              className={`px-4 py-2 rounded-xl transition text-white ${
                isLocked ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#b5854a] hover:bg-[#8b5e34]'
              }`}
            >
              Submit
            </button>
          </div>
        </>
      )}

      {status === 'correct' && <Feedback message={`✅ You claimed ${postData?.name}`} color="green" />}
      {status === 'wrong' && <Feedback message={`❌ Wrong answer — item locked`} color="red" />}

      <p className="mt-4 text-sm text-gray-600">Claimed: {claimCount} / {maxClaims}</p>
      {feedback && <p className="mt-2 text-gray-700 italic text-center">{feedback}</p>}
    </div>
  );
};
