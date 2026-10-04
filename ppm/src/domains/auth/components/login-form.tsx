"use client"

import { useActionState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/app/avatar"
import { PasswordInput } from "@/components/app/password-input"
import { signIn, type SignInState } from "../actions"

const SAMPLE_ACCOUNTS = [
  { id: "00000000-0000-4000-a000-000000000003", name: "Kyan Lumanog", email: "kyan@rtc.test", role: "Admin" },
  { id: "00000000-0000-4000-a000-000000000001", name: "Kenneth Robles", email: "kenneth@rtc.test", role: "Super admin" },
  { id: "00000000-0000-4000-a000-000000000005", name: "Carl", email: "carl@rtc.test", role: "Staff" },
]

export function LoginForm({ next, demo }: { next: string; demo: boolean }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {})
  const email = useRef<HTMLInputElement>(null)
  const password = useRef<HTMLInputElement>(null)
  const form = useRef<HTMLFormElement>(null)

  const signInAs = (address: string) => {
    if (!email.current || !password.current) return
    email.current.value = address
    password.current.value = "rtc-demo-2026"
    form.current?.requestSubmit()
  }

  return (
    <>
      <form ref={form} action={action} className="mt-8 flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <Field label="Email">
          <input
            ref={email}
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            placeholder="you@roblestech.net"
            className="h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-4 focus:border-brand"
          />
        </Field>
        <Field label="Password">
          <PasswordInput
            ref={password}
            name="password"
            autoComplete="current-password"
            required
            className="h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-fg outline-none transition-colors focus:border-brand"
          />
        </Field>
        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending} className="mt-1 h-9 w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-xs text-fg-3">New here? Ask an admin to invite you. The invitation email sets your password.</p>

      {demo && (
        <div className="mt-10 border-t border-line pt-5">
          <p className="text-xs font-medium text-fg-3">Local preview: sign in as</p>
          <div className="mt-2 flex flex-col">
            {SAMPLE_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => signInAs(a.email)}
                disabled={pending}
                className="pressable -mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-hover"
              >
                <Avatar id={a.id} name={a.name} size="md" />
                <span className="text-fg">{a.name}</span>
                <span className="ml-auto text-xs text-fg-3">{a.role}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fg-2">{label}</span>
      {children}
    </label>
  )
}
