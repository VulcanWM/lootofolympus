import { useState, useEffect } from 'react';
import { InitResponse } from '../../shared/types/api';

interface CounterState {
  right: number;
  wrong: number;
  username: string | null;
  loading: boolean;
  collectibles: string[];
  itemStatus: 'idle' | 'correct' | 'wrong' | 'tooLate' | 'alreadyGot' | 'alreadyFailed';
  claimCount: number;
  maxClaims: number;
}

export const useCounter = () => {
  const [state, setState] = useState<CounterState>({
    right: 0,
    wrong: 0,
    username: null,
    loading: true,
    collectibles: [],
    itemStatus: 'idle',
    claimCount: 0,
    maxClaims: 100,
  });

  const [postId, setPostId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/init');
        const data: InitResponse = await res.json();
        setState({
          right: data.right,
          wrong: data.wrong,
          username: data.username,
          loading: false,
          collectibles: data.collectibles,
          itemStatus: data.itemStatus,
          claimCount: data.claimCount,
          maxClaims: data.maxClaims,
        });
        setPostId(data.postId);
      } catch (err) {
        console.error(err);
        setState((prev) => ({ ...prev, loading: false }));
      }
    };
    void init();
  }, []);

  return { ...state, setState };
};
