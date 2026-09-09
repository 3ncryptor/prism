import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { resolveProtectedRouteRedirect } from "@/lib/auth/routeGuard";

export default auth((req) => {
  const redirectTo = resolveProtectedRouteRedirect({
    pathname: req.nextUrl.pathname,
    role: req.auth?.user?.role,
  });

  if (redirectTo) {
    return NextResponse.redirect(new URL(redirectTo, req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/student/:path*", "/admin/:path*"],
};
