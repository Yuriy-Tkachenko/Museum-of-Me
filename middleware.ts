import { analyticsEndpoint } from "@/lib/analytics";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const production = process.env.NODE_ENV === "production";
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
  const analyticsOrigin = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER === "plausible" && analyticsEndpoint() ? new URL(analyticsEndpoint()!).origin : "";
  const csp = [
    "default-src 'self'", `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval' https://challenges.cloudflare.com${production ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'", `img-src 'self' blob: data: https://images.pexels.com ${supabaseOrigin}`,
    `connect-src 'self' https://challenges.cloudflare.com ${supabaseOrigin} ${analyticsOrigin}${production ? "" : " ws: wss:"}`,
    "frame-src https://challenges.cloudflare.com", "font-src 'self' data:", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
    ...(production && process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const finish = (response: NextResponse) => {
    response.headers.set("Content-Security-Policy", csp);
    if (!request.nextUrl.pathname.startsWith("/api/")) response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const pathname = request.nextUrl.pathname;
  const protectedPath = pathname === "/create" || pathname.startsWith("/create/") || pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  if (!protectedPath && pathname !== "/auth") return finish(response);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    if (protectedPath && production) return finish(NextResponse.redirect(new URL("/auth", request.url)));
    return finish(response);
  }
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: Parameters<SetAllCookies>[0]) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        requestHeaders.set("cookie", request.cookies.toString());
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (protectedPath && !user) return finish(NextResponse.redirect(new URL("/auth", request.url)));
  if (user && pathname === "/auth") return finish(NextResponse.redirect(new URL("/dashboard", request.url)));
  return finish(response);
}

// Static assets are deployment artifacts. Keep them out of the
// request-specific CSP path so Vercel's CDN and the browser can cache them.
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images/|fonts/|models/).*)"] };
