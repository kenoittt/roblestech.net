export { cn } from "cn"

/**
 * Where to send someone after signing in: a path on this site, or "/" for
 * anything that would leave it. Read the way a browser reads it, so "//x",
 * "/\x" and "/<tab>/x" (all another site, to a browser) fall back to "/".
 */
export function safeNext(value: string | null | undefined): string {
  if (!value?.startsWith("/")) return "/"
  try {
    const url = new URL(value, "http://same.invalid")
    return url.origin === "http://same.invalid" ? url.pathname + url.search + url.hash : "/"
  } catch {
    return "/"
  }
}
