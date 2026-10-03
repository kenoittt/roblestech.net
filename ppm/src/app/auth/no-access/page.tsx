import Image from "next/image"
import { signOut } from "@/domains/auth/actions"
import { Button } from "@/components/ui/button"

export default function NoAccessPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-[360px]">
        <Image src="/brand/rtc-mark-64.png" alt="" width={36} height={36} />
        <h1 className="mt-6 text-xl font-semibold tracking-[-0.015em] text-fg">This account can't use the PPM</h1>
        <p className="mt-2 text-sm text-fg-3">
          The PPM is for the RTC team. If you work with us and expected to get in, ask an admin to check your
          account. Client logins use the client portal instead.
        </p>
        <form action={signOut} className="mt-6">
          <Button type="submit" variant="outline">Sign out</Button>
        </form>
      </div>
    </main>
  )
}
