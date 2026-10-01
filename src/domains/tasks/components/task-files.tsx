"use client"

import { useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Attachment01Icon, Cancel01Icon, File01Icon, Image01Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { Icon } from "@/components/app/icon"
import { cn } from "@/lib/utils"
import { ago } from "@/lib/dates"
import { getSupabase } from "@/lib/supabase/client"
import { useMe, useMemberMap, useNow } from "@/domains/workspace/provider"
import { firstName, isAdminRole } from "@/domains/workspace/types"
import { explain } from "../data"

type TaskFile = {
  id: string
  task_id: string
  uploaded_by: string | null
  name: string
  size: number
  content_type: string | null
  path: string
  created_at: string
}

const MAX = 25 * 1024 * 1024

function size(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Files on a task: drop them in, open them, remove your own. */
export function TaskFiles({ taskId }: { taskId: string }) {
  const qc = useQueryClient()
  const me = useMe()
  const members = useMemberMap()
  const now = useNow()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const { data: files = [] } = useQuery({
    queryKey: ["task-files", taskId],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("ppm_task_files")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at")
      if (error) throw error
      return data as TaskFile[]
    },
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["task-files", taskId] })
    qc.invalidateQueries({ queryKey: ["task", taskId] })
  }

  const upload = useMutation({
    mutationFn: async (list: File[]) => {
      const supabase = getSupabase()
      for (const file of list) {
        if (file.size > MAX) {
          toast.error(`${file.name} is over 25 MB`)
          continue
        }
        const clean = file.name.replace(/[^\w.\-]+/g, "-").slice(-80)
        const path = `${taskId}/${crypto.randomUUID()}-${clean}`
        const { error } = await supabase.storage.from("task-files").upload(path, file, { contentType: file.type || undefined })
        if (error) throw error
        const { error: rowError } = await supabase.from("ppm_task_files").insert({
          task_id: taskId,
          uploaded_by: me.id,
          name: file.name,
          size: file.size,
          content_type: file.type || null,
          path,
        })
        if (rowError) {
          await supabase.storage.from("task-files").remove([path])
          throw rowError
        }
      }
    },
    onSuccess: refresh,
    onError: (e) => toast.error(explain(e)),
  })

  const remove = useMutation({
    mutationFn: async (file: TaskFile) => {
      const supabase = getSupabase()
      const { error } = await supabase.from("ppm_task_files").delete().eq("id", file.id)
      if (error) throw error
      await supabase.storage.from("task-files").remove([file.path])
    },
    onSuccess: refresh,
    onError: (e) => toast.error(explain(e)),
  })

  const openFile = async (file: TaskFile) => {
    const { data, error } = await getSupabase().storage.from("task-files").createSignedUrl(file.path, 60)
    if (error || !data) return toast.error("That file couldn't be opened.")
    window.open(data.signedUrl, "_blank", "noopener")
  }

  const add = (list: FileList | null) => list && list.length && upload.mutate(Array.from(list))

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        add(e.dataTransfer.files)
      }}
      className={cn("border-t border-line px-6 py-4 transition-colors", over && "bg-brand-soft")}
    >
      <div className="flex items-center gap-3">
        <h3 className="text-xs font-medium text-fg-2">Files</h3>
        {files.length > 0 && <span className="text-xs text-fg-3 tabular">{files.length}</span>}
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={upload.isPending}
          className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-fg-3 hover:text-fg disabled:opacity-50"
        >
          <Icon icon={Attachment01Icon} size={13} />
          {upload.isPending ? "Uploading…" : "Attach"}
        </button>
        <input ref={input} type="file" multiple className="sr-only" onChange={(e) => add(e.target.files)} />
      </div>
      {files.length === 0 ? (
        <p className="mt-1.5 text-xs text-fg-4">Drop files here, up to 25 MB each.</p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {files.map((f) => {
            const canRemove = f.uploaded_by === me.id || isAdminRole(me.role)
            return (
              <li key={f.id} className="group/file -mx-2 flex h-9 items-center gap-2.5 rounded-md px-2 hover:bg-hover">
                <Icon icon={f.content_type?.startsWith("image/") ? Image01Icon : File01Icon} size={15} className="text-fg-3" />
                <button type="button" onClick={() => openFile(f)} className="min-w-0 flex-1 truncate text-left text-sm text-fg hover:underline">
                  {f.name}
                </button>
                <span className="shrink-0 text-xs text-fg-4 tabular">
                  {size(f.size)} · {firstName(members.get(f.uploaded_by ?? ""))} · {ago(f.created_at, now)}
                </span>
                {canRemove && (
                  <button
                    type="button"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => remove.mutate(f)}
                    className="text-fg-4 opacity-0 group-hover/file:opacity-100 hover:text-danger focus-visible:opacity-100"
                  >
                    <Icon icon={Cancel01Icon} size={12} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
