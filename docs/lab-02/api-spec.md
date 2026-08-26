# Lab 2 API Contract

All routes are prefixed `/api`, JSON except the download endpoint. Every
Ticket/Attachment route requires header `X-Requester-Id: <id>` — a testing
identifier, not a credential. Missing/invalid/inactive id → `401`.

## GET /api/requesters
Active Requesters, ordered by name. No header required.
`200: [{ "id": 1, "name": "Jennifer Anderson", "email": "..." }]`
`500: { "error": "Unable to load requesters" }`

## GET /api/categories
Reused from Lab 1. `200: [{ "id": 1, "name": "Hardware" }]`

## GET /api/related-systems
Active systems, ordered by name. `200: [{ "id": 1, "name": "VPN" }]`
`500: { "error": "Unable to load related systems" }`

## POST /api/tickets
Body: `{ "categoryId": 2, "relatedSystemId": 7, "summary": "...",
"description": "...", "requestedPriority": "MEDIUM" }`

`201:` full Ticket including `ticketNumber` (e.g. `"TKT-2026-000042"`) and
`currentStatus: "NEW"`.
`400: { "error": "Validation failed", "fields": { "summary": "..." } }`
`404:` invalid `categoryId`/`relatedSystemId`. `401:` bad header.

## GET /api/tickets
Query params:

| Param | Values | Default |
|---|---|---|
| `search` | text (matches Ticket No. or Summary) | — |
| `categoryId`, `requestedPriority`, `currentStatus` | filters | — |
| `sort` | `createdAt`\|`updatedAt` | `createdAt` |
| `order` | `asc`\|`desc` | `desc` |
| `page` | ≥1 | 1 |
| `pageSize` | `10`\|`25`\|`50` | 10 |

`200: { "data": [...], "pagination": { "page", "pageSize", "totalItems",
"totalPages" } }`. Only the current Requester's own tickets.
`400:` invalid query param. `401:` bad header.

## GET /api/tickets/:id
`200:` full Ticket + `attachments: [{ id, originalFileName, sizeBytes,
mimeType, uploadedAt, isRemoved, removedAt?, removalReason? }]`.
`404:` not found or not owned (identical message either way). `401:` bad
header.

## POST /api/tickets/:id/attachments
`multipart/form-data`, field `file` (JPG/JPEG/PNG/WEBP/PDF, ≤5 MB).
`201:` attachment metadata.
`400: Unsupported file type` · `413: File exceeds 5 MB limit` ·
`409: Maximum of 5 active attachments reached` · `404:` not owned ·
`401:` bad header.

## GET /api/attachments/:id/download
`200:` binary stream, `Content-Disposition: attachment`.
`404:` not found/not owned. `410: This attachment has been removed`.
`401:` bad header.

## DELETE /api/attachments/:id
Body: `{ "reason": "..." }` (≥3 chars).
`200: { id, isRemoved: true, removedAt, removalReason }`.
`400:` reason missing/too short. `404:` not owned. `409: Attachment already
removed`. `401:` bad header.

## Status Code Summary

| Status | Meaning |
|---|---|
| 200/201 | Success / created |
| 400 | Validation or invalid query param |
| 401 | Missing/invalid `X-Requester-Id` |
| 404 | Not found or not owned (no disclosure of which) |
| 409 | Attachment limit reached / already removed |
| 410 | Removed attachment (download only) |
| 413 | File over 5 MB |
| 500 | Unexpected error, generic message |
