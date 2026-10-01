import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env"

// Refreshes the session cookie on every request and sends signed-out visitors
// to the sign-in page. Roles are checked where data is read, not here.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)
  const { pathname, search } = request.nextUrl
  const isPublic = pathname === "/login" || pathname.startsWith("/auth/")

  if (!signedIn && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`
    return NextResponse.redirect(url)
  }
  if (signedIn && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
