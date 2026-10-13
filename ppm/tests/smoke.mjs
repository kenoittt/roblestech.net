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
  // The day has all 24 hours and opens near the current time, so bring 5 PM to the top first.
  await page.evaluate(() => {
    const scroller = document.querySelector("div.cursor-cell")?.closest(".overflow-y-auto")
    if (scroller) scroller.scrollTop = 17 * 56
  })
  await page.waitForTimeout(200)
  const box = await col.boundingBox()
  if (box) {
    // Monday, roughly 6 PM: well clear of the sample entries
    const y = box.y + 18 * 56
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

// Sign-off requests go to the people the rule names: here two chosen people, not the assigner
{
  const tokenFor = (email) =>
    JSON.parse(execSync(`curl -s -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password" -H "apikey: ${anon}" -H "Content-Type: application/json" -d '{"email":"${email}","password":"rtc-demo-2026"}'`).toString()).access_token
  const rest = (token, method, path, body) =>
    execSync(`curl -s -X ${method} "http://127.0.0.1:54321/rest/v1/${path}" -H "apikey: ${anon}" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -H "Prefer: return=representation" -d '${JSON.stringify(body)}'`).toString()
  const [made] = JSON.parse(rest(tokenFor("kenneth@rtc.test"), "POST", "ppm_tasks", {
    title: `${title} sign-off`, assignee_id: "00000000-0000-4000-a000-000000000005", status: "in_progress",
    completion_policy: "specific", completion_approvers: ["00000000-0000-4000-a000-000000000002", "00000000-0000-4000-a000-000000000004"],
  }))
  rest(tokenFor("carl@rtc.test"), "PATCH", `ppm_tasks?id=eq.${made?.id}`, { status: "in_review" })
  const asked = made ? sql(`select string_agg(split_part(p.full_name, ' ', 1), ', ' order by p.full_name) from ppm_notifications n join profiles p on p.id = n.user_id where n.task_id = '${made.id}' and n.type = 'review'`) : ""
  check("Sending a task for sign-off asks the people its rule names", asked === "Christian, Joshua", asked || "nobody asked")
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


// ---------------------------------------------------------------- Added 2026-10-04: roles, passwords, projects, templates
{
  const KENNETH = "00000000-0000-4000-a000-000000000001", CARL = "00000000-0000-4000-a000-000000000005"
  const today = sql("select (now() at time zone 'Asia/Manila')::date")
  const tokenFor = (email) =>
    JSON.parse(execSync(`curl -s -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password" -H "apikey: ${anon}" -H "Content-Type: application/json" -d '{"email":"${email}","password":"rtc-demo-2026"}'`).toString()).access_token
  const rest = (token, method, path, body) =>
    execSync(`curl -s -X ${method} "http://127.0.0.1:54321/rest/v1/${path}" -H "apikey: ${anon}" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -H "Prefer: return=representation"${body ? ` -d '${JSON.stringify(body)}'` : ""}`).toString()
  sql("delete from ppm_projects where name like 'E2E%'")
  sql(`delete from cal_events where owner_id = '${CARL}' and title = 'Outreach emails'`)
  try {
    // A refused role change says which role the database has for you. Live, Kenneth's screen
    // offered Super admin while the database said otherwise; this recreates that.
    {
      const { ctx, page } = await session("kenneth@rtc.test")
      await page.goto(BASE + "/people", { waitUntil: "networkidle" })
      sql(`update profiles set role = 'admin' where id = '${KENNETH}'`)
      await page.click('tr:has-text("Carl") td:nth-child(2) button')
      await page.click('[role="menuitemradio"]:has(span.text-fg:text-is("Super admin"))')
      await page.waitForTimeout(1500)
      const said = (await page.locator("[data-sonner-toast]").allInnerTexts()).join(" ")
      sql(`update profiles set role = 'super_admin' where id = '${KENNETH}'`)
      check("A refused role change names the role the database has", said.includes("signed in as an admin") && sql(`select role from profiles where id = '${CARL}'`) === "staff", said.slice(0, 70))
      await ctx.close()
    }

    // The eye on a password field
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" })
      const p = await ctx.newPage()
      await p.goto(BASE + "/login", { waitUntil: "networkidle" })
      await p.fill('input[name="password"]', "abc")
      await p.click('button[aria-label="Show password"]')
      const shown = await p.getAttribute('input[name="password"]', "type")
      await p.click('button[aria-label="Hide password"]')
      check("The eye on a password field shows it, then hides it", shown === "text" && (await p.getAttribute('input[name="password"]', "type")) === "password")
      await ctx.close()
    }

    // Projects: staff can't delete one; an admin deletes a throwaway one and its tasks together
    {
      const pid = sql(`insert into ppm_projects (name, owner_id, created_by) values ('E2E throwaway', '${CARL}', '${CARL}') returning id`).split("\n")[0]
      sql(`insert into ppm_tasks (title, project_id, created_by) values ('${title} in a throwaway project', '${pid}', '${CARL}')`)
      const refused = rest(tokenFor("carl@rtc.test"), "POST", "rpc/ppm_delete_project", { pid, delete_tasks: true })
      check("A project's owner can't delete it while it has tasks", refused.includes("only an admin can delete it") && sql(`select count(*) from ppm_projects where id = '${pid}'`) === "1" && sql(`select count(*) from ppm_tasks where project_id = '${pid}' and deleted_at is null`) === "1", refused.slice(0, 80))
      const { ctx, page } = await session("carl@rtc.test")
      await page.goto(BASE + "/projects", { waitUntil: "networkidle" })
      const row = page.locator('tr:has-text("E2E throwaway")')
      await row.hover()
      await row.locator('button[aria-label^="Actions for"]').click()
      await page.click('[role="menuitem"]:has-text("Archive project")')
      await page.waitForTimeout(1200)
      check("The owner archives a project; it leaves the portfolio", sql(`select archived from ppm_projects where id = '${pid}'`) === "t" && (await page.locator('tr:has-text("E2E throwaway")').count()) === 0)
      await ctx.close()
      const gone = rest(tokenFor("kyan@rtc.test"), "POST", "rpc/ppm_delete_project", { pid, delete_tasks: true })
      check("An admin deletes a project and its tasks in one go", gone.trim() === "1" && sql(`select count(*) from ppm_projects where id = '${pid}'`) === "0" && sql(`select count(*) from ppm_tasks where title = '${title} in a throwaway project' and deleted_at is not null`) === "1", gone.slice(0, 60))
    }

    // Templates: the team's shared one reaches Carl; Kyan's own stays Kyan's
    {
      const names = JSON.parse(rest(tokenFor("carl@rtc.test"), "GET", "ppm_task_templates?select=name")).map((t) => t.name)
      check("Shared templates reach the team; someone's own stay theirs", names.includes("Daily outreach") && !names.includes("Weekly SEO report"), names.join(", "))
      const { ctx, page } = await session("carl@rtc.test")
      await page.goto(BASE + "/tasks", { waitUntil: "networkidle" })
      await page.keyboard.press("c")
      await page.waitForSelector('input[aria-label="Task title"]')
      await page.click('[role="dialog"] button[aria-label="Templates"]')
      await page.keyboard.type("Daily outreach")
      await page.keyboard.press("Enter")
      await page.waitForTimeout(300)
      await page.fill('input[aria-label="Task title"]', `${title} outreach`)
      await page.keyboard.press("Meta+Enter")
      await page.waitForTimeout(1500)
      const made = sql(`select coalesce(assignee_id::text, '') || '|' || coalesce(due_date::text, '') || '|' || (select count(*) from ppm_task_checklist c where c.task_id = t.id) from ppm_tasks t where t.title = '${title} outreach'`)
      check("A task from a template: for whoever uses it, due today, with its checklist", made === `${CARL}|${today}|4`, made)

      // Calendar: the team's outreach block, onto today in two clicks; then tick it off from its details
      await page.goto(BASE + "/calendar", { waitUntil: "networkidle" })
      await page.click('button[aria-label="Plan time from a template"]')
      await page.click('[role="menuitem"]:has-text("Outreach block")')
      await page.waitForTimeout(1500)
      const block = sql(`select to_char(starts_at at time zone 'Asia/Manila', 'YYYY-MM-DD HH24:MI') || ' ' || to_char(ends_at at time zone 'Asia/Manila', 'HH24:MI') from cal_events where owner_id = '${CARL}' and title = 'Outreach emails'`)
      check("Plan time from a template puts the block on today", block === `${today} 09:00 11:00`, block)
      await page.locator('[data-event]:has-text("Outreach emails")').first().click()
      await page.waitForTimeout(400)
      await page.click('[data-slot="popover-content"] button:has-text("Tick off")')
      await page.waitForTimeout(1200)
      check("Tick off in an entry's details ticks it off (and opens nothing else)", sql(`select completed_at is not null from cal_events where owner_id = '${CARL}' and title = 'Outreach emails'`) === "t" && (await page.locator('[role="dialog"]:has-text("Plan time")').count()) === 0)
      await page.screenshot({ path: `${OUT}/e2e-templates.png` })
      await ctx.close()
    }
  } catch (e) {
    check("the 2026-10-04 checks ran to the end", false, e.message.split("\n")[0])
  } finally {
    sql(`update profiles set role = 'super_admin' where id = '${KENNETH}'`)
    sql(`delete from cal_events where owner_id = '${CARL}' and title = 'Outreach emails'`)
    sql("delete from ppm_projects where name like 'E2E%'")
  }
}

// ---------------------------------------------------------------- Added 2026-10-07: blocks follow their task, templates made in the dialogs, past midnight
{
  const CARL = "00000000-0000-4000-a000-000000000005"
  const tokenFor = (email) =>
    JSON.parse(execSync(`curl -s -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password" -H "apikey: ${anon}" -H "Content-Type: application/json" -d '{"email":"${email}","password":"rtc-demo-2026"}'`).toString()).access_token
  const rest = (token, method, path, body) =>
    execSync(`curl -s -X ${method} "http://127.0.0.1:54321/rest/v1/${path}" -H "apikey: ${anon}" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -H "Prefer: return=representation"${body ? ` -d '${JSON.stringify(body)}'` : ""}`).toString()
  sql("delete from ppm_task_templates where name like 'E2E%'")
  sql("delete from cal_event_templates where name like 'E2E%'")
  try {
    // Finishing a task ticks off its blocks, even when someone else finishes it; reopening unticks them
    {
      const carl = tokenFor("carl@rtc.test")
      const [task] = JSON.parse(rest(carl, "POST", "ppm_tasks", { title: `${title} with time set aside`, assignee_id: CARL }))
      const at = (h) => new Date(Date.now() + h * 3600_000).toISOString()
      rest(carl, "POST", "cal_events", { title: "E2E block for a task", kind: "block", starts_at: at(1), ends_at: at(2), task_id: task?.id })
      const kenneth = tokenFor("kenneth@rtc.test")
      rest(kenneth, "PATCH", `ppm_tasks?id=eq.${task?.id}`, { status: "done" })
      const ticked = sql(`select (completed_at is not null)::text from cal_events where title = 'E2E block for a task'`)
      rest(kenneth, "PATCH", `ppm_tasks?id=eq.${task?.id}`, { status: "todo" })
      const unticked = sql(`select (completed_at is null)::text from cal_events where title = 'E2E block for a task'`)
      check("Finishing a task ticks off its blocks, and reopening it unticks them", ticked === "true" && unticked === "true", `ticked ${ticked}, unticked ${unticked}`)
    }

    const { ctx, page } = await session("carl@rtc.test")

    // The new-task dialog saves a template, and makes no task
    await page.goto(BASE + "/my-tasks", { waitUntil: "networkidle" })
    await page.keyboard.press("c")
    await page.waitForSelector('input[aria-label="Task title"]')
    await page.fill('input[aria-label="Task title"]', `${title} template only`)
    await page.click('[role="dialog"] label:has-text("Save as template") [role="switch"]')
    await page.fill('input[aria-label="Template name"]', "E2E check routine")
    await page.fill('input[aria-label="Add a checklist step"]', "First step")
    await page.keyboard.press("Enter")
    await page.keyboard.press("Meta+Enter")
    await page.waitForTimeout(1500)
    const made = sql(`select assign_to_user || '|' || array_length(checklist, 1) from ppm_task_templates where name = 'E2E check routine' and created_by = '${CARL}'`)
    const noTask = sql(`select count(*) from ppm_tasks where title = '${title} template only'`)
    check("Save as template in the new-task dialog saves a template and makes no task", made === "true|1" && noTask === "0", `${made || "no template"}, tasks: ${noTask}`)

    // Plan time: a block from 10 PM to 2 AM ends the next day; a new task named in "For a task" is made and linked
    await page.goto(BASE + "/calendar", { waitUntil: "networkidle" })
    await page.click('button:has-text("Plan time")')
    await page.waitForTimeout(500)
    await page.fill('input[placeholder="What will you work on?"]', "E2E overnight block")
    await page.click('button[aria-label="Link a task"]')
    await page.keyboard.type(`${title} planned from a block`)
    await page.locator('[cmdk-item]:has-text("New task")').click()
    const selects = page.locator('[role="dialog"] select')
    await selects.nth(0).selectOption({ label: "10 PM" })
    await selects.nth(1).selectOption({ label: "2 AM · next day" })
    await page.click('button:has-text("Add to calendar")')
    await page.waitForTimeout(1500)
    const overnight = sql(`select ((ends_at at time zone 'Asia/Manila')::date - (starts_at at time zone 'Asia/Manila')::date) || ' ' || to_char(ends_at at time zone 'Asia/Manila', 'HH24:MI') || ' ' || (t.assignee_id = '${CARL}') from cal_events e join ppm_tasks t on t.id = e.task_id where e.title = 'E2E overnight block'`)
    check("Plan time: a block can end after midnight, for a task made right there", overnight === "1 02:00 true", overnight || "no block")
    await page.screenshot({ path: `${OUT}/e2e-2026-10-07.png` })
    await ctx.close()
  } catch (e) {
    check("the 2026-10-07 checks ran to the end", false, e.message.split("\n")[0])
  } finally {
    sql("delete from ppm_task_templates where name like 'E2E%'")
    sql("delete from cal_event_templates where name like 'E2E%'")
  }
}

// ---------------------------------------------------------------- Added 2026-10-13: short blocks, a task finished from its block, deletes that ask first,
// Copy my plan as a list, and a project's owner deleting it while it's empty
{
  const CARL = "00000000-0000-4000-a000-000000000005"
  const tokenFor = (email) =>
    JSON.parse(execSync(`curl -s -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password" -H "apikey: ${anon}" -H "Content-Type: application/json" -d '{"email":"${email}","password":"rtc-demo-2026"}'`).toString()).access_token
  const rest = (token, method, path, body) =>
    execSync(`curl -s -X ${method} "http://127.0.0.1:54321/rest/v1/${path}" -H "apikey: ${anon}" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -H "Prefer: return=representation"${body ? ` -d '${JSON.stringify(body)}'` : ""}`).toString()
  const today = sql("select (now() at time zone 'Asia/Manila')::date")
  const at = (time) => `${today}T${time}:00+08:00`
  try {
    // Carl's early morning, clear of the sample entries: three blocks in a row, then two for tasks
    const carl = tokenFor("carl@rtc.test")
    const block = (name, from, to, task) => rest(carl, "POST", "cal_events", { title: name, kind: "block", starts_at: at(from), ends_at: at(to), task_id: task?.id ?? null })
    const [own] = JSON.parse(rest(carl, "POST", "ppm_tasks", { title: `${title} to finish from its block`, assignee_id: CARL }))
    const [ruled] = JSON.parse(rest(carl, "POST", "ppm_tasks", { title: `${title} that someone else signs off`, assignee_id: CARL, completion_policy: "not_assignee" }))
    block("E2E quarter to stretch", "04:00", "04:15")
    block("E2E quarter one", "05:00", "05:15")
    block("E2E quarter two", "05:15", "05:30")
    block("E2E half hour", "05:30", "06:00")
    block("E2E block to finish", "06:30", "07:00", own)
    block("E2E block to send for sign-off", "07:00", "07:30", ruled)
    block("E2E block to delete", "07:30", "08:00")

    const { ctx, page } = await session("carl@rtc.test")
    await page.goto(BASE + "/calendar", { waitUntil: "networkidle" })
    const entry = (name) => page.locator(`[data-event]:has-text("${name}")`).first()
    await entry("E2E quarter one").waitFor()

    // A 15-minute block is drawn in its own 15 minutes, so the next one never sits on top of it
    const [one, two, half] = await Promise.all(["E2E quarter one", "E2E quarter two", "E2E half hour"].map((n) => entry(n).boundingBox()))
    check(
      "15-minute blocks in a row each keep to their own time",
      Boolean(one && two && half) && one.y + one.height <= two.y && two.y + two.height <= half.y,
      one && two && half ? `${one.height}px tall, ${(two.y - one.y - one.height).toFixed(1)}px apart` : "blocks not found",
    )

    // Every block stretches by its bottom edge, the shortest ones too
    const stretch = async (name) => {
      await entry(name).scrollIntoViewIfNeeded()
      const b = await entry(name).boundingBox()
      const x = b.x + b.width / 2
      const edge = b.y + b.height - 2
      await page.mouse.move(x, edge)
      await page.mouse.down()
      await page.mouse.move(x, edge + 6, { steps: 3 })
      await page.mouse.move(x, edge + 14, { steps: 6 })
      await page.mouse.up()
      await page.waitForTimeout(1200)
    }
    await stretch("E2E quarter to stretch")
    await stretch("E2E half hour")
    const stretched = sql(`select string_agg(to_char(ends_at at time zone 'Asia/Manila', 'HH24:MI'), ' ' order by starts_at) from cal_events where title in ('E2E quarter to stretch', 'E2E half hour')`)
    check("A 15-minute and a 30-minute block stretch by their bottom edge", stretched === "04:30 06:15", stretched)

    // Finish task, in a block's details: the task is done, and its block ticked off with it
    const details = page.locator('[data-slot="popover-content"]')
    await entry("E2E block to finish").click()
    await details.locator('button:has-text("Finish task")').click()
    await page.waitForTimeout(1500)
    const finished = sql(`select t.status || ' ' || (e.completed_at = t.completed_at) from cal_events e join ppm_tasks t on t.id = e.task_id where e.title = 'E2E block to finish'`)
    check("Finish task in a block's details finishes the task and ticks off its block", finished === "done true", finished || "no block")

    // Edit is the pencil beside the bin
    await details.locator('button[aria-label="Edit"]').click()
    await page.waitForTimeout(500)
    check("The pencil in an entry's details opens it for editing", (await page.locator('[role="dialog"]:has-text("Edit block")').count()) === 1)
    await page.keyboard.press("Escape")
    await page.waitForTimeout(300)
    await page.keyboard.press("Escape")

    // A task whose rule names someone else: Carl is offered its sign-off request instead, and can't finish it from here
    await entry("E2E block to send for sign-off").click()
    await page.waitForTimeout(400)
    const offered = (await details.locator('button:has-text("Finish task")').count()) === 0
    await details.locator('button:has-text("Request sign-off")').click()
    await page.waitForTimeout(1500)
    const sent = sql(`select t.status || ' ' || (e.completed_at is not null) from cal_events e join ppm_tasks t on t.id = e.task_id where e.title = 'E2E block to send for sign-off'`)
    check("When a task needs someone else's sign-off, its block asks for it: In review, and the block ticked off", offered && sent === "in_review true", `${sent || "no block"}${offered ? "" : ", Finish task was offered"}`)
    await page.keyboard.press("Escape")

    // Deleting asks first: the bin's first press only asks, its second deletes
    const left = () => sql("select count(*) from cal_events where title = 'E2E block to delete'")
    // Its own details: the last entry's may still be fading out
    const doomed = page.locator('[data-slot="popover-content"]:has-text("E2E block to delete")')
    await page.waitForTimeout(400)
    await entry("E2E block to delete").click()
    await doomed.locator('button[aria-label="Delete"]').click()
    await page.waitForTimeout(400)
    const asked = left() === "1" && (await doomed.locator("text=Delete this block?").count()) === 1
    await doomed.locator('button[aria-label="Confirm: delete"]').click()
    await page.waitForTimeout(1200)
    check("Deleting a calendar entry asks first: one press keeps it, a second deletes it", asked && left() === "0", `asked: ${asked}, left: ${left()}`)

    // Copy my plan: a numbered list, a bulleted one, or neither, and a hyphen before DONE
    await page.click('button[aria-label="Choose how your plan reads"]')
    const choose = async (group, label) => {
      await details.locator(`[role="radiogroup"][aria-label="${group}"] button:has-text("${label}")`).click()
      await page.waitForTimeout(600)
    }
    // The preview is what gets pasted. Its entries are the lines with a time; the title and "Due" lines aren't listed.
    const entries = async () => (await details.locator("div.bg-inset p").allInnerTexts()).filter((line) => /\d [AP]M to \d/.test(line))
    await choose("What's done", "Add DONE")
    await choose("As a list", "1. Numbers")
    const numbered = await entries()
    const saved = sql(`select prefs->'copyPlan'->>'list' from profiles where id = '${CARL}'`)
    await choose("As a list", "- Bullets")
    const bulleted = await entries()
    await choose("As a list", "Off")
    const plain = await entries()
    const finishedLine = numbered.find((line) => line.includes("E2E block to finish")) ?? ""
    check(
      "Copy my plan reads as a numbered list, a bulleted one, or neither, with a hyphen before DONE",
      numbered.length > 0 &&
        numbered.every((line, i) => line.startsWith(`${i + 1}. `)) &&
        /^\d+\. 6:30 AM to 7:00 AM: E2E block to finish \(RTC-\d+\) - DONE$/.test(finishedLine) &&
        bulleted.length === numbered.length &&
        bulleted.every((line) => line.startsWith("- ")) &&
        plain.every((line) => /^\d+:\d\d [AP]M to /.test(line)) &&
        saved === "numbers",
      `${finishedLine || "no entry for the finished block"} | saved: ${saved}`,
    )
    await page.screenshot({ path: `${OUT}/e2e-2026-10-13.png` })

    // A project's owner may delete it while it has no tasks at all. Nobody else who isn't an admin may,
    // and a project that has held a task, even a deleted one, stays an admin's to delete.
    sql("delete from ppm_projects where name like 'E2E%'")
    const project = (name) => sql(`insert into ppm_projects (name, owner_id, created_by) values ('${name}', '${CARL}', '${CARL}') returning id`).split("\n")[0]
    const exists = (id) => sql(`select count(*) from ppm_projects where id = '${id}'`) === "1"
    const empty = project("E2E empty project")
    const held = project("E2E project that held a task")
    sql(`insert into ppm_tasks (title, project_id, created_by, deleted_at) values ('${title} deleted a while ago', '${held}', '${CARL}', now())`)
    const teammate = rest(tokenFor("joshua@rtc.test"), "POST", "rpc/ppm_delete_project", { pid: empty })
    const afterWork = rest(carl, "POST", "rpc/ppm_delete_project", { pid: held })
    check(
      "An empty project is its owner's to delete, not a teammate's, and not once it has held a task",
      teammate.includes("Only admins can delete") && afterWork.includes("deleted ones included") && exists(empty) && exists(held),
      `teammate: ${teammate.slice(0, 60)} | after work: ${afterWork.slice(0, 60)}`,
    )
    await page.goto(BASE + "/projects", { waitUntil: "networkidle" })
    const row = page.locator('tr:has-text("E2E empty project")')
    await row.hover()
    await row.locator('button[aria-label^="Actions for"]').click()
    await page.click('[role="menuitem"]:has-text("Delete project")')
    await page.click('[role="dialog"] button:has-text("Delete project")')
    await page.waitForTimeout(1500)
    check("A project's owner deletes it while it's empty, from its menu", !exists(empty) && (await page.locator('tr:has-text("E2E empty project")').count()) === 0)
    await ctx.close()
  } catch (e) {
    check("the 2026-10-13 checks ran to the end", false, e.message.split("\n")[0])
  } finally {
    // Carl John keeps the default plan in the sample data
    sql(`update profiles set prefs = prefs - 'copyPlan' where id = '${CARL}'`)
    sql("delete from ppm_projects where name like 'E2E%'")
  }
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
