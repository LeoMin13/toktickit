# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal

Deliver a Requester-facing ticketing MVP: a Requester (via a temporary
Development Requester selector) creates a ticket with attachments, finds it
in My Tickets, opens a read-only Ticket Detail, and manages attachments with
soft removal — all under the Zen Green UI conventions.

## 2. Stakeholder Request Interpretation

Requesters need to submit and track their own IT tickets before staff
workflow exists. Since login isn't ready until Lab 3, a temporary
"Development Requester" picker simulates identity for testing only. Data
must be strictly scoped per Requester, and the UI must establish a
reusable, consistent visual language.

## 3. Scope

**Included:** Development Requester Selection + context; Create Ticket
(with backend-generated Ticket Number and attachments); My Tickets
(search/filter/sort/pagination); Requester Ticket Detail (read-only) with
attachment add/download/soft-remove; ownership enforcement everywhere; Zen
Green UI spec.

**Excluded:** real authentication (login, sessions, tokens); IT Staff
workflow; Public Comments/Internal Notes/Actions Taken; any status beyond
`New`; Administrator functions.

## 4. Functional Requirements

- FR-01: Load active Requesters into a Development Requester Selection
  screen; selection sets the current testing identity.
- FR-02: Allow changing the selected Requester at any time from the app
  shell.
- FR-03: Create a Ticket (Category, Related System, Summary, Description,
  Requested Priority) for the selected Requester.
- FR-04: Generate a unique, backend-assigned Ticket Number on creation.
- FR-05: Attach 0–5 supporting files to a Ticket at creation or afterward.
- FR-06: List only the selected Requester's own Tickets, paginated.
- FR-07: Search (free text) and filter (Category, Priority, Status) the
  ticket list.
- FR-08: Sort the ticket list by Created Date or Last Updated.
- FR-09: Open a read-only Ticket Detail for an owned Ticket.
- FR-10: Reject any read/write on a Ticket or Attachment not owned by the
  selected Requester.
- FR-11: Download an active Attachment; soft-remove an active Attachment
  with a reason, keeping its metadata visible.

## 5. Business Rules

- BR-01: Ticket Number is backend-generated, unique, format
  `TKT-<YYYY>-<6 digits>` (e.g. `TKT-2026-000042`).
- BR-02: New Tickets start at Current Status `New`.
- BR-03: The Development Requester selector is a testing mechanism, not
  authentication, and is labeled as such in the UI.
- BR-04: Only active Requesters appear in the selector; inactive ones
  cannot own new Tickets.
- BR-05: `requesterId` is fixed at creation; a Requester may only
  read/modify their own Tickets/Attachments (`404` otherwise, no existence
  disclosure).
- BR-06: Summary required, 5–120 chars (trimmed); Description required,
  10–2000 chars (trimmed); Category, Related System, and Requested Priority
  required and must reference valid/active records.
- BR-07: Submit is disabled with a busy state while a create request is in
  flight; no duplicate Ticket on double-click. On failure, no partial Ticket
  is saved and entered values are retained.
- BR-08: Attachments: JPG/JPEG/PNG/WEBP/PDF only, ≤5 MB each, ≤5 active per
  Ticket. If upload fails after Ticket creation, the Ticket is still saved
  and failures are reported per file.
- BR-09: Removal is soft: flag `isRemoved`, store `removedAt` and a
  required `removalReason` (≥3 chars); file/row is never deleted. A
  removed Attachment shows metadata but cannot be downloaded/previewed.
- BR-10: If no active Requesters exist, or reference data fails to load,
  show a clear empty/error state (never a broken screen or raw error).
- BR-11: Default sort is Created Date descending; default page size 10
  (accepted: 10/25/50, else `400`).

## 6. UI Specification Summary

App shell: TokTickIT identity, My Tickets / Create Ticket nav, current
Requester name + Change Requester action, responsive nav. Create Ticket:
generated fields read-only near top, classification fields grouped,
Summary/Description full width, Attachments below, primary/secondary
actions at bottom, field-level validation. My Tickets: search, filters,
sortable columns, pagination, card layout on mobile. Ticket Detail:
read-only header separate from Attachments section. Full detail in
`ui-spec.md`.

## 7. Data Changes

- **RequesterUser**: id, name, email (unique), isActive (default true),
  createdAt.
- **RelatedSystem**: id, name (unique), isActive (default true), createdAt.
- **Category** (Lab 1, reused): id, name (unique), createdAt.
- **Ticket**: id, ticketNumber (unique), requesterId FK, categoryId FK,
  relatedSystemId FK, summary, description, requestedPriority
  (LOW/MEDIUM/HIGH), currentStatus (default NEW), createdAt, updatedAt.
- **Attachment**: id, ticketId FK, originalFileName, storedFileName,
  mimeType, sizeBytes, uploadedAt, isRemoved (default false), removedAt,
  removalReason.

Indexes: unique on `ticketNumber`, `RequesterUser.email`,
`RelatedSystem.name`; index on `Ticket.requesterId` and
`Attachment.ticketId`. Soft removal via `isRemoved`/`removedAt`/
`removalReason`, no hard deletes.

## 8. API Contract

See `api-spec.md`. Endpoints: `GET /api/requesters`, `GET /api/categories`,
`GET /api/related-systems`, `POST /api/tickets`, `GET /api/tickets`,
`GET /api/tickets/:id`, `POST /api/tickets/:id/attachments`,
`GET /api/attachments/:id/download`, `DELETE /api/attachments/:id`. Current
Requester is passed via header `X-Requester-Id` (testing mechanism, not a
credential).

## 9. Acceptance Criteria

- AC-01: Given valid data, when the Requester submits Create Ticket, then
  the Ticket is saved and its Ticket Number is displayed.
- AC-02: Given no Requester is selected, when opening My Tickets or Create
  Ticket, then the Requester Selection screen is shown.
- AC-03: Given Requester B is selected, when Requester A's Ticket is
  requested by id, then it is not returned (`404`).
- AC-04: Given Summary is empty, when submitting, then a field-level
  message appears and no API call is made.
- AC-05: Given a valid submission on mobile, then the confirmation shows
  the Ticket Number with no clipping or horizontal scroll.
- AC-06: Given the backend is unavailable, when submitting, then a safe
  error message is shown and field values are retained.
- AC-07: Given a 6 MB file is selected, when adding it, then it is rejected
  with a clear size message.
- AC-08: Given a Ticket already has 5 active attachments, adding a 6th is
  rejected.
- AC-09: Given Requester A has tickets Requester B doesn't, when B is
  selected, then only B's tickets show, and switching back/forth reloads
  the list and clears filters.
- AC-10: Given a search term with no match, then a no-results state is
  shown (distinct from an empty-list state).
- AC-11: Given an owned Ticket with one active and one removed attachment,
  then only the active one offers Download, and the removed one still
  shows its metadata and reason after removal.
- AC-12: Given no active Requesters exist, then the selector shows an empty
  state instead of a broken dropdown.

## 10. Definition of Done

- [ ] FR-01–FR-11 implemented; BR-01–BR-11 enforced server-side
- [ ] Every AC has at least one passing, traceable automated test
- [ ] Ownership enforced on every ticket/attachment read and write
- [ ] Data model matches §7 via a committed Prisma migration
- [ ] API matches `api-spec.md` exactly (shapes, statuses, errors)
- [ ] UI matches `ui-spec.md`; loading/empty/no-results/error states present
- [ ] No test skipped/disabled; all tests pass on final `main`
- [ ] README updated with Lab 2 setup/run/test instructions
- [ ] Course delivery: Issues, feature branches, peer-reviewed PRs through
      `lab2-staging` into `main`, `reviewer.md` completed, PDF submitted

## 11. Assumptions and Decisions

- Ticket Number: `TKT-<YYYY>-<6-digit sequence>`, mirroring the labsheet's
  illustrative screens.
- Requester identity passed via `X-Requester-Id` header, not a query
  param — kept out of URLs/logs and easy to replace with a real session in
  Lab 3.
- `RelatedSystem` is its own reference table (like `Category`) to support
  consistent filtering.
- Removed-attachment downloads return `410 Gone` (not `404`) to distinguish
  "removed on purpose" from "does not exist."
- Pagination is offset-based (`page`/`pageSize`) — simplest to implement and
  test at this scale.
