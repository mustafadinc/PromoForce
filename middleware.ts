import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!process.env.AUTH_SECRET) {
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");
  const isPublicPage =
    req.nextUrl.pathname.startsWith("/pricing") ||
    req.nextUrl.pathname.startsWith("/onboarding");
  const isPublicApi =
    req.nextUrl.pathname.startsWith("/api/cron") ||
    req.nextUrl.pathname.startsWith("/api/inngest") ||
    req.nextUrl.pathname.startsWith("/api/stripe");

  if (isAuthApi || isPublicApi) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isLoginPage && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
