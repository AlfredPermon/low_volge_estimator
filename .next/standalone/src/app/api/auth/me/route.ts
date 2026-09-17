import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error in auth me API:', error);
    return NextResponse.json({ error: 'Error al verificar la sesión' }, { status: 500 });
  }
}
