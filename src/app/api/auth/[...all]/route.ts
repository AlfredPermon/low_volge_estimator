import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { NextRequest, NextResponse } from 'next/server';

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

export async function POST(request: NextRequest) {
  if (/\/api\/auth\/sign-(?:up|in)(?:\/|$)/.test(request.nextUrl.pathname)) {
    return NextResponse.json(
      { error: 'Este endpoint no admite registro ni inicio de sesión público.' },
      { status: 403 }
    );
  }

  return handlers.POST(request);
}
