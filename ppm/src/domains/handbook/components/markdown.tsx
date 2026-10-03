import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { ReactNode } from "react"

/** "Who can mark a task done" → "who-can-mark-a-task-done", for heading links. */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[*_`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function textOf(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children)
  if (Array.isArray(children)) return children.map(textOf).join("")
  if (children && typeof children === "object" && "props" in children) {
    return textOf((children as { props: { children?: ReactNode } }).props.children)
  }
  return ""
}

export function headingsOf(markdown: string) {
  return markdown
    .split("\n")
    .map((line) => /^(##|###)\s+(.+)$/.exec(line.trim()))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => ({ level: m[1].length, text: m[2].replace(/[*_`]/g, ""), id: slugify(m[2]) }))
}

/** Articles are Markdown; raw HTML is never passed through. */
export function Markdown({ source, className }: { source: string; className?: string }) {
  return (
    <div className={className ?? "prose-app prose-article"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => <h2 id={slugify(textOf(children))}>{children}</h2>,
          h3: ({ children }) => <h3 id={slugify(textOf(children))}>{children}</h3>,
          a: ({ href, children }) => (
            <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
