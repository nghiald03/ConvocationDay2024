import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }
    const result = login(username, password);
    if (!result)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    return NextResponse.json({ message: 'Login successful', ...result });
  } catch (e) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
