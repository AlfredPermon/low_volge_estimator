import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/seed-admin',
  '/api/auth/logout',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Permitir archivos estáticos de Next.js, favicons e imágenes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Permitir rutas públicas exentas
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 3. Verificar la cookie de sesión HTTP-only
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    // Para endpoints de API, devolver error 401 Unauthorized sin redirección HTML
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere iniciar sesión.' },
        { status: 401 }
      );
    }

    // Para páginas web, redirigir suavemente al /login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files (_next/static, _next/image, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
