"use client"

import { useMemo, useRef, useState } from "react"
import { Avatar } from "@/components/app/avatar"
import { Kbd } from "@/components/app/page"
import { cn } from "@/lib/utils"
import { useMe, useMembers } from "@/domains/workspace/provider"
import { displayName, firstName } from "@/domains/workspace/types"
import { useAddComment } from "../data"

/**
 * Write a comment; type @ to bring someone in. The people you mention are
 * notified (and emailed) even if they aren't on the task.
 */
export function CommentComposer({ taskId }: { taskId: string }) {
  const me = useMe()
  const members = useMembers()
  const add = useAddComment()
  const [draft, setDraft] = useState("")
  const [picked, setPicked] = useState<Map<string, string>>(new Map())
  const [query, setQuery] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const ref = useRef<HTMLTextAreaElement>(null)

  const people = useMemo(() => members.filter((m) => !m.deactivated_at && m.id !== me.id), [members, me.id])
  const matches = useMemo(() => {
    if (query === null) return []
    const q = query.toLowerCase()
    return people.filter((m) => displayName(m).toLowerCase().split(" ").some((part) => part.startsWith(q))).slice(0, 5)
  }, [people, query])

  const readQuery = (text: string, caret: number) => {
    const m = /(^|\s)@([\p{L}]*)$/u.exec(text.slice(0, caret))
    setQuery(m ? m[2] : null)
    setIndex(0)
  }

  const choose = (id: string) => {
    const el = ref.current
    const person = people.find((p) => p.id === id)
    if (!el || !person) return
    const caret = el.selectionStart
    const before = draft.slice(0, caret).replace(/@([\p{L}]*)$/u, `@${firstName(person)} `)
    const next = before + draft.slice(caret)
    setDraft(next)
    setPicked((p) => new Map(p).set(firstName(person), person.id))
    setQuery(null)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(before.length, before.length)
    })
  }

  const submit = () => {
    const body = draft.trim()
    if (!body) return
    const mentions = [...picked.entries()].filter(([name]) => body.includes(`@${name}`)).map(([, id]) => id)
    add.mutate({ taskId, body, mentions })
    setDraft("")
    setPicked(new Map())
    setQuery(null)
  }

  return (
    <div className="relative min-w-0 flex-1 rounded-lg border border-line px-3 pt-2 pb-2 focus-within:border-line-strong">
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          readQuery(e.target.value, e.target.selectionStart)
        }}
        onKeyDown={(e) => {
          if (query !== null && matches.length) {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setIndex((i) => (i + 1) % matches.length)
              return
            }
            if (e.key === "ArrowUp") {
              e.preventDefault()
              setIndex((i) => (i - 1 + matches.length) % matches.length)
              return
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault()
              choose(matches[index].id)
              return
            }
            if (e.key === "Escape") {
              e.preventDefault()
              setQuery(null)
              return
            }
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            submit()
          }
        }}
        rows={2}
        placeholder="Leave a comment… Type @ to mention someone"
        className="w-full resize-none bg-transparent text-sm text-fg outline-none placeholder:text-fg-4"
      />
      {query !== null && matches.length > 0 && (
        <ul
          role="listbox"
          aria-label="People to mention"
          className="absolute bottom-full left-2 z-10 mb-1 w-60 rounded-lg bg-raised p-1 shadow-popover"
        >
          {matches.map((m, i) => (
            <li key={m.id} role="option" aria-selected={i === index}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(m.id)
                }}
                className={cn(
                  "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm",
                  i === index ? "bg-selected text-fg" : "text-fg-2 hover:bg-hover",
                )}
              >
                <Avatar id={m.id} name={displayName(m)} size="sm" />
                {displayName(m)}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-fg-4">
          <Kbd>⌘</Kbd> <Kbd>Enter</Kbd>
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={!draft.trim() || add.isPending}
          className="pressable h-7 rounded-md bg-brand-solid px-2.5 text-xs font-medium text-white hover:bg-brand-solid-hover disabled:opacity-40"
        >
          Comment
        </button>
      </div>
    </div>
  )
}

/** Shows the people a comment mentions in bold, so they stand out. */
export function withMentions(body: string, mentions: string[], nameOf: (id: string) => string) {
  let out = body
  for (const id of mentions) {
    const name = nameOf(id)
    out = out.split(`@${name}`).join(`**@${name}**`)
  }
  return out
}
