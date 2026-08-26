# Lab 1 — Test Summary

Test files location: `tests/lab-01/`

| Test File | Tool | Test Description |
|---|---|---|
| API-01 | Supertest | Health endpoint returns 200 and expected JSON |
| API-02 | Supertest | Categories endpoint returns the four seeded categories |
| UI-01 | Vitest | TokTickIT heading renders |
| UI-02 | Vitest | Loading state changes to category list |
| UI-03 | Vitest | API failure displays a useful error message |

## How to run

\`\`\`bash
cd server && npm test
cd client && npm test
\`\`\`

## Result

All 5 tests pass on branch `main` (2 backend + 3 frontend).