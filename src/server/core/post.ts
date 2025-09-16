import { context, reddit } from '@devvit/web/server';
import { questions } from '../../shared/lists';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  const question = questions[Math.floor(Math.random() * questions.length)]!;

  return await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'lootofolympus',
    },
    subredditName: subredditName,
    title: 'lootofolympus',
    postData: {
      name: question.name,
      setName: question.setName,
      imageUrl: question.imageUrl,
      question: question.question,
      answer: question.answer,
    }
  });
};
