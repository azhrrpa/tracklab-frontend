import { NextResponse, type NextRequest } from "next/server";

/** Name of the (HttpOnly, encrypted) session cookie set by the .NET backend at login. */
export const SESSION_COOKIE = "tl_at";

/**
 * Optimistic route protection: without a session cookie, app pages redirect to /login and the login
 * page redirects to the dashboard when already logged in. The backend still checks every API call;
 * this only avoids flashing a page the user can't use.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isLoginPage = pathname === "/login";

  if (!hasSession && !isLoginPage) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (hasSession && isLoginPage && !request.nextUrl.searchParams.has("expired")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except API calls, Next.js internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
