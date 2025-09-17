import { useEffect, useState } from 'react';
import type { InitResponse } from '../../shared/types/api';

interface CounterState {
  right: number;
  wrong: number;
  username: string | null;
  loading: boolean;
  collectibles: string[];
  itemStatus: 'idle' | 'correct' | 'wrong' | 'tooLate';
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
    maxClaims: 10,
  });
  const [postId, setPostId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const res = await fetch('/api/init');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: InitResponse = await res.json();
        if (data.type !== 'init') throw new Error('Unexpected response');

        if (!mounted) return;
        setState({
          right: data.right,
          wrong: data.wrong,
          username: data.username,
          loading: false,
          collectibles: Array.isArray(data.collectibles) ? data.collectibles : [],
          itemStatus: data.itemStatus,
          claimCount: typeof data.claimCount === 'number' ? data.claimCount : 0,
          maxClaims: typeof data.maxClaims === 'number' ? data.maxClaims : 10,
        });
        setPostId(data.postId);
      } catch (err) {
        console.error('Failed to init counter', err);
        if (mounted) setState(prev => ({ ...prev, loading: false }));
      }
    };
    void init();
    return () => {
      mounted = false;
    };
  }, []);

  return {
    ...state,
    postId,
    setState, // App can update state after answer
  } as const;
};
