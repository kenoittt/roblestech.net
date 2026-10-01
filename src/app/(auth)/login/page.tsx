import type { Metadata } from "next"
import Image from "next/image"
import { DEMO_MODE } from "@/lib/env"
import { LoginForm } from "@/domains/auth/components/login-form"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-16">
      <div className="w-full max-w-[360px]">
        <Image src="/brand/rtc-mark-64.png" alt="Robles Technologies Corp." width={36} height={36} priority />
        <h1 className="mt-6 text-xl font-semibold tracking-[-0.015em] text-fg">Sign in to the PPM</h1>
        <p className="mt-1 text-sm text-fg-3">Tasks, projects and the team calendar, in one place.</p>
        <LoginForm next={next ?? "/"} demo={DEMO_MODE} />
      </div>
    </main>
  )
}
