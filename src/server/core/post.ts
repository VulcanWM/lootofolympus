import { context, reddit } from '@devvit/web/server';
import { questions } from '../../shared/lists';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  const question = questions[Math.floor(Math.random() * questions.length)]!;

  const now = new Date();
  const datetime = `${now.getDate().toString().padStart(2, '0')} ${now.toLocaleString('en-GB', { month: 'short' })} ${now.getFullYear()} @ ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

  return await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'Loot of Olympus',
      buttonLabel: 'Claim Collectible',
      heading: 'Be the first to answer this new question!',
      appIconUri: 'icon.png',
      backgroundUri: 'background.png'
    },
    subredditName: subredditName,
    title: `⚡ Loot of Olympus – ${datetime} ⚡`,
    postData: {
      name: question.name,
      setName: question.setName,
      imageUrl: question.imageUrl,
      question: question.question,
      answer: question.answer,
    }
  });
};
