import { NextRequest, NextResponse } from 'next/server';

const AUTH_USERS = [
  {
    username: 'admin',
    password: 'password123',
    apiKey: 'lalala_key_can_use_guest_this_1@1',
  },
  {
    username: 'user',
    password: 'user456',
    apiKey: 'lalala_key_can_use_guest_this_1@3',
  },
];

export type AuthedUser = { username: string } | null;

export function checkAuth(req: NextRequest): AuthedUser {
  // 1) x-api-key
  const apiKey = req.headers.get('x-api-key');
  if (apiKey) {
    const user = AUTH_USERS.find((u) => u.apiKey === apiKey);
    if (user) return { username: user.username };
  }
  // 2) Basic
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    const base64 = auth.split(' ')[1]!;
    const [username, password] = Buffer.from(base64, 'base64')
      .toString('utf8')
      .split(':');
    const user = AUTH_USERS.find(
      (u) => u.username === username && u.password === password
    );
    if (user) return { username: user.username };
  }
  return null;
}

export function requireAuth(req: NextRequest) {
  const user = checkAuth(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  return user;
}

// Optional login util
export function login(username: string, password: string) {
  const user = AUTH_USERS.find(
    (u) => u.username === username && u.password === password
  );
  if (!user) return null;
  return { apiKey: user.apiKey, user: { username: user.username } };
}
