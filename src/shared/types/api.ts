export interface InitResponse {
  type: 'init';
  postId: string;
  right: number;
  wrong: number;
  username: string;
  collectibles: string[];
  itemStatus: 'idle' | 'correct' | 'wrong' | 'tooLate';
  claimCount: number;
  maxClaims: number;
}
