"use server"

import { redirect } from "next/navigation"
import { createSupabaseServer } from "@/lib/supabase/server"

export type SetPasswordState = { error?: string }

export async function setPassword(_prev: SetPasswordState, form: FormData): Promise<SetPasswordState> {
  const password = String(form.get("password") ?? "")
  const confirm = String(form.get("confirm") ?? "")
  if (password.length < 10) return { error: "Use at least 10 characters." }
  if (password !== confirm) return { error: "The two passwords don't match." }
  const supabase = await createSupabaseServer()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }
  redirect("/")
}
