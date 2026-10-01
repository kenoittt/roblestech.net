// Shared by server pages and client components, so it lives outside both.
export type ArticleStatus = "ready" | "draft" | "needed"

export const STATUS_LABEL: Record<ArticleStatus, string> = {
  ready: "Ready",
  draft: "Draft",
  needed: "Not written yet",
}
