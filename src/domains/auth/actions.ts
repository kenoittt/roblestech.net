"use server"

import { redirect } from "next/navigation"
import { createSupabaseServer } from "@/lib/supabase/server"
import { DEMO_MODE } from "@/lib/env"

export type SignInState = { error?: string; email?: string }

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase()
  const password = String(form.get("password") ?? "")
  const next = String(form.get("next") ?? "/")
  if (!email || !password) return { error: "Enter your email and password.", email }

  const supabase = await createSupabaseServer()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return {
      email,
      error: error.message === "Invalid login credentials" ? "That email and password don't match." : error.message,
    }
  }
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/")
}

export async function signOut() {
  const supabase = await createSupabaseServer()
  await supabase.auth.signOut()
  redirect("/login")
}

/** Local demos only: hop between the sample accounts to show each role. */
export async function switchAccount(email: string) {
  if (!DEMO_MODE) throw new Error("Switching accounts is only available in a local demo.")
  const supabase = await createSupabaseServer()
  await supabase.auth.signOut()
  const { error } = await supabase.auth.signInWithPassword({ email, password: "rtc-demo-2026" })
  if (error) redirect("/login")
  redirect("/")
}
