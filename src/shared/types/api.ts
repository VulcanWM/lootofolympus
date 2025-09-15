export type InitResponse = {
  type: 'init';
  postId: string;
  right: number;
  wrong: number;
  username: string;
  collectibles: string[];
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};
