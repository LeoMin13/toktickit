# Lab 2 — AI Use and Reflection

I used Claude (Anthropic), accessed through the Claude web interface, as
both a specification assistant and a coding agent throughout this sprint.
No separate "thinking level" setting applies to this interface.

## Selected Key Prompts

| Prompt Name | Actual Prompt Text |
|---|---|
| Draft Engineering Contract | "Write the four required documents for Issue 1 — specification.md, ui-spec.md, api-spec.md, and tests.md — following their required template and content guidelines, covering the Development Requester workflow, ticketing, attachments, and ownership rules." |
| Implement Requester Context | "Tell me exactly what I need (installations, code, and tests) to implement Issue 2: the Development Requester context, including the seed, the active-requesters API, and the selection screen." |
| Implement Reference Data | "Same as before, but for Issue 3: Categories and Related Systems as seeded reference data with their own endpoints." |
| Implement Create Ticket | "Same structure, for Issue 4: ticket creation, including backend-generated ticket number generation, field validation, and the Create Ticket screen." |
| Implement Attachment Upload | "Same structure, for Issue 5: attachment upload at ticket creation, enforcing file type, size, and count limits." |
| Implement My Tickets | "Same structure, for Issue 6: the My Tickets list with search, filtering, sorting, and pagination." |
| Implement Ticket Detail | "Same structure, for Issue 7: the read-only Ticket Detail screen with ownership enforcement." |
| Implement Attachment Lifecycle | "Same structure, for Issue 8: adding, downloading, and soft-removing attachments on an existing ticket." |
| Diagnose Recurring Test Failures | Pasted raw terminal output from Vitest, Playwright, PowerShell, or Prisma after a failed test run, and asked for the root cause and the exact fix, repeated across many debugging rounds throughout the sprint. |
| Triage External Code Review Feedback | Pasted specific defects identified by outside reviewers of the codebase (a broken download button, a missing TypeScript field, a broken Playwright selector, a malformed environment file) one at a time and asked for the root cause and a fix for each. |
| Full Requirements Audit | Asked for a complete check of every planned automated test against what was actually implemented, and a section-by-section verification of the finished application against the full set of course requirements, to surface any gaps before final submission. |

## My Reflection

Before any implementation began, I used the AI agent to draft the four
required engineering-contract documents (specification, UI spec, API spec,
and test plan) from the sprint's stakeholder request. I reviewed, trimmed,
and adjusted these drafts myself rather than using them as-is, since the
agent's first pass was longer and more repetitive than necessary — a
useful reminder that a generated specification still needs to be read
critically, not just accepted because it looks complete. From there, most
of my prompts followed a consistent two-step pattern per Issue: first ask
for a complete implementation plan across server, client, and tests for a
given Issue, then verify it by running the suggested commands myself and
reporting back the actual output. This worked well for straightforward
features, but a large share of the sprint's real effort went into the
second half of that loop — debugging.

Several bugs only appeared under conditions that are easy to overlook when
writing tests quickly: a race condition in ticket-number generation that
only showed up when multiple Playwright workers hit the same database at
once, a CSS selector that matched a hidden desktop element instead of the
visible mobile one, and a CORS header that silently broke a downloaded
file's name without ever causing a visible error. None of these were
caught by the first version of the automated tests, which taught me that
"the test passes" and "the feature actually works" are not the same
claim — a lesson reinforced later by an external code review, which found
a completely broken Download button that had gone unnoticed because the
existing test only checked that the button was visible, never that
clicking it worked.

Iterating with the AI agent was most valuable in these debugging moments:
pasting a raw, unedited error message and asking "what's the real cause"
consistently produced a more useful answer than trying to guess the fix
myself first. The main discipline I had to keep was not accepting a fix
at face value — re-running the tests myself after every change, and
pushing back when a "fix" only addressed the symptom (as happened with the
malformed database URL, which required tracing through a phantom database
before the real cause was clear). Doing a full audit at the end, checking
every planned test and every course requirement against what was actually
built, also caught a few smaller gaps — like a missing read-only Requester
field on the Create Ticket form — that had been implicitly assumed
correct simply because nothing had failed.
