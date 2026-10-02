// Menu test: opens every menu, popover and picker on every screen, as a super
// admin, an admin and staff, and fails on any error.
//   npm run dev            (in one terminal)
//   npm run test:menus     (in another; a few minutes)
// Why it exists: on 2026-10-02 four menus (the People role menus, the calendar's
// week and day privacy menus, and "Switch account") took their screen down when
// opened, and no other check opened them. It only opens things and closes them
// with Escape, so it changes no data.
import { chromium } from "playwright-core"

const BASE = process.env.BASE_URL ?? "http://localhost:3000"
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const PEOPLE = ["kenneth@rtc.test", "kyan@rtc.test", "carl@rtc.test"]
// Either error screen: the whole app's, or a single screen's.
const ERROR_SCREEN = "text=/This (page|screen) (couldn.t|didn.t) load/"

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
let failures = 0

for (const email of PEOPLE) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" })).newPage()
  let errors = []
  page.on("pageerror", (e) => errors.push(e.message.split("\n")[0].slice(0, 160)))
  // Errors an error boundary catches never reach "pageerror"; React logs them instead.
  page.on("console", (m) => m.type() === "error" && /Base UI|Error:|error #/i.test(m.text()) && errors.push(m.text().split("\n")[0].slice(0, 160)))

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" })
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', "rtc-demo-2026")
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }), page.click('button[type="submit"]')])
  await page.waitForLoadState("networkidle")

  const project = await page.evaluate(() => document.querySelector('a[href^="/projects/"]')?.getAttribute("href"))
  const article = await page.goto(`${BASE}/handbook`, { waitUntil: "networkidle" }).then(() =>
    page.evaluate(() => document.querySelector('main a[href^="/handbook/"]')?.getAttribute("href")),
  )
  const screens = [
    "/", "/inbox", "/my-tasks", "/tasks", "board", "/tasks?task=26", "/projects", project,
    "/people", "/people/00000000-0000-4000-a000-000000000005", "/calendar", "team-day",
    "/handbook", article, "/activity", "/settings",
  ].filter(Boolean)

  const failed = []
  let opened = 0
  for (const screen of screens) {
    const path = screen === "board" ? "/tasks" : screen === "team-day" ? "/calendar" : screen
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" })
    if (screen === "board") await page.click('button[role="radio"]:has-text("Board")')
    if (screen === "team-day") await page.click('button[role="radio"]:has-text("Team day")')
    await page.waitForTimeout(400)

    const triggers = page.locator("[aria-haspopup]")
    const count = Math.min(await triggers.count(), 80)
    for (let i = 0; i < count; i++) {
      const trigger = triggers.nth(i)
      if (!(await trigger.isVisible().catch(() => false))) continue
      const label = ((await trigger.getAttribute("aria-label")) ?? (await trigger.textContent()) ?? "").trim().slice(0, 40)
      errors = []
      const clicked = await trigger.click({ timeout: 3000 }).then(() => true, () => false)
      if (!clicked) continue
      await page.waitForTimeout(250)
      opened++
      if (errors.length || (await page.locator(ERROR_SCREEN).count())) {
        failed.push(`${screen} → "${label}": ${errors[0] ?? "error screen"}`)
        await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" })
        continue
      }
      await page.keyboard.press("Escape")
      await page.keyboard.press("Escape")
      await page.waitForTimeout(120)
    }
  }

  // The submenus in the account menu
  for (const sub of ["Theme", "Switch account"]) {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" })
    errors = []
    await page.locator('aside [aria-haspopup="menu"]').last().click()
    await page.waitForTimeout(300)
    const item = page.locator(`[role="menuitem"]:has-text("${sub}")`)
    if (!(await item.count())) continue
    await item.click()
    await page.waitForTimeout(500)
    opened++
    if (errors.length || (await page.locator(ERROR_SCREEN).count())) failed.push(`account menu → ${sub}: ${errors[0] ?? "error screen"}`)
  }

  console.log(`${failed.length ? "FAIL" : "PASS"}  ${email}: opened ${opened} menus and popovers on ${screens.length} screens${failed.length ? `, ${failed.length} failed` : ""}`)
  for (const f of failed) console.log(`        ${f}`)
  failures += failed.length
  await page.context().close()
}

await browser.close()
console.log(failures ? `\n${failures} failed` : "\nAll menus open cleanly")
process.exit(failures ? 1 : 0)
