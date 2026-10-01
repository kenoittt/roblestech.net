"use client"

import { useRef, useState, useTransition, type ReactNode } from "react"
import { useTheme } from "next-themes"
import { useQueryClient } from "@tanstack/react-query"
import { Settings01Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Avatar } from "@/components/app/avatar"
import { PageBody, PageHeader } from "@/components/app/page"
import { cn } from "@/lib/utils"
import { getSupabase } from "@/lib/supabase/client"
import { useMe } from "@/domains/workspace/provider"
import { ROLE_META, displayName, type Role } from "@/domains/workspace/types"

const input =
  "h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-4 focus:border-brand"

export function SettingsPage() {
  const me = useMe()
  const qc = useQueryClient()
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState(me.full_name ?? "")
  const [title, setTitle] = useState(me.title ?? "")
  const [optOut, setOptOut] = useState(me.email_opt_out)
  const [pw, setPw] = useState({ next: "", confirm: "" })
  const [pending, start] = useTransition()

  const saveProfile = () =>
    start(async () => {
      const { error } = await getSupabase()
        .from("profiles")
        .update({ full_name: name.trim() || null, title: title.trim() || null })
        .eq("id", me.id)
      if (error) return void toast.error(error.message)
      qc.invalidateQueries({ queryKey: ["members"] })
      toast("Profile saved")
    })

  const saveEmail = (value: boolean) => {
    setOptOut(value)
    start(async () => {
      const { error } = await getSupabase().from("profiles").update({ email_opt_out: value }).eq("id", me.id)
      if (error) {
        setOptOut(!value)
        return void toast.error(error.message)
      }
      qc.invalidateQueries({ queryKey: ["members"] })
      toast(value ? "Emails off. The inbox still collects everything." : "Emails on")
    })
  }

  const savePassword = () =>
    start(async () => {
      if (pw.next.length < 10) return void toast.error("Use at least 10 characters.")
      if (pw.next !== pw.confirm) return void toast.error("The two passwords don't match.")
      const { error } = await getSupabase().auth.updateUser({ password: pw.next })
      if (error) return void toast.error(error.message)
      setPw({ next: "", confirm: "" })
      toast("Password changed")
    })

  return (
    <>
      <PageHeader title="Settings" icon={Settings01Icon} />
      <PageBody>
        <div className="mx-auto w-full max-w-[720px] px-6 py-10">
          <div className="flex items-center gap-4">
            <Avatar id={me.id} name={displayName(me)} size="2xl" />
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.015em] text-fg">{displayName(me)}</h2>
              <p className="text-sm text-fg-3">
                {ROLE_META[me.role as Role]?.label} · {me.email}
              </p>
              <PhotoButtons hasPhoto={Boolean(me.avatar_url)} uid={me.id} />
            </div>
          </div>

          <Block title="Profile" description="How you appear to the team.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-2">Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-2">Title</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What you do" className={input} />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={saveProfile} disabled={pending}>Save profile</Button>
            </div>
          </Block>

          <Block title="Appearance" description="Follows your computer unless you choose.">
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: "system", label: "System", swatch: "linear" },
                { value: "dark", label: "Dark", swatch: "dark" },
                { value: "light", label: "Light", swatch: "light" },
              ] as const).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={(theme ?? "system") === t.value}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    "pressable flex flex-col gap-2 rounded-lg border p-2 text-left text-sm transition-colors",
                    (theme ?? "system") === t.value ? "border-brand/70 text-fg" : "border-line text-fg-2 hover:border-line-strong",
                  )}
                >
                  <ThemeSwatch kind={t.swatch} />
                  <span className="px-1 pb-0.5">{t.label}</span>
                </button>
              ))}
            </div>
          </Block>

          <Block title="Notifications" description="The inbox always collects everything; email is optional.">
            <label className="flex items-center justify-between gap-4 text-sm text-fg-2">
              <span>
                Email me when I'm assigned work, asked for a sign-off, or my task is finished
                <span className="block text-xs text-fg-3">Sent through RTC's Microsoft 365 once this is live.</span>
              </span>
              <Switch checked={!optOut} onCheckedChange={(on) => saveEmail(!on)} />
            </label>
          </Block>

          <Block title="Password" description="At least 10 characters. Nobody else, admins included, ever sees it.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-2">New password</span>
                <input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-2">Type it again</span>
                <input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} className={input} />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={savePassword} disabled={pending || !pw.next}>Change password</Button>
            </div>
          </Block>
        </div>
      </PageBody>
    </>
  )
}

function Block({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="mt-10 border-t border-line pt-8">
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <p className="mt-0.5 mb-4 text-xs text-fg-3">{description}</p>
      {children}
    </section>
  )
}

/** A tiny flat sketch of each theme: the sidebar, the sheet and a line of text. */
function ThemeSwatch({ kind }: { kind: "dark" | "light" | "linear" }) {
  const pair = (bg: string, sheet: string, line: string) => (
    <span className="flex h-full w-full gap-1 p-1.5" style={{ background: bg }}>
      <span className="w-1/4 rounded-[3px]" style={{ background: bg }} />
      <span className="flex flex-1 flex-col gap-1 rounded-[4px] p-1.5" style={{ background: sheet }}>
        <span className="h-1.5 w-2/3 rounded-full" style={{ background: line }} />
        <span className="h-1.5 w-1/2 rounded-full opacity-60" style={{ background: line }} />
      </span>
    </span>
  )
  return (
    <span className="flex h-16 w-full overflow-hidden rounded-md border border-line">
      {kind === "dark" && pair("#08090c", "#0e1015", "#4b515c")}
      {kind === "light" && pair("#f3f4f6", "#ffffff", "#c9ced6")}
      {kind === "linear" && (
        <>
          <span className="flex w-1/2">{pair("#08090c", "#0e1015", "#4b515c")}</span>
          <span className="flex w-1/2">{pair("#f3f4f6", "#ffffff", "#c9ced6")}</span>
        </>
      )}
    </span>
  )
}

/** Choose a photo: it's cropped to a square and shrunk in the browser before upload. */
function PhotoButtons({ hasPhoto, uid }: { hasPhoto: boolean; uid: string }) {
  const qc = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [busy, start] = useTransition()

  const save = (avatar_url: string | null) => getSupabase().from("profiles").update({ avatar_url }).eq("id", uid)

  const upload = (file: File) =>
    start(async () => {
      try {
        const blob = await squareJpeg(file, 256)
        const supabase = getSupabase()
        const { error } = await supabase.storage.from("avatars").upload(uid, blob, { upsert: true, contentType: "image/jpeg" })
        if (error) throw error
        const { error: pErr } = await save(`${uid}?v=${Date.now()}`)
        if (pErr) throw pErr
        qc.invalidateQueries({ queryKey: ["members"] })
        toast("Photo updated")
      } catch (e) {
        toast.error((e as Error).message ?? "The photo didn't upload.")
      }
    })

  const remove = () =>
    start(async () => {
      await getSupabase().storage.from("avatars").remove([uid])
      await save(null)
      qc.invalidateQueries({ queryKey: ["members"] })
      toast("Photo removed")
    })

  return (
    <div className="mt-2 flex items-center gap-3 text-xs">
      <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className="font-medium text-brand hover:underline disabled:opacity-50">
        {busy ? "Saving…" : hasPhoto ? "Change photo" : "Add a photo"}
      </button>
      {hasPhoto && (
        <button type="button" disabled={busy} onClick={remove} className="text-fg-3 hover:text-fg disabled:opacity-50">
          Remove
        </button>
      )}
    </div>
  )
}

async function squareJpeg(file: File, size: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The photo couldn't be read."))), "image/jpeg", 0.88),
  )
}
