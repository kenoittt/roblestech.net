import type { Metadata } from "next"
import Image from "next/image"
import { redirect } from "next/navigation"
import { createSupabaseServer } from "@/lib/supabase/server"
import { SetPasswordForm } from "@/domains/auth/components/set-password-form"

export const metadata: Metadata = { title: "Set your password" }

export default async function WelcomePage() {
  const supabase = await createSupabaseServer()
  const { data } = await supabase.auth.getClaims()
  const uid = data?.claims?.sub
  if (!uid) redirect("/login")
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", uid).single()
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-16">
      <div className="w-full max-w-[360px]">
        <Image src="/brand/rtc-mark-64.png" alt="Robles Technologies Corp." width={36} height={36} priority />
        <h1 className="mt-6 text-xl font-semibold tracking-[-0.015em] text-fg">
          {profile?.full_name ? `Welcome, ${profile.full_name.split(" ")[0]}` : "Welcome"}
        </h1>
        <p className="mt-1 text-sm text-fg-3">Choose a password. You'll use it with your email to sign in.</p>
        <SetPasswordForm />
      </div>
    </main>
  )
}
