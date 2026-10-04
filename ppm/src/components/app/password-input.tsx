"use client"

import { useEffect, useId, useRef, useState, type ComponentProps } from "react"
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { Icon } from "./icon"

/**
 * A password field with a button to show what you typed, so a typo is caught
 * before it locks you out. Every password field in the app uses it.
 *
 * - The button's label says what it will do ("Show password", "Hide password").
 * - A click doesn't take the cursor out of the field, so you can keep typing
 *   where you were (browsers move it to the start when the field changes type).
 * - It hides again when the form is sent, so the password isn't left on screen
 *   and password managers still see a password field.
 */
export function PasswordInput({ className, id, ref: outerRef, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [shown, setShown] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const fallbackId = useId()
  const inputId = id ?? fallbackId

  useEffect(() => {
    const form = ref.current?.form
    if (!form) return
    const hide = () => setShown(false)
    form.addEventListener("submit", hide)
    return () => form.removeEventListener("submit", hide)
  }, [])

  // Switching between password and text puts the cursor back at the start. Chrome
  // does it a moment after the switch, so the cursor goes back on the next frame.
  const selection = useRef<[number, number] | null>(null)
  useEffect(() => {
    const el = ref.current
    const range = selection.current
    selection.current = null
    if (!el || !range) return
    const frame = requestAnimationFrame(() => {
      if (document.activeElement === el) el.setSelectionRange(range[0], range[1])
    })
    return () => cancelAnimationFrame(frame)
  }, [shown])

  const toggle = () => {
    const el = ref.current
    if (el && document.activeElement === el) {
      selection.current = [el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length]
    }
    setShown((s) => !s)
  }

  // The field is reachable both here and through the ref its form passes in.
  const setRefs = (el: HTMLInputElement | null) => {
    ref.current = el
    if (typeof outerRef === "function") outerRef(el)
    else if (outerRef) outerRef.current = el
  }

  return (
    <div className="relative">
      <input
        {...props}
        ref={setRefs}
        id={inputId}
        type={shown ? "text" : "password"}
        // Edge draws its own eye inside password fields; one is enough.
        className={cn(className, "pr-9 [&::-ms-reveal]:hidden")}
      />
      <button
        type="button"
        aria-label={shown ? "Hide password" : "Show password"}
        aria-controls={inputId}
        title={shown ? "Hide password" : "Show password"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggle}
        className="pressable absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-md text-fg-3 hover:text-fg"
      >
        <Icon icon={shown ? ViewOffIcon : ViewIcon} size={15} />
      </button>
    </div>
  )
}
