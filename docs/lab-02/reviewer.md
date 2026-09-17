# Lab 2 — Peer Review Record

## Reviewer Identity

| Field | Value |
|---|---|
| Name | LEPOUTRE Léo |
| Student ID | 69540460045 |
| GitHub username | LeoMin13 |
| Peer reviewer (partner) | LABARRERE Imanol |
| Partner's GitHub username | ImanolLabarrere |

## Pull Requests I Submitted (reviewed by my partner)

| PR | Branch | Reviewer Comment Received |
|---|---|---|---|---|
| #1 | `feature/1-spec-and-tests` → `lab2-staging` | Perfect |
| #2 | `feature/2-requester` → `lab2-staging` | All good |
| #3 | `feature/3-categories-systems` → `lab2-staging` | Ok Léo your work is aproved |
| #4 | `Feature/4 ticket creation` → `lab2-staging` | Looks good |
| #5 | `feature/5-attachement-upload` → `lab2-staging` | Good work |
| #6 | `feature/6-my-tickets` → `lab2-staging` | ok Léo keep up the good work |
| #7 | `feature/7-ticket-detail` → `lab2-staging` | J'adore. |
| #8 | `feature/8-download-soft-removal` → `lab2-staging` | All good |
| #9 | `feature/9-visual-coherence` → `lab2-staging` | I agree |
| #10 | `feature/10-e2e + general debug` → `lab2-staging` | “Excellence is never an accident. It is always the result of high intention, sincere effort, and intelligent execution; it represents the wise choice of many alternatives - choice, not chance, determines your destiny.”
― Aristotle |

| ... | ... | ... | ... | ... |

## Detailed Code Review Findings

Beyond the per-PR review cycle, a full-application review was carried out after
the sprint's functional implementation was complete. This review inspected
the client, server, and end-to-end test code together, rather than isolated
diffs, and surfaced four real defects that the individual PR reviews and the
existing automated tests had not caught. Each is documented below with the
evidence, the root cause, and the fix applied.

### Finding 1 — Attachment download button never worked

**Severity:** High (core acceptance criterion, AC-11 / AC-13, silently broken)

**Evidence:** `client/downloaded.pdf`, present in the repository from a
manual test, contained the raw JSON body `{"error":"Attachment not
found"}` instead of PDF content — proof that clicking "Download" during
manual testing never retrieved a real file.

**Root cause:** The Download control was a plain `<a href="...">` tag. A
normal browser navigation triggered by an anchor tag cannot attach custom
HTTP headers. The download endpoint requires `X-Requester-Id` (enforced
by the `requireRequester` middleware), so every click resulted in a
`401`/`404` response rendered as a raw page instead of a file download.

**Why existing tests missed it:** The only automated check
(`RequesterTicketDetail.test.tsx`, part of UI-07) asserted that a
"Download" button was *visible*, never that clicking it produced a real
result. The Playwright visual test (VISUAL-01) only took screenshots and
never interacted with the control either.

**Fix:** Replaced the `<a href>` with a button that performs an
authenticated `fetch`, receives the file as a `Blob`, and triggers the
download via a temporary object-URL link (`api.ts: downloadAttachment`,
`TicketDetail.tsx: handleDownload`). The E2E test (E2E-01) was
strengthened to use `page.waitForEvent("download")`, which only resolves
on a genuine browser download — this would have failed immediately
against the old implementation, closing the coverage gap.

**Follow-up bug found during the fix:** the corrected code initially
produced a generic filename (`attachment-<id>.pdf`) instead of the
original filename, because the `Content-Disposition` response header was
not exposed via CORS (`Access-Control-Expose-Headers`). Fixed in
`server/src/app.ts` by adding `exposedHeaders: ["Content-Disposition"]`
to the `cors()` configuration.

### Finding 2 — Missing fields on the `Attachment` type caused a masked TypeScript error

**Severity:** Medium (type-safety gap; symptom of the real underlying bug)

**Evidence:** `src/pages/TicketDetail.tsx` failed to compile with:
```
error TS2339: Property 'removalReason' does not exist on type 'Attachment'.
error TS2339: Property 'removedAt' does not exist on type 'Attachment'.
```
And, more tellingly, `RequesterTicketDetail.test.tsx` contained an `as
never` type assertion on a mocked attachment object — a strong signal
that a type error had been suppressed rather than fixed.

**Root cause:** `client/src/types.ts`'s `Attachment` interface was
written during Issue 5 (attachment upload), before soft removal existed
(Issue 8), and was never updated to include `removedAt` /
`removalReason`.

**Fix:** Added the two optional fields to the `Attachment` interface, and
removed the `as never` workaround from the test file, since it was no
longer necessary once the type was correct.

### Finding 3 — Playwright selector silently skipped the mobile Ticket Detail screenshot

**Severity:** Medium (coverage gap: incomplete evidence for the Definition
of Done's responsive requirement)

**Evidence:** `artifacts/lab-02/screenshots/ticket-detail/` contained
only `desktop.png` and `tablet.png`; the mobile capture was missing with
no test failure, because the code used
`if (await firstTicketLink.count())` to skip gracefully when no element
was found — silently hiding the bug.

**Root cause:** The selector `table a, .card a` assumes a `<a>` element
nested *inside* an element with the `card` class. In `MyTickets.tsx`'s
mobile layout, the `<Link>` itself carries the `card` class
(`<Link className="card ...">`) — there is no nested anchor, so the
selector matched zero elements on mobile viewports.

**Fix:** Changed the selector to `table a:visible, a.card:visible` in
both `e2e/lab-02/visual.spec.ts` and
`e2e/lab-02/requester-ticket-flow.spec.ts`, targeting the element that
*has* the `card` class rather than a descendant of it.

### Finding 4 — Malformed `DATABASE_URL` created a phantom database

**Severity:** High (data integrity / environment reproducibility)

**Evidence:** `server/.env` contained a trailing, unmatched double quote:
```
DATABASE_URL=postgresql://postgres:leomin@localhost:5432/toktickit"
```
`psql -U postgres -c "\l"` subsequently revealed **two** databases:
`toktickit` (the real one, fully migrated and seeded) and
`toktickit%22` — the URL-encoded form of `toktickit"` — an empty database
that had been silently created and connected to by mistake.

**Root cause:** The unmatched quote was passed through by `dotenv`/Prisma
as a literal character in the connection string, changing the target
database name.

**Fix:** Corrected `.env` to remove the stray quote, dropped and
recreated the `toktickit` database to guarantee a clean state, re-ran
`prisma migrate deploy` and the seed script, and deleted the phantom
`toktickit%22` database.

## Board Evidence

All four Issues affected by the review findings above were moved back to
**Fixing** on the Kanban board after the review, then returned to **PR
Review** once the corrections were pushed, and finally to **Done** after
re-verification. See the Kanban board screenshot in Answer Part 1 for the
final state (all Issues in Done).
