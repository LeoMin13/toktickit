# Lab 3 Sprint Engineering Specification

## 1. Sprint Goal

Replace the Development Requester selector with real authenticated
accounts and role-based authorization; ship an operational IT Staff
Ticket Queue and Detail workflow, and a minimalist Administrator user
management screen — without breaking Lab 2 Requester functionality.

## 2. Stakeholder Request Interpretation

The system needs real users now. Login replaces the dev selector.
Administrators manage accounts; IT Staff manage tickets end-to-end
(claim, prioritize, communicate, resolve); Requesters keep their Lab 2
capabilities plus public comments and a "problem resolved" signal.
Every protection must be server-enforced, not just hidden in the UI.

## 3. Scope

**Included:** login/logout/current-user, mandatory first-login password
change, server-side role authorization, migration of Lab 2 data to real
`User` accounts, IT Staff Queue + Ticket Detail (ownership, IT Priority,
status, Internal Notes), Requester Public Comments + "Problem Appears
Resolved", minimalist Admin user management.

**Excluded:** email/password-reset flows, MFA, SSO, self-registration,
Actions Taken, SLA/notifications, multi-tenant, user deletion, bulk ops,
multi-role users, account history.

## 4. Functional Requirements

- FR-01: Authenticate with email + password; establish an authenticated
  session/token.
- FR-02: Force a password change before any other screen when
  `mustChangePassword` is true.
- FR-03: Expose the current authenticated user's identity and role.
- FR-04: Logout invalidates access; protected routes reject subsequent
  requests.
- FR-05: All Lab 2 Ticket/Attachment operations use the authenticated
  identity, ignoring any client-supplied requester id.
- FR-06: Requester can post Public Comments and mark a ticket "problem
  appears resolved" (non-binding signal, not a status change).
- FR-07: IT Staff can list/search/filter/sort/page a shared Ticket Queue.
- FR-08: IT Staff can claim or reassign Ticket ownership.
- FR-09: IT Staff can set IT Priority and perform permitted status
  transitions.
- FR-10: IT Staff/Admin can post Internal Notes, hidden from Requesters.
- FR-11: Administrator can list (search + optional role filter), create,
  edit, activate/deactivate users, and set a new initial password.

## 5. Business Rules

- BR-01: Only an active user with valid credentials may authenticate;
  invalid credentials and inactive accounts return the same generic
  error (no account-existence disclosure).
- BR-02: A user with `mustChangePassword = true` cannot reach any other
  screen/endpoint until a valid new password is saved.
- BR-03: Ownership of Requester operations is always derived from the
  authenticated identity; any client-supplied requester/owner id on
  Requester-scoped endpoints is ignored.
- BR-04: Public Comments are visible to Requester, IT Staff, Admin.
  Internal Notes are visible only to IT Staff and Admin; a Requester
  request for Internal Notes is rejected (403) without leaking content.
- BR-05: A Requester may flag "problem appears resolved" but cannot set
  status to `Resolved`/`Closed` themselves.
- BR-06: New tickets start at status `New`; only IT Staff/Admin change
  status, following the transition matrix (§6 of this doc).
- BR-07: IT Priority defaults to Requested Priority on creation and can
  only be changed by IT Staff/Admin afterward.
- BR-08: A Ticket has at most one primary Ticket Owner (IT Staff/Admin,
  must be active); a ticket may be unassigned.
- BR-09: Public Comments and Internal Notes are append-only; empty or
  whitespace-only content is rejected; each entry stores author +
  timestamp server-side.
- BR-10: An email address is unique across users; creating/editing a
  user with a duplicate email is rejected.
- BR-11: An Administrator cannot deactivate their own account.
- BR-12: The system always keeps at least one active Administrator;
  deactivating the last one is rejected.
- BR-13: Creating/editing a user assigns exactly one role
  (`REQUESTER`/`IT_STAFF`/`ADMIN`).
- BR-14: Setting a new initial password always sets
  `mustChangePassword = true`.
- BR-15: Passwords are never stored or logged in plaintext (hashed with
  bcrypt/argon2).

## 6. Ticket Status Transition Matrix

| From ↓ / To → | Open | In Progress | Waiting for Requester | Resolved | Closed | Reopened | Cancelled |
|---|---|---|---|---|---|---|---|
| New | ✅ | ✅ | — | — | — | — | ✅ |
| Open | — | ✅ | ✅ | — | — | — | ✅ |
| In Progress | ✅ | — | ✅ | ✅ | — | — | ✅ |
| Waiting for Requester | ✅ | ✅ | — | ✅ | — | — | ✅ |
| Resolved | — | — | — | — | ✅ | ✅ | — |
| Closed | — | — | — | — | — | ✅ | — |
| Reopened | ✅ | ✅ | ✅ | — | — | — | ✅ |
| Cancelled | — | — | — | — | — | ✅ | — |

Only IT Staff/Admin may transition status. Any transition not marked ✅
is rejected with `400 Bad Request`.

## 7. Authorization Matrix

| Operation | Requester | IT Staff | Admin |
|---|---|---|---|
| Create/view own Tickets & Attachments | ✅ | — | — |
| View any Ticket in Queue | — | ✅ | ✅ |
| Claim/reassign ownership | — | ✅ | ✅ |
| Set IT Priority / change status | — | ✅ | ✅ |
| Post Public Comment | ✅ (own ticket) | ✅ | ✅ |
| Read Public Comments | ✅ (own ticket) | ✅ | ✅ |
| Post/read Internal Notes | — | ✅ | ✅ |
| Mark "problem appears resolved" | ✅ (own ticket) | — | — |
| Manage users (Admin screen) | — | — | ✅ |

## 8. UI Specification Summary

Login → mandatory Change Password (if flagged) → authenticated app shell
showing name + role + Logout. Requester keeps Lab 2 screens plus
Comments/Resolved action on Ticket Detail. IT Staff gets a Queue (table
desktop / cards mobile) and an extended Ticket Detail with Owner/IT
Priority/Status controls, Public Comments and visually distinct Internal
Notes. Admin gets one User Management screen (list + create/edit panel).
Full detail in `ui-spec.md`.

## 9. Data Changes

- **User** (replaces `RequesterUser`): id, name, email (unique),
  passwordHash, role (enum: REQUESTER/IT_STAFF/ADMIN), isActive (default
  true), mustChangePassword (default true on creation), createdAt.
- **Ticket** (extended): add `ticketOwnerId` (FK → User, nullable),
  `itPriority` (defaults to requestedPriority), `currentStatus` enum
  extended to New/Open/InProgress/WaitingForRequester/Resolved/Closed/
  Reopened/Cancelled, `problemAppearsResolved` (boolean, default false).
- **PublicComment**: id, ticketId FK, authorId FK → User, content,
  createdAt.
- **InternalNote**: id, ticketId FK, authorId FK → User, content,
  createdAt.

Migration: existing `RequesterUser` rows become `User` rows with
role=REQUESTER, a generated hashed placeholder password, and
`mustChangePassword = true`; existing `Ticket.requesterId` FKs are
repointed to the new `User` ids (same underlying identity, new table).

## 10. API Contract

See `api-spec.md`. New endpoints: `/api/auth/*`,
`/api/staff/tickets*`, `/api/tickets/:id/comments`,
`/api/tickets/:id/notes`, `/api/admin/users*`. Session identity replaces
the `X-Requester-Id` header used in Lab 2.

## 11. Acceptance Criteria

- AC-01: Given valid credentials for an active user, login succeeds and
  returns the user's identity and role.
- AC-02: Given `mustChangePassword = true`, the app blocks all other
  screens until a valid new password is saved.
- AC-03: Given an authenticated Requester, a client-supplied
  `requesterId` is ignored; only the authenticated identity's own data is
  ever returned.
- AC-04: Given a Requester token, a request to an Internal Notes endpoint
  is rejected (403) with no note content in the response.
- AC-05: Given IT Staff, claiming an unassigned ticket sets its owner to
  that IT Staff member.
- AC-06: Given a ticket at status `Resolved`, only `Closed`/`Reopened`
  transitions are accepted; any other is rejected (400).
- AC-07: Given an Admin tries to deactivate their own account, the
  request is rejected.
- AC-08: Given only one active Admin exists, deactivating them is
  rejected.
- AC-09: Given a duplicate email on user creation/edit, the request is
  rejected with a field-level error.
- AC-10: Given logout has occurred, a subsequent request to a protected
  endpoint is rejected (401).
- AC-11: Given a Requester marks "problem appears resolved", the ticket's
  status is unchanged.
- AC-12: Given a non-Admin calls an Admin endpoint directly, it is
  rejected (403).

## 12. Definition of Done

- [ ] FR-01–FR-11 implemented; BR-01–BR-15 enforced server-side
- [ ] Every AC has a passing, traceable automated test
- [ ] Lab 2 Requester ticket/attachment tests still pass under real auth
- [ ] Authorization matrix (§7) and status matrix (§6) fully enforced and
      tested directly at the API level (not just hidden in UI)
- [ ] Data model matches §9 via a committed migration that preserves
      existing Ticket/Attachment data
- [ ] API matches `api-spec.md`; UI matches `ui-spec.md`
- [ ] No test skipped/disabled; all tests pass on final `main`
- [ ] README updated with Lab 3 setup/seed/login instructions

## 13. Assumptions and Decisions

- Session-based auth (signed HTTP-only cookie) chosen over JWT: simpler
  logout invalidation for this course scope, no token refresh logic
  needed.
- Migrated Lab 2 Requesters get a random hashed password and
  `mustChangePassword = true` — nobody can log in with a guessed
  password, and real accounts are set up via seed/Admin instead.
- `problemAppearsResolved` stored as a separate boolean rather than a
  status value, keeping it clearly non-binding per BR-05.
