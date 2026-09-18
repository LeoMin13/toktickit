# Lab 3 Test Plan and Results

## 1. Test Strategy

Written before implementation (TDD). Every AC (AC-01–AC-12) maps to at
least one test. Levels: unit, API, UI, authorization, migration/
regression, responsive/visual, E2E.

## 2. Planned Tests

| Test ID | Type | AC | What It Tests | Expected Result | Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-15 | Password hashing never stores plaintext | Hash ≠ raw input, verify() works | `server/src/__tests__/password.test.ts` | Pending |
| API-01 | API | AC-01 | Valid login | 200, correct role returned | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-02 | API | BR-01 | Invalid password / inactive account | 401, identical generic message | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-03 | API | AC-10 | Protected route after logout | 401 | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-04 | API | AC-02 | Access other endpoint while mustChangePassword | 403/redirect until password changed | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-05 | API | AC-03 | Requester supplies foreign requesterId in body | Ignored; own data only returned | `server/tests/lab-03/authorization.api.test.ts` | Pending |
| API-06 | API | AC-04 | Requester calls Internal Notes endpoint | 403, no note content | `server/tests/lab-03/authorization.api.test.ts` | Pending |
| API-07 | API | AC-12 | Non-Admin calls Admin endpoint | 403 | `server/tests/lab-03/authorization.api.test.ts` | Pending |
| API-08 | API | FR-07 | Staff Queue search/filter/sort/pagination | Correct filtered/paginated data | `server/tests/lab-03/staff-queue.api.test.ts` | Pending |
| API-09 | API | AC-05 | Claim an unassigned ticket | Owner set to caller | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pending |
| API-10 | API | AC-06 | Disallowed status transition | 400 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pending |
| API-11 | API | BR-07 | IT Priority defaults to Requested Priority on creation | Equal on new ticket | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pending |
| API-12 | API | BR-09 | Empty Public Comment / Internal Note | 400 | `server/tests/lab-03/comments-notes.api.test.ts` | Pending |
| API-13 | API | AC-11 | Requester marks problem resolved | Flag true, status unchanged | `server/tests/lab-03/comments-notes.api.test.ts` | Pending |
| API-14 | API | AC-09 | Create/edit user with duplicate email | 409 | `server/tests/lab-03/users-admin.api.test.ts` | Pending |
| API-15 | API | AC-07 | Admin deactivates own account | 400 | `server/tests/lab-03/users-admin.api.test.ts` | Pending |
| API-16 | API | AC-08 | Deactivate the last active Admin | 400 | `server/tests/lab-03/users-admin.api.test.ts` | Pending |
| MIGRATE-01 | Migration | — | Lab 2 seeded tickets still resolve to valid owners after migration | All existing tickets retain correct requesterId | `server/tests/lab-03/migration.api.test.ts` | Pending |
| UI-01 | UI | AC-01 | Login form: valid + invalid submission | Success redirects; failure shows generic banner | `client/tests/lab-03/Login.test.tsx` | Pending |
| UI-02 | UI | AC-02 | Change Password: rule checklist gates Continue | Button disabled until all rules pass | `client/tests/lab-03/ChangePassword.test.tsx` | Pending |
| UI-03 | UI | FR-07 | Staff Queue renders with mocked data; forbidden state for non-staff | Table/cards render; forbidden message shown | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pending |
| UI-04 | UI | AC-05 | Staff Ticket Detail: claim button updates owner display | Owner field reflects claim | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pending |
| UI-05 | UI | BR-04 | Internal Notes section visually distinct / hidden for Requester view | Correct section rendered per role prop | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pending |
| UI-06 | UI | AC-09 | User Management: duplicate email shown inline | Field error rendered, no API retry loop | `client/tests/lab-03/UserManagement.test.tsx` | Pending |
| VISUAL-01 | Responsive | — | Playwright screenshots of Login, Staff Queue, Staff Ticket Detail, User Management at 3 viewports | Saved to `artifacts/lab-03/screenshots/`; checklist passes | `e2e/lab-03/visual.spec.ts` | Pending |
| E2E-01 | E2E | AC-01, AC-02 | Login with initial password → forced change → app opens | Change Password gate then normal app | `e2e/lab-03/authentication.spec.ts` | Pending |
| E2E-02 | E2E | AC-10 | Logout → direct navigation to a protected page | Redirected to Login | `e2e/lab-03/authentication.spec.ts` | Pending |
| E2E-03 | E2E | AC-05, AC-06 | IT Staff claims a ticket, sets priority, moves status, adds a note | All changes persisted and visible | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pending |
| E2E-04 | E2E | AC-07, AC-08, AC-09 | Admin creates a user, then attempts self-deactivation and duplicate email | Both rejected with visible errors | `e2e/lab-03/user-administration.spec.ts` | Pending |

## 3. Acceptance-Criterion Traceability

| AC | Covered By |
|---|---|
| AC-01 | API-01, UI-01, E2E-01 |
| AC-02 | API-04, UI-02, E2E-01 |
| AC-03 | API-05 |
| AC-04 | API-06 |
| AC-05 | API-09, UI-04, E2E-03 |
| AC-06 | API-10, E2E-03 |
| AC-07 | API-15, E2E-04 |
| AC-08 | API-16, E2E-04 |
| AC-09 | API-14, UI-06, E2E-04 |
| AC-10 | API-03, E2E-02 |
| AC-11 | API-13 |
| AC-12 | API-07 |

All 12 Acceptance Criteria have at least one mapped test.

## 4. Responsive and Visual Checklist

See `ui-spec.md` §11 — completed manually against VISUAL-01 screenshots.

## 5. Test Commands

```bash
cd server && npm test
cd client && npm test
cd e2e && npx playwright test
```

## 6. Final Results

_Filled in once implementation is complete, run from `main`:_
```
server: X/X passing
client: X/X passing
e2e:    X/X passing
```

## 7. Known Limitations or Deferred Tests

- Session expiration/timeout behavior is not load-tested.
- E2E/visual tests run on Chromium only.
