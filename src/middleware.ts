import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const path = request.nextUrl.pathname;

  if (!token) {
    // Redirect unauthenticated users trying to access protected routes
    if (path.startsWith('/dashboard') || path === '/') {
      if (path === '/') return NextResponse.next(); // Home page handles login form itself
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  const payload = await verifyToken(token);

  if (!payload) {
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('token');
    return response;
  }

  const role = payload.role as string;

  if (path.startsWith('/dashboard/owner')) {
    if (role !== 'OWNER') {
      return NextResponse.redirect(new URL('/dashboard/setter', request.url));
    }
  }

  if (path.startsWith('/dashboard/setter')) {
    if (role !== 'OWNER' && role !== 'SETTER') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/'],
};
