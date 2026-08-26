# Lab 2 Test Plan and Results

## 1. Test Strategy

Written from `specification.md` before implementation (TDD). Every
Acceptance Criterion (AC-01–AC-12) maps to at least one test below. Levels:
unit, API (Supertest), UI (Vitest + Testing Library), visual/responsive and
E2E (Playwright).

## 2. Planned Tests

| Test ID | Type | AC | What It Tests | Expected Result | Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-01 | Ticket Number generator format/uniqueness | `TKT-YYYY-NNNNNN`, unique per call | `server/src/__tests__/ticketNumber.test.ts` | Pending |
| API-01 | API | AC-01 | `POST /api/tickets` valid data | 201 with unique `ticketNumber` | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-02 | API | AC-04 | `POST /api/tickets` empty Summary | 400, field error, nothing saved | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-03 | API | AC-09 | `GET /api/tickets` for Requester A vs B | Each sees only their own tickets | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-04 | API | AC-10 | `GET /api/tickets?search=<no match>` | 200, empty `data` (no-results) | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-05 | API | — (BR-11) | `GET /api/tickets?pageSize=10&page=1` with 12 seeded | Correct pagination metadata | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-06 | API | AC-03 | `GET /api/tickets/:id` cross-requester | 404, no ownership hint | `server/tests/lab-02/ticket-detail.api.test.ts` | Pending |
| API-07 | API | AC-07 | Upload a 6 MB attachment | 413, size-limit message | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-08 | API | AC-08 | Upload 6th attachment on a full ticket | 409, limit message | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-09 | API | AC-11 | Soft-remove then attempt download | Remove succeeds (metadata kept); download → 410 | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-10 | API | — (FR-10) | Remove attachment on a ticket not owned | 404, no hint | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-11 | API | AC-12 | `GET /api/requesters` with none active | 200, empty array | `server/tests/lab-02/requesters.api.test.ts` | Pending |
| UI-01 | UI | AC-02 | My Tickets rendered with no Requester selected | Redirects to Requester Selection | `client/src/features/tickets/__tests__/MyTickets.test.tsx` | Pending |
| UI-02 | UI | AC-12 | Requester Selection with empty mocked list | Empty-state message shown | `client/src/features/requester/__tests__/RequesterSelection.test.tsx` | Pending |
| UI-03 | UI | AC-04 | Submit Create Ticket with Summary empty | Field message shown; API not called | `client/src/features/tickets/__tests__/CreateTicket.test.tsx` | Pending |
| UI-04 | UI | AC-06 | Submit with API mock rejecting | Safe error shown; values retained | `client/src/features/tickets/__tests__/CreateTicket.test.tsx` | Pending |
| UI-05 | UI | AC-07 | Select a 6 MB file in the picker | Inline error; file excluded from submit | `client/src/features/tickets/__tests__/AttachmentSection.test.tsx` | Pending |
| UI-06 | UI | AC-09 | Requester switch (mocked context) | List re-fetches; filters clear | `client/src/features/tickets/__tests__/MyTickets.test.tsx` | Pending |
| UI-07 | UI | AC-11 | Ticket Detail with active + removed attachment | Removed item shows metadata, no Download | `client/src/features/tickets/__tests__/RequesterTicketDetail.test.tsx` | Pending |
| VISUAL-01 | Responsive | AC-05 | Playwright screenshots of all 3 screens at desktop/tablet/mobile | Saved to `artifacts/lab-02/screenshots/`; checklist passes | `e2e/lab-02/visual.spec.ts` | Pending |
| E2E-01 | E2E | AC-01, AC-09 | Select Requester → create ticket with attachment → find in My Tickets → open Detail | Ticket Number visible throughout; attachment listed | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |
| E2E-02 | E2E | AC-03 | Requester A creates a ticket; Requester B tries direct URL access | Access blocked | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |

## 3. Acceptance-Criterion Traceability

| AC | Covered By |
|---|---|
| AC-01 | API-01, E2E-01 |
| AC-02 | UI-01 |
| AC-03 | API-06, E2E-02 |
| AC-04 | API-02, UI-03 |
| AC-05 | VISUAL-01 |
| AC-06 | UI-04 |
| AC-07 | API-07, UI-05 |
| AC-08 | API-08 |
| AC-09 | API-03, UI-06, E2E-01 |
| AC-10 | API-04 |
| AC-11 | API-09, UI-07 |
| AC-12 | API-11, UI-02 |

All 12 Acceptance Criteria have at least one mapped test.

## 4. Responsive and Visual Checklist

- [ ] No clipped labels/buttons at desktop, tablet, or mobile
- [ ] No overlapping messages/badges
- [ ] No unintended horizontal scrolling
- [ ] Read-only fields visually distinct from editable ones
- [ ] Badge colors match `ui-spec.md` tokens, with text labels
- [ ] Keyboard focus indicator visible through Create Ticket

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

- No load/performance testing of the ticket list.
- E2E/visual tests run on Chromium only.
