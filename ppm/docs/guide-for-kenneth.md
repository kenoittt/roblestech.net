# Giving the team accounts: a guide for Kenneth

One page on accounts in the new PPM, for after the switch. Written 2026-10-03 (backlog item 4).

## Who already has an account

Everyone who uses the PPM today keeps their account: the same email, the same password and the same role. Nobody needs a new invitation. Portal clients can't open the PPM, because their role is "client".

## The three roles

| Role | Can |
|---|---|
| **Super admin** | Everything, including making, changing and removing admins |
| **Admin** | Manage staff, projects and all work; invite staff; send password resets to staff |
| **Staff** | Create, assign and finish tasks; plan their calendar; manage the projects they own |

Only a super admin can invite an admin or change someone to or from admin.

## Invite someone new

1. Open **People** and choose **Invite**.
2. Enter their name, work email and role, then send.
3. They get an email from the company's Microsoft 365 address with a **Set your password** button. The link opens the PPM, they choose a password, and they land on Home.

If the link has expired, open their menu in **People** (the **…** button) and choose **Resend invitation**. If they already have a password, the PPM sends a password reset instead and tells you so.

## Someone forgot their password

Open **People**, then their menu (the **…** button), and choose **Send password reset**. They get an email with a **Choose a new password** button. Admins can reset staff; only a super admin can reset an admin.

## Someone leaves

Open **People**, then their menu, and choose **Deactivate…**. They can't sign in any more, their history stays, and in the same step their open tasks can go to someone else. **Reactivate** brings them back.

## If an email doesn't arrive

- Check their spam or junk folder first.
- Invitations and resets go through the same Microsoft 365 setup as the PPM's notifications. If none of the PPM's emails arrive, the Microsoft 365 settings in Vercel (`MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MAIL_FROM`) are the place to look.
- If email isn't set up at all, the PPM says so when you press Invite, and creates nothing.
