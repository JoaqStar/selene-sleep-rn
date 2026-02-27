import { CommunityPost } from '@/types';

export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post-1',
    board: 'Sleep',
    userName: 'Sarah M.',
    timeAgo: '2h ago',
    text: 'Finally tried the Cooling Pranayama at 3am last night and actually got back to sleep in under 20 mins. First time in weeks. Sharing in case anyone else needs it.',
    likes: 14,
    commentCount: 3,
    comments: [
      { id: 'c1', userName: 'Jo K.', text: 'This is so encouraging!', timeAgo: '1h ago' },
      { id: 'c2', userName: 'Maya R.', text: 'Going to try it tonight', timeAgo: '45m ago' },
      { id: 'c3', userName: 'Clara B.', text: 'Same experience here', timeAgo: '30m ago' },
    ],
  },
  {
    id: 'post-2',
    board: 'Sleep',
    userName: 'Jo K.',
    timeAgo: '5h ago',
    text: 'Does anyone else find that the 3am wake is actually kind of peaceful once you stop fighting it? It\'s almost becoming my favourite hour.',
    likes: 31,
    commentCount: 9,
    comments: [
      { id: 'c4', userName: 'Sarah M.', text: 'Yes! It took me a while but I actually look forward to it now.', timeAgo: '4h ago' },
      { id: 'c5', userName: 'Amara O.', text: 'The shift in perspective makes all the difference.', timeAgo: '3h ago' },
    ],
  },
  {
    id: 'post-3',
    board: 'Sleep',
    userName: 'Maya R.',
    timeAgo: 'Yesterday',
    text: 'Week 2 with Selene and I\'m sleeping through more often. Not every night but noticeably better. Thank you all \u{1F319}',
    likes: 22,
    commentCount: 5,
    comments: [
      { id: 'c6', userName: 'Priya S.', text: 'So happy for you!', timeAgo: '20h ago' },
    ],
  },
  {
    id: 'post-4',
    board: 'Symptoms & Treatments',
    userName: 'Clara B.',
    timeAgo: '3h ago',
    text: 'Has anyone tried lowering their room temperature significantly? I went from 20\u00B0C to 17\u00B0C and it made a real difference to the night sweats.',
    likes: 18,
    commentCount: 7,
    comments: [
      { id: 'c7', userName: 'Diane L.', text: 'Yes, temperature is everything. I also use a cooling pillow.', timeAgo: '2h ago' },
      { id: 'c8', userName: 'Sarah M.', text: 'Going to try this tonight.', timeAgo: '1h ago' },
    ],
  },
  {
    id: 'post-5',
    board: 'Symptoms & Treatments',
    userName: 'Amara O.',
    timeAgo: 'Yesterday',
    text: 'Finding out the 3am cortisol spike is a real biological thing changed how I feel about waking up. I stopped catastrophising and started just breathing.',
    likes: 26,
    commentCount: 11,
    comments: [
      { id: 'c9', userName: 'Jo K.', text: 'Knowledge is power. The articles here really helped me too.', timeAgo: '22h ago' },
    ],
  },
  {
    id: 'post-6',
    board: 'Symptoms & Treatments',
    userName: 'Priya S.',
    timeAgo: '2 days ago',
    text: 'My GP recommended magnesium glycinate for sleep and it\'s made a noticeable difference alongside the meditations.',
    likes: 19,
    commentCount: 8,
    comments: [
      { id: 'c10', userName: 'Clara B.', text: 'Which brand do you use?', timeAgo: '1 day ago' },
    ],
  },
  {
    id: 'post-7',
    board: 'Resources',
    userName: 'Diane L.',
    timeAgo: '4h ago',
    text: 'Recommending Why We Sleep by Matthew Walker to anyone who hasn\'t read it. Changed my whole perspective on what sleep actually is.',
    likes: 12,
    commentCount: 4,
    comments: [
      { id: 'c11', userName: 'Keiko T.', text: 'Seconding this. It\'s essential reading.', timeAgo: '3h ago' },
    ],
  },
  {
    id: 'post-8',
    board: 'Resources',
    userName: 'Keiko T.',
    timeAgo: 'Yesterday',
    text: 'The Huberman Lab podcast episode on cortisol and sleep timing explains so much about the 3am thing. Worth a listen.',
    likes: 15,
    commentCount: 6,
    comments: [
      { id: 'c12', userName: 'Amara O.', text: 'Just listened to this. Incredibly helpful.', timeAgo: '20h ago' },
    ],
  },
];

export const BOARDS = ['Sleep', 'Symptoms & Treatments', 'Resources'] as const;
