import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password)
      return NextResponse.json({ error: 'username and password required' }, { status: 400 });

    const db = createServerClient();
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .eq('password', password)
      .single();

    if (error || !data)
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });

    // Never return the password to the client
    const { password: _pw, ...profile } = data;
    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
