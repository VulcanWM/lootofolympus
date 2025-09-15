import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }



  return await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'lootofolympus',
    },
    subredditName: subredditName,
    title: 'lootofolympus',
    postData: {
      name: "name",
      setName: "setName",
      imageUrl: "imageUrl",
      question: "question",
      answer: "answer"
    }
  });
};
