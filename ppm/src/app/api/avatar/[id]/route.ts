import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { createSupabaseServer } from "@/lib/supabase/server"

// Profile photos live in a private bucket. This streams one to a signed-in team
// member; the address carries a version (?v=) so a new photo replaces the cached one.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 })

  const supabase = await createSupabaseServer()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) return new NextResponse(null, { status: 401 })
  const { data: me } = await supabase.from("profiles").select("role,deactivated_at").eq("id", claims.claims.sub).single()
  if (!me || me.deactivated_at || !["super_admin", "admin", "staff"].includes(me.role)) {
    return new NextResponse(null, { status: 403 })
  }

  const { data, error } = await createSupabaseAdmin().storage.from("avatars").download(id)
  if (error || !data) return new NextResponse(null, { status: 404 })
  return new NextResponse(data, {
    headers: {
      "content-type": data.type || "image/jpeg",
      "cache-control": "private, max-age=31536000, immutable",
    },
  })
}
