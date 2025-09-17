import { useEffect, useState } from 'react';
import { context } from '@devvit/web/client';
import { useCounter } from './hooks/useCounter';
import { questions } from '../shared/lists';

// Utility: find image
const getImageForItem = (name?: string) => {
  if (!name) return undefined;
  const q = questions.find(q => q.name === name);
  return q?.imageUrl;
};

// Feedback box (animated)
const Feedback = ({ message, color }: { message: string; color: string }) => (
  <div
    className={`mt-4 p-3 rounded-xl text-center font-semibold border shadow-sm animate-fadeIn ${
      color === 'green'
        ? 'bg-green-100 text-green-800 border-green-300'
        : color === 'red'
          ? 'bg-red-100 text-red-800 border-red-300'
          : 'bg-yellow-100 text-yellow-800 border-yellow-300'
    }`}
  >
    {message}
    <style>
      {`
        @keyframes fadeIn {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}
    </style>
  </div>
);

// Profile page
const Profile = ({ username, collectibles, right, wrong, onBack }: any) => {
  // Group items by set
  const setsMap: Record<string, { name: string; imageUrl: string }[]> = {};
  questions.forEach(q => {
    if (!setsMap[q.setName]) setsMap[q.setName] = [];
    setsMap[q.setName].push({ name: q.name, imageUrl: q.imageUrl });
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf6e3] to-[#e6d3a3] text-gray-900 p-6 font-sans">
      {/* Header */}
      <header className="flex items-center justify-center bg-gradient-to-r from-[#cfa14a] to-[#9c6b30] text-white py-4 shadow-md rounded-b-xl mb-6">
        <img src="/trident.png" alt="Loot of Olympus" className="w-8 h-8 mr-2" />
        <h1 style={{ fontFamily: "'Cinzel Decorative', serif" }} className="text-3xl tracking-wide">Loot of Olympus</h1>
      </header>

      <div className="max-w-3xl mx-auto bg-white/90 rounded-xl shadow-lg p-6 border border-[#d6b370]">
        <h2 style={{ fontFamily: "'Cinzel Decorative', serif" }} className="text-2xl text-center mb-4">{username}’s Profile</h2>

        {/* Stats */}
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

        {/* Collectible sets */}
        {Object.entries(setsMap).map(([setName, items]) => (
          <div key={setName} className="mb-8">
            <h3 style={{ fontFamily: "'Cinzel Decorative', serif" }} className="text-xl mb-3">{setName}</h3>
            <div className="grid grid-cols-3 gap-4">
              {items.map(item => {
                const ownedNames = collectibles.map((c: any) =>
                  typeof c === 'string' ? c : c.name
                );
                const owned = ownedNames.includes(item.name);

                return (
                  <div
                    key={item.name}
                    className={`p-3 rounded-lg border text-center transition transform ${
                      owned
                        ? 'bg-[#fcf9f4] border-[#cfa14a] shadow-md hover:scale-105'
                        : 'bg-gray-200 border-gray-400 opacity-60 grayscale'
                    }`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-16 h-16 object-contain mx-auto mb-2"
                    />
                    <p style={{ fontFamily: "'Cinzel Decorative', serif" }} className="text-sm">
                      {owned ? item.name : 'Locked'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <button
          onClick={onBack}
          className="mt-6 px-4 py-2 rounded-xl bg-gradient-to-r from-[#cfa14a] to-[#9c6b30] hover:from-[#9c6b30] hover:to-[#cfa14a] text-white font-semibold shadow-lg transition"
        >
          ← Back
        </button>
      </div>
    </div>
  );
};

// Main App
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

  const postData = context.postData as typeof questions[number] | undefined;

  const [input, setInput] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'correct' | 'wrong' | 'tooLate' | 'alreadyGot' | 'alreadyFailed'
  >('idle');
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
        if (
          data.status === 'correct' &&
          data.collectible &&
          !newCollectibles.includes(data.collectible)
        ) {
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
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#fdf6e3] to-[#e6d3a3] text-gray-900">
        {/* Animated Icon */}
        <div className="animate-spin mb-6">
          <img
            src="/trident.png"
            alt="Loading"
            className="w-16 h-16 drop-shadow-md"
          />
        </div>

        {/* Title */}
        <h1
          style={{ fontFamily: "'Cinzel Decorative', serif" }}
          className="text-2xl mb-2 text-[#9c6b30] tracking-wide"
        >
          Loot of Olympus
        </h1>

        {/* Subtitle */}
        <p className="text-gray-700 italic">Summoning your challenge...</p>

        {/* Progress shimmer bar */}
        <div className="relative w-48 h-2 mt-6 bg-[#e6d3a3] rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#cfa14a] to-[#9c6b30] animate-[shimmer_2s_infinite]"></div>
        </div>

        <style>
          {`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-[shimmer_2s_infinite] {
            position: absolute;
            width: 50%;
            height: 100%;
            animation: shimmer 2s linear infinite;
          }
        `}
        </style>
      </div>
    );
  }

  // Profile page
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

  // Main quiz
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#fdf6e3] to-[#e6d3a3] text-gray-900 p-6 font-sans">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 flex items-center justify-center bg-gradient-to-r from-[#cfa14a] to-[#9c6b30] text-white py-3 shadow-md rounded-b-xl">
        <img src="/trident.png" alt="Loot of Olympus" className="w-7 h-7 mr-2" />
        <h1 style={{ fontFamily: "'Cinzel Decorative', serif" }} className="text-2xl tracking-wide">Loot of Olympus</h1>
      </header>

      {/* Profile button */}
      <div className="absolute top-20 right-4">
        <button
          onClick={() => setView('profile')}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#cfa14a] to-[#9c6b30] hover:from-[#9c6b30] hover:to-[#cfa14a] text-white font-semibold shadow-md transition"
        >
          Profile
        </button>
      </div>

      <div className="mt-28 flex flex-col items-center w-full max-w-xl bg-white/90 rounded-xl shadow-lg p-6 border border-[#d6b370]">
        {(status === 'alreadyGot' || status === 'correct') && (
          <div className="relative">
            <img
              src={getImageForItem(postData?.name)}
              alt={postData?.name}
              className="w-32 h-32 object-contain mb-4 drop-shadow-lg animate-pop"
            />
            {status === 'correct' && (
              <>
                <div className="sparkle top-0 left-10" />
                <div className="sparkle top-8 right-0" />
                <div className="sparkle bottom-0 left-6" />
              </>
            )}
          </div>
        )}

        {status === 'tooLate' && (
          <h2 style={{ fontFamily: "'Cinzel Decorative', serif" }} className="text-xl text-red-700 mb-2">
            ⛔ Too late — max claims reached
          </h2>
        )}
        {status === 'alreadyGot' && (
          <Feedback message={`✅ You already claimed ${postData?.name}`} color="green" />
        )}
        {status === 'alreadyFailed' && (
          <Feedback message={`❌ You already failed this item`} color="red" />
        )}

        {status === 'idle' && (
          <>
            <h2 style={{ fontFamily: "'Cinzel Decorative', serif" }} className="text-2xl text-center mb-2">
              {postData?.question}
            </h2>
            <p className="text-sm text-gray-700 italic mb-4">{postData?.setName}</p>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Your answer..."
                disabled={isLocked}
                className={`px-3 py-2 border border-[#d6b370] rounded-xl bg-[#fcf9f4] focus:outline-none focus:ring-2 focus:ring-[#cfa14a] text-gray-800 ${
                  isLocked ? 'bg-gray-200 cursor-not-allowed' : ''
                }`}
              />
              <button
                onClick={checkAnswer}
                disabled={isLocked || input.trim() === ''}
                className={`px-4 py-2 rounded-xl transition text-white font-semibold shadow-md ${
                  isLocked
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#cfa14a] to-[#9c6b30] hover:from-[#9c6b30] hover:to-[#cfa14a]'
                }`}
              >
                Submit
              </button>
            </div>
          </>
        )}

        {status === 'correct' && (
          <Feedback message={`✅ You claimed ${postData?.name}`} color="green" />
        )}
        {status === 'wrong' && (
          <Feedback message={`❌ Wrong answer — item locked`} color="red" />
        )}

        <p className="mt-4 text-sm text-gray-600">
          Claimed: {claimCount} / {maxClaims}
        </p>
        {(status != "correct" && status != "wrong" && status != "alreadyGot" && status != "alreadyFailed") && feedback && (
          <p className="mt-2 text-gray-700 italic text-center">{feedback}</p>
        )}
      </div>

      <style>
        {`
          @keyframes pop {
            0% { transform: scale(0.5) rotate(-15deg); opacity: 0; }
            60% { transform: scale(1.1) rotate(5deg); opacity: 1; }
            100% { transform: scale(1) rotate(0); }
          }
          .animate-pop {
            animation: pop 0.6s ease-out;
          }

          @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          .sparkle {
            position: absolute;
            width: 20px;
            height: 20px;
            background: radial-gradient(circle, #fff 0%, transparent 70%);
            border-radius: 50%;
            animation: sparkle 1s ease-out forwards;
          }
        `}
      </style>
    </div>
  );
};
