# Lab 3 API Contract

Session-based auth via a signed, HTTP-only cookie (`session`), set on
login and cleared on logout. All endpoints below (except `/api/auth/*`)
require a valid session; the authenticated `user.id`/`role` replace Lab
2's `X-Requester-Id` header entirely.

## Auth

### POST /api/auth/login
Body: `{ "email": "...", "password": "..." }`
`200: { "id": 1, "name": "...", "role": "REQUESTER", "mustChangePassword": false }` + sets session cookie.
`401: { "error": "Invalid email or password." }` (same message for wrong password and inactive account)

### POST /api/auth/logout
`200: {}`, clears session cookie.

### GET /api/auth/me
`200:` same shape as login success. `401` if not authenticated.

### POST /api/auth/change-password
Body: `{ "currentPassword": "...", "newPassword": "..." }`
`200: { "mustChangePassword": false }`
`400:` new password fails rules. `401:` wrong current password.

## Requester (Lab 2 endpoints, now session-based)

`POST /api/tickets`, `GET /api/tickets`, `GET /api/tickets/:id`,
`POST /api/tickets/:id/attachments`, `GET /api/attachments/:id/download`,
`DELETE /api/attachments/:id` — same shapes as Lab 2's `api-spec.md`,
but requester identity now comes from the session, not a header; any
`requesterId` in the request body is ignored.

### POST /api/tickets/:id/comments
Body: `{ "content": "..." }`. Requires ownership (Requester) or
IT Staff/Admin. `201:` comment with author + timestamp. `400:` empty
content.

### GET /api/tickets/:id/comments
Same access rule as above. `200: [{...}]`

### PATCH /api/tickets/:id/resolved
Requester only, own ticket. `200: { "problemAppearsResolved": true }`

## IT Staff / Admin

### GET /api/staff/tickets
Query: `search, categoryId, requestedPriority, itPriority, currentStatus, ownerId, sort, order, page, pageSize`.
`200: { "data": [...], "pagination": {...} }`. `403` for Requester.

### GET /api/staff/tickets/:id
`200:` full ticket incl. comments/notes/attachments. `403`/`404` as Lab 2 rules.

### PATCH /api/staff/tickets/:id/owner
Body: `{ "ownerId": 5 }` (or `null` to unassign). `200:` updated ticket.
`400:` ownerId not an active IT Staff/Admin.

### PATCH /api/staff/tickets/:id/priority
Body: `{ "itPriority": "HIGH" }`. `200:` updated ticket.

### PATCH /api/staff/tickets/:id/status
Body: `{ "status": "IN_PROGRESS" }`. `200:` updated ticket.
`400:` transition not permitted by the status matrix.

### POST /api/tickets/:id/notes
Body: `{ "content": "..." }`. IT Staff/Admin only. `403` for Requester
(no content returned).

### GET /api/tickets/:id/notes
IT Staff/Admin only. `403` for Requester.

## Admin

### GET /api/admin/users
Query: `search, role`. `200: [{ id, name, email, role, isActive }]`.
`403` for non-Admin.

### POST /api/admin/users
Body: `{ name, email, role, isActive, initialPassword }`.
`201:` created user. `409:` duplicate email.

### PATCH /api/admin/users/:id
Body: `{ name?, email?, role?, isActive? }`.
`200:` updated user. `409:` duplicate email. `400:` last-active-admin or
self-deactivation violation.

### PATCH /api/admin/users/:id/password
Body: `{ newPassword }`. `200:` sets `mustChangePassword = true`.

## Status Code Summary

| Status | Meaning |
|---|---|
| 200/201 | Success / created |
| 400 | Validation failure or disallowed status transition |
| 401 | Not authenticated |
| 403 | Authenticated but forbidden for this role |
| 404 | Not found or not owned (no disclosure) |
| 409 | Duplicate email |
