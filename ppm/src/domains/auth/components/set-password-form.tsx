"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { PasswordInput } from "@/components/app/password-input"
import { fieldClass } from "@/components/ui/field"
import { setPassword, type SetPasswordState } from "../password-actions"

const input = fieldClass

export function SetPasswordForm() {
  const [state, action, pending] = useActionState<SetPasswordState, FormData>(setPassword, {})
  return (
    <form action={action} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-fg-2">New password</span>
        <PasswordInput name="password" autoComplete="new-password" minLength={10} required className={input} />
        <span className="text-xs text-fg-4">At least 10 characters.</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-fg-2">Type it again</span>
        <PasswordInput name="confirm" autoComplete="new-password" required className={input} />
      </label>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" size="lg" disabled={pending} className="mt-1 h-9 w-full">
        {pending ? "Saving…" : "Save and continue"}
      </Button>
    </form>
  )
}
