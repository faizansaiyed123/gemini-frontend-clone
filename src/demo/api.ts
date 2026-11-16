export const DEMO_MOBILE = '9876543210';
export const DEMO_OTP = '246810';

const STORAGE_KEY = 'gemini_demo_store';
const TOKEN_KEY = 'gemini_token';
const DAILY_BASIC_LIMIT = 5;
const REPLY_DELAY_MS = 1100;

type DemoUser = {
  user_id: string;
  mobile: string;
  full_name: string;
  is_verified: boolean;
  created_at: string;
  password: string;
  subscription_tier: 'basic' | 'pro';
  message_day: string;
  message_count: number;
  otp?: string;
  otp_sent_at?: number;
};

type DemoRoom = {
  chatroom_id: string;
  name: string;
  created_at: string;
  user_id: string;
};

type DemoMessage = {
  message_id: string;
  content: string;
  sender: 'user' | 'ai';
  created_at: string;
};

type PendingReply = {
  room_id: string;
  content: string;
  due_at: number;
};

type DemoStore = {
  users: Record<string, DemoUser>;
  mobile_index: Record<string, string>;
  tokens: Record<string, string>;
  rooms: Record<string, DemoRoom>;
  messages: Record<string, DemoMessage[]>;
  pending: PendingReply[];
};

function createId(prefix: string) {
  const value =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : String(Date.now()) + '-' + Math.random().toString(16).slice(2);
  return prefix + '-' + value.slice(0, 12);
}

function seedStore(): DemoStore {
  const created = new Date().toISOString();
  const userId = 'demo-user-1';
  const roomId = 'demo-chat-1';

  return {
    users: {
      [userId]: {
        user_id: userId,
        mobile: DEMO_MOBILE,
        full_name: 'Avery Morgan',
        is_verified: true,
        created_at: created,
        password: 'DemoPass123!',
        subscription_tier: 'basic',
        message_day: new Date().toISOString().slice(0, 10),
        message_count: 0,
      },
    },
    mobile_index: {
      [DEMO_MOBILE]: userId,
    },
    tokens: {},
    rooms: {
      [roomId]: {
        chatroom_id: roomId,
        user_id: userId,
        name: 'A quick tour of your workspace',
        created_at: created,
      },
    },
    messages: {
      [roomId]: [
        {
          message_id: 'demo-message-user-1',
          content: 'What can I use this workspace for?',
          sender: 'user',
          created_at: created,
        },
        {
          message_id: 'demo-message-ai-1',
          content:
            'You can use this space to explore ideas, ask questions, draft plans, and keep conversations organized. Start a new chat whenever you want to explore a different topic.',
          sender: 'ai',
          created_at: created,
        },
      ],
    },
    pending: [],
  };
}

function readStore(): DemoStore {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as DemoStore;
  } catch {
    // A malformed or unavailable local store is replaced with fresh demo data.
  }

  const fresh = seedStore();
  writeStore(fresh);
  return fresh;
}

function writeStore(store: DemoStore) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function resetDemoData() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
}

function requestBody(init: RequestInit) {
  if (typeof init.body !== 'string') return {};
  try {
    return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getUser(store: DemoStore, tokenOverride?: string) {
  const token =
    tokenOverride ?? window.localStorage.getItem(TOKEN_KEY) ?? '';
  const userId = store.tokens[token] ?? token.replace('demo-access:', '');
  const user = store.users[userId];
  if (!user) {
    throw new Error('Your demo session has expired. Please sign in again.');
  }
  return user;
}

function assistantReply(content: string) {
  const lower = content.toLowerCase();

  if (lower.includes('rag') || lower.includes('retrieval')) {
    return [
      'Retrieval-Augmented Generation (RAG) gives a language model relevant external context before it writes an answer.',
      '',
      '1. **Ingest:** split source documents into useful chunks.',
      '2. **Index:** create embeddings and store them in a searchable vector index.',
      '3. **Retrieve:** search for chunks related to the user question.',
      '4. **Augment:** add the retrieved context to the model prompt.',
      '5. **Generate:** produce an answer grounded in that context.',
      '',
      'A good RAG system also measures retrieval quality, handles missing evidence, and avoids presenting unsupported answers as facts.',
      '',
      '_This is a deterministic response from the browser-only demo simulator._',
    ].join('\n');
  }

  if (
    lower.includes('python') ||
    lower.includes('javascript') ||
    lower.includes('typescript') ||
    lower.includes('code') ||
    lower.includes('program')
  ) {
    return [
      'A practical way to approach this is to make the smallest working version first, then improve it in clear steps.',
      '',
      '1. Define the expected input and output.',
      '2. Split the work into small, testable functions.',
      '3. Handle invalid input and failure cases explicitly.',
      '4. Add a focused test before expanding the implementation.',
      '',
      'This keeps the implementation understandable and makes regressions easier to isolate.',
      '',
      '_Demo response: no external AI provider was called._',
    ].join('\n');
  }

  if (
    lower.includes('plan') ||
    lower.includes('project') ||
    lower.includes('roadmap') ||
    lower.includes('learn')
  ) {
    return [
      'Here is a useful starting plan:',
      '',
      '1. Write down the outcome you want to achieve.',
      '2. Break it into milestones that can be verified.',
      '3. Complete one small milestone at a time.',
      '4. Review progress and adjust the next step using what you learned.',
      '',
      'Keep each milestone small enough to demonstrate and test independently.',
      '',
      '_This reply is generated locally by the demo simulator._',
    ].join('\n');
  }

  if (
    lower.includes('explain') ||
    lower.includes('what is') ||
    lower.includes('how does') ||
    lower.includes('why')
  ) {
    return [
      'The key idea is to understand the problem in layers: first identify the concept, then see how its parts interact, and finally apply it to a small example.',
      '',
      'A useful way to continue is to ask for one concrete example, then change one input and observe how the result changes.',
      '',
      '_This is a deterministic demo response, not a live Gemini or OpenAI call._',
    ].join('\n');
  }

  return [
    'I understand you want to explore: “' + content.slice(0, 180) + '”.',
    '',
    'A good next step is to clarify the outcome, identify the constraints, and work through one concrete example. You can continue the conversation with a more specific question.',
    '',
    '_Demo note: responses are generated locally and do not call an AI provider._',
  ].join('\n');
}

function materializeReplies(store: DemoStore) {
  const now = Date.now();
  const remaining: PendingReply[] = [];

  for (const pending of store.pending) {
    if (pending.due_at > now) {
      remaining.push(pending);
      continue;
    }

    const message: DemoMessage = {
      message_id: createId('message'),
      content: assistantReply(pending.content),
      sender: 'ai',
      created_at: new Date().toISOString(),
    };
    store.messages[pending.room_id] ??= [];
    store.messages[pending.room_id].push(message);
  }

  store.pending = remaining;
}

function ensureRoomAccess(
  store: DemoStore,
  roomId: string,
  user: DemoUser,
) {
  const room = store.rooms[roomId];
  if (!room || room.user_id !== user.user_id) {
    throw new Error('Chatroom not found.');
  }
  return room;
}

function requireMobile(value: unknown) {
  const mobile = String(value ?? '').trim();
  if (!/^\d{10,15}$/.test(mobile)) {
    throw new Error('Enter a valid mobile number using 10–15 digits.');
  }
  return mobile;
}

export async function demoRequest<T = unknown>(
  path: string,
  init: RequestInit = {},
  tokenOverride?: string,
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const cleanPath = decodeURI(path.split('?')[0]);
  const body = requestBody(init);
  const store = readStore();

  if (method === 'POST' && cleanPath === '/auth/signup') {
    const mobile = requireMobile(body.mobile);
    const password = String(body.password ?? '');
    if (password.length < 8) {
      throw new Error('Password must contain at least 8 characters.');
    }
    if (store.mobile_index[mobile]) {
      throw new Error('Mobile number already exists.');
    }

    const userId = createId('user');
    const user: DemoUser = {
      user_id: userId,
      mobile,
      full_name: String(body.full_name ?? '').trim() || 'Gemini demo user',
      is_verified: true,
      created_at: new Date().toISOString(),
      password,
      subscription_tier: 'basic',
      message_day: new Date().toISOString().slice(0, 10),
      message_count: 0,
    };
    store.users[userId] = user;
    store.mobile_index[mobile] = userId;
    const token = 'demo-access:' + userId;
    store.tokens[token] = userId;
    writeStore(store);
    return { user_id: userId, token } as T;
  }

  if (
    method === 'POST' &&
    (cleanPath === '/auth/send-otp' || cleanPath === '/auth/forgot-password')
  ) {
    const mobile = requireMobile(body.mobile);
    const userId = store.mobile_index[mobile];
    if (!userId) {
      throw new Error('User not found. Create a demo account first.');
    }
    const user = store.users[userId];
    user.otp = DEMO_OTP;
    user.otp_sent_at = Date.now();
    writeStore(store);
    return { otp: DEMO_OTP } as T;
  }

  if (method === 'POST' && cleanPath === '/auth/verify-otp') {
    const mobile = requireMobile(body.mobile);
    const userId = store.mobile_index[mobile];
    if (!userId) throw new Error('User not found.');
    const user = store.users[userId];
    if (
      user.otp !== String(body.otp ?? '') ||
      !user.otp ||
      Date.now() - (user.otp_sent_at ?? 0) > 300_000
    ) {
      throw new Error('Incorrect or expired OTP.');
    }
    user.is_verified = true;
    delete user.otp;
    delete user.otp_sent_at;
    const token = 'demo-access:' + userId;
    store.tokens[token] = userId;
    writeStore(store);
    return { access_token: token } as T;
  }

  if (method === 'POST' && cleanPath === '/auth/reset-password') {
    const user = getUser(store, tokenOverride);
    const password = String(body.new_password ?? '');
    if (password.length < 8) {
      throw new Error('Password must contain at least 8 characters.');
    }
    user.password = password;
    writeStore(store);
    return {} as T;
  }

  if (method === 'POST' && cleanPath === '/auth/change-password') {
    const user = getUser(store, tokenOverride);
    if (String(body.old_password ?? '') !== user.password) {
      throw new Error('Current password is incorrect.');
    }
    const password = String(body.new_password ?? '');
    if (password.length < 8) {
      throw new Error('Password must contain at least 8 characters.');
    }
    user.password = password;
    writeStore(store);
    return {} as T;
  }

  if (method === 'GET' && cleanPath === '/user/user/me') {
    const user = getUser(store, tokenOverride);
    return {
      user_id: user.user_id,
      mobile: user.mobile,
      full_name: user.full_name,
      is_verified: user.is_verified,
      created_at: user.created_at,
    } as T;
  }

  if (method === 'GET' && cleanPath === '/ChatRoom/chatroom') {
    const user = getUser(store, tokenOverride);
    const rooms = Object.values(store.rooms)
      .filter((room) => room.user_id === user.user_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(({ chatroom_id, name, created_at }) => ({
        chatroom_id,
        name,
        created_at,
      }));
    return rooms as T;
  }

  if (method === 'POST' && cleanPath === '/ChatRoom/chatroom') {
    const user = getUser(store, tokenOverride);
    const title = String(body.title ?? '').trim().slice(0, 100);
    if (!title) throw new Error('Chatroom title is required.');
    const roomId = createId('chatroom');
    store.rooms[roomId] = {
      chatroom_id: roomId,
      user_id: user.user_id,
      name: title,
      created_at: new Date().toISOString(),
    };
    store.messages[roomId] = [];
    writeStore(store);
    return { chatroom_id: roomId } as T;
  }

  const roomDetail = cleanPath.match(/^\/ChatRoom\/chatroom\/([^/]+)$/);
  if (method === 'GET' && roomDetail) {
    const user = getUser(store, tokenOverride);
    const roomId = roomDetail[1];
    const room = ensureRoomAccess(store, roomId, user);
    materializeReplies(store);
    writeStore(store);
    return {
      chatroom_id: room.chatroom_id,
      name: room.name,
      created_at: room.created_at,
      messages: store.messages[roomId] ?? [],
    } as T;
  }

  const sendMessage = cleanPath.match(/^\/message\/([^/]+)\/message$/);
  if (method === 'POST' && sendMessage) {
    const user = getUser(store, tokenOverride);
    const roomId = sendMessage[1];
    ensureRoomAccess(store, roomId, user);
    const content = String(body.content ?? '').trim();
    if (!content || content.length > 2000) {
      throw new Error('Message must contain between 1 and 2000 characters.');
    }

    const today = new Date().toISOString().slice(0, 10);
    if (user.message_day !== today) {
      user.message_day = today;
      user.message_count = 0;
    }
    if (
      user.subscription_tier === 'basic' &&
      user.message_count >= DAILY_BASIC_LIMIT
    ) {
      throw new Error(
        'Rate limit exceeded: Basic demo accounts can send 5 messages per day.',
      );
    }

    user.message_count += 1;
    const message: DemoMessage = {
      message_id: createId('message'),
      content,
      sender: 'user',
      created_at: new Date().toISOString(),
    };
    store.messages[roomId] ??= [];
    store.messages[roomId].push(message);
    store.pending.push({
      room_id: roomId,
      content,
      due_at: Date.now() + REPLY_DELAY_MS,
    });
    writeStore(store);
    return { message_id: message.message_id } as T;
  }

  if (method === 'GET' && cleanPath === '/subscribe/subscription/status') {
    const user = getUser(store, tokenOverride);
    return { subscription_tier: user.subscription_tier } as T;
  }

  if (method === 'POST' && cleanPath === '/subscribe/pro') {
    const user = getUser(store, tokenOverride);
    user.subscription_tier = 'pro';
    writeStore(store);
    const checkoutUrl = new URL(
      '/payment/success',
      window.location.origin,
    ).toString();
    return { checkout_url: checkoutUrl } as T;
  }

  throw new Error(
    'Demo API route is not implemented: ' + method + ' ' + cleanPath,
  );
}
