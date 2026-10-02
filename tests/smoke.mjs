// Smoke test: the PPM's main flows, end to end, against the local app and database.
//   npm run dev            (in one terminal)
//   npm run test:smoke     (in another)
// Needs Google Chrome (or set CHROME_PATH), Docker running the local Supabase, and
// the sample data. It cleans up what it creates; run "npx supabase db reset" for a
// completely fresh copy of the sample data.
import { chromium } from "playwright-core"
import { execSync } from "node:child_process"

const BASE = "http://localhost:3000"
const OUT = process.argv[2] ?? "test-results"
import { mkdirSync } from "node:fs"
mkdirSync(OUT, { recursive: true })
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const sql = (q) =>
  execSync(`docker exec supabase_db_rtc-ppm psql -U postgres -d postgres -t -A -c ${JSON.stringify(q)}`).toString().trim()

const results = []
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail })
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`)
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true })

async function session(email, password = "rtc-demo-2026") {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" })
  const page = await ctx.newPage()
  page.on("pageerror", (e) => console.log("  pageerror:", e.message))
  await page.goto(BASE + "/login", { waitUntil: "networkidle" })
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }), page.click('button[type="submit"]')])
  return { ctx, page }
}

// cleanup: remove what earlier runs left behind
sql("delete from cal_events where title like 'E2E%'")
sql("delete from ppm_tasks where title like 'E2E check%'")
sql("delete from auth.users where email like 'e2e%@rtc.test'")
const title = `E2E check ${Date.now() % 100000}`
try {
  // ---------------------------------------------------------------- Kyan: create, assign, change, comment, delete, undo
  const { page } = await session("kyan@rtc.test")
  await page.goto(BASE + "/tasks", { waitUntil: "networkidle" })
  await page.keyboard.press("c")
  await page.waitForSelector('input[aria-label="Task title"]')
  await page.fill('input[aria-label="Task title"]', title)
  await page.click('button[aria-label="Assignee"]')
  await page.keyboard.type("Carl")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  await page.keyboard.press("Meta+Enter")
  await page.waitForTimeout(1500)
  const row = sql(`select number || '|' || coalesce(assignee_id::text,'') from ppm_tasks where title = '${title}'`)
  const [num, assignee] = row.split("|")
  check("Create a task with C, assign it, Cmd+Enter", Boolean(num) && assignee === "00000000-0000-4000-a000-000000000005", `RTC-${num}`)
  const notified = sql(`select count(*) from ppm_notifications n join ppm_tasks t on t.id = n.task_id where t.title = '${title}' and n.user_id = '00000000-0000-4000-a000-000000000005' and n.type = 'assigned'`)
  check("Carl is notified of the assignment", notified === "1")
  const visible = await page.locator(`text=${title}`).count()
  check("The new task shows in the list without a reload", visible > 0)

  await page.goto(`${BASE}/tasks?task=${num}`, { waitUntil: "networkidle" })
  await page.waitForSelector('[role="complementary"]')
  await page.click('[role="complementary"] button[aria-label="Status"]')
  await page.keyboard.type("In progress")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(1200)
  check("Change status from the panel", sql(`select status from ppm_tasks where number = ${num}`) === "in_progress")
  check("History records the change", sql(`select count(*) from ppm_task_events e join ppm_tasks t on t.id = e.task_id where t.number = ${num} and e.type = 'status_changed' and e.to_status = 'in_progress'`) === "1")

  await page.fill('textarea[placeholder^="Leave a comment"]', "Looks good from here.")
  await page.keyboard.press("Meta+Enter")
  await page.waitForTimeout(1200)
  check("Post a comment", sql(`select count(*) from ppm_task_comments c join ppm_tasks t on t.id = c.task_id where t.number = ${num}`) === "1")
  const commentShown = await page.locator('[role="complementary"] >> text=Looks good from here.').count()
  check("The comment appears in the activity", commentShown > 0)

  await page.click('[role="complementary"] button[aria-label="More actions"]')
  await page.click("text=Delete task")
  await page.waitForTimeout(1000)
  check("Delete hides the task (soft delete)", sql(`select (deleted_at is not null)::text from ppm_tasks where number = ${num}`) === "true")
  await page.click('[data-sonner-toast] button:has-text("Undo")')
  await page.waitForTimeout(1200)
  check("Undo brings it back", sql(`select (deleted_at is null)::text from ppm_tasks where number = ${num}`) === "true")
  await page.screenshot({ path: `${OUT}/e2e-kyan.png` })

  // ---------------------------------------------------------------- Board: drag a card to another column
  await page.goto(BASE + "/tasks", { waitUntil: "networkidle" })
  await page.click('button[role="radio"]:has-text("Board")')
  await page.waitForTimeout(600)
  const card = page.locator(`article:has-text("${title}")`).first()
  await card.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const target = page.locator('section[aria-label="In review"]')
  const cb = await card.boundingBox()
  const tb = await target.boundingBox()
  if (cb && tb) {
    await page.mouse.move(cb.x + cb.width / 2, cb.y + 20)
    await page.mouse.down()
    await page.mouse.move(cb.x + cb.width / 2 + 20, cb.y + 30, { steps: 5 })
    await page.mouse.move(tb.x + tb.width / 2, tb.y + 120, { steps: 15 })
    await page.waitForTimeout(200)
    await page.mouse.up()
    await page.waitForTimeout(1500)
  }
  check("Drag a card on the board to In review", sql(`select status from ppm_tasks where number = ${num}`) === "in_review")
  await page.screenshot({ path: `${OUT}/e2e-board.png` })
  await page.click('button[role="radio"]:has-text("List")')

  // ---------------------------------------------------------------- Calendar: drag to block time
  await page.goto(BASE + "/calendar", { waitUntil: "networkidle" })
  await page.waitForTimeout(800)
  const before = Number(sql(`select count(*) from cal_events where owner_id = '00000000-0000-4000-a000-000000000003'`))
  const cols = page.locator("div.cursor-cell")
  const col = cols.nth(0)
  const box = await col.boundingBox()
  if (box) {
    // Monday, roughly 6 PM: well clear of the sample entries
    const y = box.y + (18 * 60 - 7 * 60) * (56 / 60) - (await page.evaluate(() => 0))
    await page.mouse.move(box.x + box.width / 2, Math.min(y, box.y + box.height - 80))
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, Math.min(y, box.y + box.height - 80) + 60, { steps: 6 })
    await page.mouse.up()
    await page.waitForTimeout(600)
    await page.fill('input[placeholder="What will you work on?"]', "E2E focus block")
    await page.click('button:has-text("Add to calendar")')
    await page.waitForTimeout(1500)
  }
  const after = Number(sql(`select count(*) from cal_events where owner_id = '00000000-0000-4000-a000-000000000003'`))
  check("Drag on the calendar, name it, add it", after === before + 1, `${before} -> ${after}`)
  await page.screenshot({ path: `${OUT}/e2e-calendar.png` })

  // ---------------------------------------------------------------- Invite: email arrives, link works, password is set
  await page.goto(BASE + "/people", { waitUntil: "networkidle" })
  await page.click('button:has-text("Invite")')
  const email = `e2e${Date.now() % 100000}@rtc.test`
  await page.fill('input[name="name"]', "Test Person")
  await page.fill('input[name="email"]', email)
  await page.click('button:has-text("Send invitation")')
  await page.waitForTimeout(2500)
  check("Invite creates the account and profile", sql(`select role from profiles where email = '${email}'`) === "staff")
  const mails = JSON.parse(execSync(`curl -s "http://127.0.0.1:54324/api/v1/search?query=to:${email}"`).toString())
  const id = mails?.messages?.[0]?.ID
  check("The invitation email arrives", Boolean(id))
  if (id) {
    const msg = JSON.parse(execSync(`curl -s http://127.0.0.1:54324/api/v1/message/${id}`).toString())
    const link = /href="([^"]*auth\/confirm[^"]*)"/.exec(msg.HTML ?? "")?.[1]?.replace(/&amp;/g, "&")
    check("The email links back to the app", Boolean(link), link ? new URL(link).pathname : "")
    if (link) {
      const fresh = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" })
      const p2 = await fresh.newPage()
      await p2.goto(link, { waitUntil: "networkidle" })
      check("The link signs them in and asks for a password", p2.url().includes("/welcome"), new URL(p2.url()).pathname)
      await p2.fill('input[name="password"]', "test-password-123")
      await p2.fill('input[name="confirm"]', "test-password-123")
      await Promise.all([p2.waitForURL((u) => u.pathname === "/", { timeout: 30000 }).catch(() => {}), p2.click('button[type="submit"]')])
      check("Setting the password lands on Home", new URL(p2.url()).pathname === "/")
      await p2.screenshot({ path: `${OUT}/e2e-new-person.png` })
      await fresh.close()
    }
  }
} catch (e) {
  check("script ran to the end", false, e.message.split("\n")[0])
}

// ---------------------------------------------------------------- Sign-off rule, straight against the database as Carl
const anon = execSync(`grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2-`).toString().trim()
const login = JSON.parse(execSync(`curl -s -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password" -H "apikey: ${anon}" -H "Content-Type: application/json" -d '{"email":"carl@rtc.test","password":"rtc-demo-2026"}'`).toString())
const res = execSync(`curl -s -X PATCH "http://127.0.0.1:54321/rest/v1/ppm_tasks?number=eq.18" -H "apikey: ${anon}" -H "Authorization: Bearer ${login.access_token}" -H "Content-Type: application/json" -d '{"status":"done"}'`).toString()
check("Staff can't mark a task done that needs Kenneth's sign-off", res.includes("Only the people chosen"), res.slice(0, 90))
const roleRes = execSync(`curl -s -X PATCH "http://127.0.0.1:54321/rest/v1/profiles?id=eq.00000000-0000-4000-a000-000000000005" -H "apikey: ${anon}" -H "Authorization: Bearer ${login.access_token}" -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"role":"super_admin"}'`).toString()
const priv = execSync(`curl -s "http://127.0.0.1:54321/rest/v1/ppm_tasks?select=title&title=eq.Renew%20passport" -H "apikey: ${anon}" -H "Authorization: Bearer ${login.access_token}"`).toString()
check("Someone else's private task is invisible to staff", priv.trim() === "[]", priv.slice(0, 60))
check("Staff can't promote themselves", sql(`select role from profiles where id = '00000000-0000-4000-a000-000000000005'`) === "staff", roleRes.slice(0, 80))

// An admin can still sign off in the reviewer's place, and the history says so (on this run's own task)
{
  const kyanLogin = JSON.parse(execSync(`curl -s -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password" -H "apikey: ${anon}" -H "Content-Type: application/json" -d '{"email":"kyan@rtc.test","password":"rtc-demo-2026"}'`).toString())
  const own = sql(`select number from ppm_tasks where title = '${title}'`)
  const patchOwn = (body) =>
    execSync(`curl -s -X PATCH "http://127.0.0.1:54321/rest/v1/ppm_tasks?number=eq.${own}" -H "apikey: ${anon}" -H "Authorization: Bearer ${kyanLogin.access_token}" -H "Content-Type: application/json" -d '${JSON.stringify(body)}'`).toString()
  patchOwn({ completion_policy: "reviewer", reviewer_id: "00000000-0000-4000-a000-000000000002" })
  patchOwn({ status: "done" })
  const asAdmin = own ? sql(`select e.meta->>'as_admin' from ppm_task_events e join ppm_tasks t on t.id = e.task_id where t.number = ${own} and e.to_status = 'done'`) : ""
  check("An admin signing off in the reviewer's place is recorded as such", asAdmin === "true", `RTC-${own}`)
}

// A repeating task: finishing it makes the next one, which keeps the series' creator and assigner
{
  const KENNETH = "00000000-0000-4000-a000-000000000001", CARL = "00000000-0000-4000-a000-000000000005"
  const tokenFor = (email) =>
    JSON.parse(execSync(`curl -s -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password" -H "apikey: ${anon}" -H "Content-Type: application/json" -d '{"email":"${email}","password":"rtc-demo-2026"}'`).toString()).access_token
  const rest = (token, method, path, body) =>
    execSync(`curl -s -X ${method} "http://127.0.0.1:54321/rest/v1/${path}" -H "apikey: ${anon}" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -H "Prefer: return=representation" -d '${JSON.stringify(body)}'`).toString()
  const repeatTitle = `${title} repeat`
  const today = sql("select (now() at time zone 'Asia/Manila')::date")
  const kenneth = tokenFor("kenneth@rtc.test")
  const [made] = JSON.parse(rest(kenneth, "POST", "ppm_tasks", { title: repeatTitle, assignee_id: CARL, repeat: "weekly", due_date: today }))
  rest(kenneth, "POST", "ppm_task_checklist", { task_id: made?.id, title: "Step one", done: true })
  rest(tokenFor("carl@rtc.test"), "PATCH", `ppm_tasks?id=eq.${made?.id}`, { status: "done" })
  const next = sql(`select due_date || ' ' || (created_by = '${KENNETH}') || ' ' || (assigned_by = '${KENNETH}') || ' ' || (assignee_id = '${CARL}') || ' ' || repeat from ppm_tasks where title = '${repeatTitle}' and status = 'todo'`)
  const expected = `${sql("select (now() at time zone 'Asia/Manila')::date + 7")} true true true weekly`
  const old = made ? sql(`select coalesce(repeat, 'none') from ppm_tasks where id = '${made.id}'`) : ""
  const checklist = sql(`select string_agg(c.title || ':' || c.done, ',') from ppm_task_checklist c join ppm_tasks t on t.id = c.task_id where t.title = '${repeatTitle}' and t.status = 'todo'`)
  check(
    "Finishing a repeating task makes the next one, with its creator and assigner kept",
    next === expected && old === "none" && checklist === "Step one:false",
    `${next || "no next task"} | old repeats: ${old} | checklist: ${checklist}`,
  )
}


// ---------------------------------------------------------------- Live updates: one person's change reaches another's screen
{
  const kyan = await (await session("kyan@rtc.test")).page
  const kenneth = await (await session("kenneth@rtc.test")).page
  await kyan.goto(BASE + "/tasks", { waitUntil: "networkidle" })
  await kyan.waitForTimeout(1500)
  const renamed = `Renew the roblestech.net domain (${Date.now() % 1000})`
  await kenneth.goto(BASE + "/tasks?task=36", { waitUntil: "networkidle" })
  const field = kenneth.locator('textarea[aria-label="Title"]')
  await field.fill(renamed)
  await field.press("Enter")
  let seen = false
  for (let i = 0; i < 40 && !seen; i++) {
    seen = (await kyan.locator(`text=${renamed}`).count()) > 0
    if (!seen) await kyan.waitForTimeout(250)
  }
  check("Kyan sees Kenneth's change without reloading", seen)
  await field.fill("Renew the roblestech.net domain")
  await field.press("Enter")
  await kenneth.waitForTimeout(800)
}

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
