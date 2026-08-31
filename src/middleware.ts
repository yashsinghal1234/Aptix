import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const path = request.nextUrl.pathname;

  if (!token) {
    // Redirect unauthenticated users trying to access staff dashboard to staff login
    if (path.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  const payload = await verifyToken(token);

  if (!payload) {
    const response = path.startsWith('/dashboard') 
      ? NextResponse.redirect(new URL('/admin/login', request.url))
      : NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('token');
    return response;
  }

  const role = payload.role as string;
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
  matcher: ['/dashboard/:path*', '/admin/login', '/admin/setup-password', '/'],
};

