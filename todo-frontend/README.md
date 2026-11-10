# Todo Frontend

React 19 + TypeScript (Vite) client for the FastAPI backend in `../todo-backend`.

## Summary of the assignment

A full-stack to-do list: users sign in and manage their own tasks (create, read, update, delete), reorder them, search them, and open a task on a detail screen. The UI must be responsive and the code tested. The REST backend (FastAPI, JWT auth, SQLite/PostgreSQL) lives in `../todo-backend`; this project is the web client. There is no seeded account: use **Create an account** on the sign-in page.

## Run on macOS

Requires Node 20+ (`.nvmrc` pins 22: `nvm use`).

```bash
# 1. Backend (see ../todo-backend/README.md for details)
cd todo-backend && source .venv/bin/activate && alembic upgrade head && uvicorn app.main:app --reload

# 2. Frontend, in another terminal
cd todo-frontend && npm install && npm run dev      # http://localhost:5173
```

The API URL defaults to `http://localhost:8000/api/v1`; override with `VITE_API_URL` (see `.env.example`). The backend's `CORS_ORIGINS` must include the frontend origin.

| Script | Purpose |
|---|---|
| `npm test` / `npm run test:watch` | Vitest + Testing Library |
| `npm run coverage` | Tests with coverage report |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm run build` | Typecheck + production bundle in `dist/` |

## Deploying to a distributed cloud

1. Build with the deployed API's URL: `VITE_API_URL=https://api.example.com/api/v1 npm run build`. This emits static files in `dist/`.
2. Upload `dist/` to S3 and serve it through CloudFront (or Netlify, Vercel, Cloudflare Pages), with a 404/403 fallback to `/index.html` so client-side routes work.
3. Serve over HTTPS, and add the site's origin to the backend's `CORS_ORIGINS`. Backend deployment is covered in `../todo-backend/README.md`.

## Project structure

```
src/
  components/   reusable UI: Modal, ConfirmDialog, NewTaskDialog, TaskRow, FilterBar, icons
  pages/        route screens: SignInPage, TasksPage, TaskDetailPage
  context/      auth state (AuthProvider, useAuth)
  services/     api.ts, the only code that talks HTTP
  utils/        pure helpers: dates, filters
  test/         test setup and shared helpers
```

Tests live next to the code they cover (`*.test.ts(x)`).

## Approach

- Built test-first with Vitest and React Testing Library: tests drive the UI through accessible roles/labels, mocking only the `api` module (plus one real-`fetch` test for session expiry).
- `services/api.ts` is the only code that talks HTTP: bearer token handling, 204 responses, and normalising FastAPI's string/array `detail` errors. A 401 on an authenticated call clears the token and sends the user to sign-in.
- Search is client-side over the full list. This is deliberate: the backend's `PUT /tasks/reorder` requires every task ID, so a server-filtered list could not be reordered safely. Filters (All / In progress / Completed) work the same way, and reordering is disabled while a search or filter is active.
- Reordering is optimistic with rollback on failure; the drop handler is tested by invoking `onDragEnd` directly, since jsdom has no layout for real drag gestures.
- No state or data-fetching library; React state and small helpers cover this scope.

## Features

Sign in / create account, task list, create (title, description, due date), complete toggle, per-row edit, delete, search, All / In progress / Completed filters with counts, an overall progress bar with percentage, read-only completed tasks (reopen to edit), drag-and-drop reorder (mouse, touch, keyboard via `@dnd-kit`), task detail screen (edit title, description, due date, completed; delete; not-found state), modal dialogs (new task, delete confirmation) on the native `<dialog>` element, a light teal theme with SVG icons, responsive layout, session-expiry handling.

## Given more time

| Item | Estimate |
|---|---|
| Playwright end-to-end suite against the real backend, including real drag gestures | 1 day |
| Move/up-down buttons as a non-drag alternative for reordering (accessibility) | 2 hours |
| TanStack Query for caching, retries and background refresh | half a day |
| Token refresh instead of re-login every 30 minutes (needs backend work) | half a day |
| Pagination and server-side search (needs backend changes to reorder) | 1 day |
| Dark mode, due-date filters, toast notifications | 1 day |

## Making it more robust

- CI running lint, typecheck and tests with coverage thresholds (about 2 hours).
- Keep the token in an HttpOnly cookie rather than `localStorage`, and enforce "completed tasks are read-only" in the backend as well as the UI (the UI rule can be bypassed by calling the API directly).
- An error boundary, request timeouts, and a timezone-aware due-date picker.
- Contract tests against the real API so mocked tests cannot drift from it.

## Known limits

- Due dates are stored as UTC midnight.
- Tests mock the API; the contract was verified manually against the running backend, not in CI.
