# Lab 3 UI Specification — Zen Green Extensions

Extends the Lab 2 Zen Green spec (colors, spacing, field states, button
hierarchy, responsive rules — unchanged, see Lab 2 `ui-spec.md`). This
document covers only what Lab 3 adds.

## 1. Application Shell

- Development Requester display + "Change Requester" removed entirely.
- Shell shows authenticated user's name + role badge, and a Logout
  action.
- Nav links shown are filtered by role: Requester sees My
  Tickets/Create Ticket; IT Staff sees My Queue/Create Ticket (or none,
  per team decision); Admin sees Users. No link to an unauthorized
  destination is ever rendered.

## 2. Login & Change Password

- Login: email, password, Sign In button (busy state while submitting),
  generic safe error banner on failure (`"Invalid email or password."`
  — same message for wrong password and inactive account).
- Change Password (mandatory, no way to skip): current/temporary
  password, new password, confirm new password, live rule checklist
  (length, upper/lower, number, special char), Continue button disabled
  until all rules pass and confirmation matches.

## 3. Role Badges

New badge type, distinct shape/icon from Priority/Status badges:
- `Requester` → neutral gray pill
- `IT Staff` → secondary-green pill
- `Administrator` → primary-green pill

## 4. Status Badges (extended set)

| Status | Style |
|---|---|
| New | pale-green pill (from Lab 2) |
| Open | secondary-green pill |
| In Progress | amber pill |
| Waiting for Requester | gray-blue pill |
| Resolved | green pill with check icon |
| Closed | dark-gray pill |
| Reopened | amber pill with arrow icon |
| Cancelled | red-outline pill |

All include text labels; none rely on color alone (icon or label text
disambiguates similarly-colored badges).

## 5. IT Staff Ticket Queue

Desktop table columns: Ticket No., Created Date, Summary, Category,
Requested Priority, IT Priority, Status, Owner, Last Updated. Mobile:
stacked cards (Ticket No. + Status badge on top row, Summary bold,
Category · Priority · Owner on a secondary line). Same search/filter/
sort/pagination conventions as Lab 2 My Tickets. Forbidden state (non
IT-Staff/Admin) shows a plain "Access denied" message, no data leak.

## 6. IT Staff Ticket Detail

Extends Lab 2 Ticket Detail: header fields grouped as before; adds an
**Ownership & Priority** panel (Owner dropdown limited to active IT
Staff/Admin, IT Priority dropdown, Status dropdown restricted to
matrix-permitted values) editable only by IT Staff/Admin. Public
Comments and Internal Notes are two visually separate sections — Internal
Notes use a distinct background tint (amber-tinted card) and a "Internal
— IT Staff only" label so it's never mistaken for a Public Comment.

## 7. Requester Ticket Detail Additions

Adds a Public Comments thread (same visual style as Internal Notes but
green-tinted, labeled "Visible to IT Staff") and a "Mark problem as
resolved" secondary button; clicking it shows a confirmation toast, not a
status badge change.

## 8. Administrator User Management

Single screen: left = user list (Name, Email, Role, Status, Edit action,
search box, optional role-filter dropdown); right/modal = Create/Edit
panel (Name, Email, Role select, Active toggle, initial-password field
shown only on create or on explicit "Set new password" action). Inline
validation for duplicate email and missing fields. Safety-rule violations
(self-deactivation, last active Admin) show a plain inline error, not a
silent no-op.

## 9. Screen States

Same conventions as Lab 2 (loading/validation/submitting/success/
failure/empty/no-results), plus:
- **Forbidden**: plain message + link back to an authorized screen, used
  whenever a role attempts an action outside §7 of `specification.md`.

## 10. Screenshot Paths

`artifacts/lab-03/screenshots/{authentication,staff-queue,staff-ticket-detail,user-management}/{desktop,tablet,mobile}.png`

## 11. Visual Checklist

- [ ] No unauthorized nav link ever rendered for any role
- [ ] Internal Notes visually unmistakable from Public Comments
- [ ] Role/Status/Priority badges never confused with each other
- [ ] No clipped labels/buttons at any viewport
- [ ] Read-only vs editable fields remain visually distinct
- [ ] Focus indicator visible throughout Login and Change Password
