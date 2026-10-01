import Image from "next/image"
import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-[360px]">
        <Image src="/brand/rtc-mark-64.png" alt="" width={36} height={36} />
        <h1 className="mt-6 text-xl font-semibold tracking-[-0.015em] text-fg">This page doesn't exist</h1>
        <p className="mt-2 text-sm text-fg-3">The link may be old, or the thing it pointed to was removed.</p>
        <Link href="/" className="mt-6 inline-flex h-8 items-center rounded-md bg-brand-solid px-3 text-sm font-medium text-white hover:bg-brand-solid-hover">
          Go home
        </Link>
      </div>
    </main>
  )
}
