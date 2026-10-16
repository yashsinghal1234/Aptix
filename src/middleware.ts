import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  // CVE-2025-29927 mitigation: Drop and reject spoofed internal middleware subrequest headers
  if (request.headers.get('x-middleware-subrequest')) {
    return new NextResponse('Bad Request: Malformed internal routing header', { status: 400 });
  }

  const path = request.nextUrl.pathname;

  // Auth.js (Google SSO) endpoints manage their own state/nonce cookies
  if (path.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  if (!token) {
    // Redirect unauthenticated users trying to access staff dashboard to staff login
    if (path.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  const authResult = await requireAuth(undefined, token);

  if ('error' in authResult || !authResult.user) {
    const response = path.startsWith('/dashboard') 
      ? NextResponse.redirect(new URL('/admin/login', request.url))
      : NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('token');
    return response;
  }

  const { user, payload } = authResult;
  const role = user.role;
  const mustChangePassword = payload.mustChangePassword === true;

  // If user must change password, lock them to /admin/setup-password until completed
  if (mustChangePassword) {
    if (path !== '/admin/setup-password') {
      return NextResponse.redirect(new URL('/admin/setup-password', request.url));
    }
    return NextResponse.next();
  }

  // If user already changed password and visits /admin/setup-password, redirect to dashboard
  if (path === '/admin/setup-password') {
    if (role === 'OWNER') return NextResponse.redirect(new URL('/dashboard/owner', request.url));
    if (role === 'SETTER') return NextResponse.redirect(new URL('/dashboard/setter', request.url));
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If logged-in staff visits /admin/login, redirect to their dashboard
  if (path === '/admin/login') {
    if (role === 'OWNER') return NextResponse.redirect(new URL('/dashboard/owner', request.url));
    if (role === 'SETTER') return NextResponse.redirect(new URL('/dashboard/setter', request.url));
  }

  if (path.startsWith('/dashboard/owner')) {
    if (role !== 'OWNER') {
      if (role === 'SETTER') return NextResponse.redirect(new URL('/dashboard/setter', request.url));
      return NextResponse.redirect(new URL('/', request.url));
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
  matcher: ['/dashboard/:path*', '/admin/login', '/admin/setup-password', '/', '/api/:path*'],
};


