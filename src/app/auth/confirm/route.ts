import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createSupabaseServer } from "@/lib/supabase/server"

// Invitation and password-reset links land here. The token is checked on the
// server, which starts the session; then the person chooses a password.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const nextParam = searchParams.get("next") ?? "/"
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/"

  const supabase = await createSupabaseServer()
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(next, request.url))
  }
  const url = new URL("/login", request.url)
  url.searchParams.set("error", "link")
  return NextResponse.redirect(url)
}
