import express from 'express';
import { InitResponse } from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const username = await reddit.getCurrentUsername();

      // await redis.del(`user:${username}:right`);
      // await redis.del(`user:${username}:wrong`);
      // await redis.del(`user:${username}:collectibles`);
      // await redis.del(`item:${postId}:claimed:${username}`);
      // await redis.del(`item:${postId}:failed:${username}`);
      // await redis.del(`item:${postId}:claimedUsers`);

      // Get user stats
      const [rightRaw, wrongRaw] = await Promise.all([
        redis.get(`user:${username}:right`),
        redis.get(`user:${username}:wrong`),
      ]);
      const right = rightRaw ? parseInt(rightRaw) : 0;
      const wrong = wrongRaw ? parseInt(wrongRaw) : 0;

      // Get all collectibles of the user
      const collectibles = await redis.hKeys(`user:${username}:collectibles`);

      // Get current post's collectible
      const postData = context.postData as unknown as { name: string };

      // Check if user owns this collectible already
      const alreadyOwns = postData?.name ? collectibles.includes(postData.name) : false;

      // Check if user has claimed this specific post/item
      const hasClaimed = await redis.exists(`item:${postId}:claimed:${username}`);
      const hasFailed = await redis.exists(`item:${postId}:failed:${username}`);

      // Check how many people have claimed this item (using zSet)
      const claimCount = await redis.zCard(`item:${postId}:claimedUsers`) ?? 0;
      const maxClaims = 10;
      const isClaimLimitReached = claimCount >= maxClaims;

      // Determine status to return to client
      let itemStatus: 'idle' | 'correct' | 'wrong' | 'tooLate' = 'idle';
      if (alreadyOwns) itemStatus = 'correct';
      else if (hasClaimed) itemStatus = 'correct';
      else if (hasFailed) itemStatus = 'wrong';
      else if (isClaimLimitReached) itemStatus = 'tooLate';

      res.json({
        type: 'init',
        postId,
        right,
        wrong,
        username: username ?? 'anonymous',
        collectibles,
        itemStatus,
        claimCount,
        maxClaims,
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, { status: 'correct' | 'wrong' | 'tooLate' | 'alreadyGot' | 'alreadyFailed'; message: string; collectible?: string; claimCount?: number }, { answer: string }>(
  '/api/answer',
  async (req, res) => {
    const { postId } = context;
    const username = await reddit.getCurrentUsername();
    const { answer } = req.body;

    if (!postId || !answer) {
      res.status(400).json({ status: 'wrong', message: 'Missing postId or answer' });
      return;
    }

    // Get all collectibles of the user
    const collectibles = await redis.hKeys(`user:${username}:collectibles`);

    // Get current post's collectible
    const postData = context.postData as unknown as { name: string, answer: string };

    // Check if user owns this collectible already
    const alreadyOwns = postData?.name ? collectibles.includes(postData.name) : false;
    if (alreadyOwns) {
      res.json({ status: 'alreadyGot', message: `You already claimed ${postData.name}`, collectible: postData.name });
      return;
    }

    // Check if user already answered this post
    const hasClaimed = await redis.exists(`item:${postId}:claimed:${username}`);
    const hasFailed = await redis.exists(`item:${postId}:failed:${username}`);
    if (hasClaimed) {
      res.json({ status: 'alreadyGot', message: 'You already got this item!', collectible: postData.name });
      return;
    }
    if (hasFailed) {
      res.json({ status: 'alreadyFailed', message: 'You already failed this item.' });
      return;
    }

    // Check claim limit
    const claimCount = await redis.zCard(`item:${postId}:claimedUsers`);
    const maxClaims = 10;
    if (claimCount >= maxClaims) {
      res.json({ status: 'tooLate', message: 'Too late! Max claims reached.', collectible: postData.name });
      return;
    }

    // Validate answer
    const correctAnswer = postData.answer.trim().toLowerCase();
    const isCorrect = answer.trim().toLowerCase() === correctAnswer;

    if (isCorrect) {
      await Promise.all([
        redis.incrBy(`user:${username}:right`, 1),
        redis.hSet(`user:${username}:collectibles`, { [postData.name]: '1' }),
        redis.set(`item:${postId}:claimed:${username}`, '1'),
        redis.zAdd(`item:${postId}:claimedUsers`, {
          score: Date.now(),
          member: username as string,
        })
      ]);

      const newClaimCount = await redis.zCard(`item:${postId}:claimedUsers`);

      res.json({
        status: 'correct',
        message: `You claimed ${postData.name}!`,
        collectible: postData.name,
        claimCount: newClaimCount
      });
    } else {
      await Promise.all([
        redis.incrBy(`user:${username}:wrong`, 1),
        redis.set(`item:${postId}:failed:${username}`, '1'),
      ]);
      res.json({ status: 'wrong', message: 'Wrong answer — item locked.' });
    }
  }
);


router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/scheduler/hourly-post-task', async (_req, res) => {
  try {
    const post = await createPost();
    console.log(`[Scheduler] Created hourly post ${post.id} at ${new Date().toISOString()}`);

    res.status(200).json({ status: 'ok', postId: post.id });
  } catch (err) {
    console.error('[Scheduler] Failed to create post', err);
    res.status(500).json({ status: 'error', message: err instanceof Error ? err.message : String(err) });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
