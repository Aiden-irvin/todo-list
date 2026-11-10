# To Do List (full stack)

A multi-user to-do list: a FastAPI backend (`todo-backend/`) and a React + TypeScript web client (`todo-frontend/`).

## Summary of the assignment

Users sign in and manage their own tasks: create, read, update and delete them, reorder them, search them, and open one on a detail screen. The UI is responsive and the code is tested. There is no seeded account, so use **Create an account** on the sign-in page.

## Run on macOS

Needs Python 3.12+ and Node 20+ (the frontend pins Node 22 in `.nvmrc`).

```bash
# 1. Backend (details in todo-backend/README.md)
cd todo-backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e '.[dev]' && cp .env.example .env     # set DATABASE_URL=sqlite:///./todo.db and a SECRET_KEY of 32+ characters
alembic upgrade head && uvicorn app.main:app --reload   # http://localhost:8000/docs

# 2. Frontend, in a second terminal (details in todo-frontend/README.md)
cd todo-frontend && nvm use && npm install && npm run dev   # http://localhost:5173
```

The backend's `CORS_ORIGINS` must include the address you open the frontend at. Run the tests with `pytest` in `todo-backend` and `npm test` in `todo-frontend`. For deployment, see each project's README.

## Approach

- **Backend:** layered FastAPI app (routes, services, models, schemas), JWT bearer auth with Argon2 password hashes, every task query scoped to the signed-in user, standard HTTP status codes.
- **Frontend:** built test-first with Vitest and React Testing Library. All HTTP goes through one API client that handles the token, 204 responses and FastAPI's error formats. Search and filters run on the client, because the backend's reorder endpoint needs the full list of task IDs.
- **Quality:** tests next to the code, lint and typecheck scripts, no debug logging or TODOs.

## Features completed

- Sign in, create account, sign out, and automatic return to sign-in when the session expires.
- Task list with create (title, description, due date), complete toggle, delete with confirmation, and edit on a detail screen.
- Drag-and-drop reordering (mouse, touch, keyboard), saved immediately and rolled back if saving fails.
- Search, plus All / In progress / Completed filters with counts and an overall progress bar with percentage.
- Completed tasks are read-only until reopened.
- Modal dialogs for creating and deleting tasks, and a responsive light theme.

## Given more time

Estimates are rough.

| Improvement | Estimate |
|---|---|
| Days remaining on each task | 2 hours |
| Task priority (urgent, high, low) | 1 day |
| Workspaces | about 3.5 days |
| End-to-end tests (Playwright) against the real backend, including real drag gestures | 1 day |
| Up/down buttons as a non-drag way to reorder (accessibility) | 2 hours |
| Token refresh instead of signing in again every 30 minutes | half a day |
| Pagination and server-side search | 1 day |
| Dark mode and toast notifications | 1 day |

### Days remaining

Show how long is left on each task, next to its due date: "5 days left", "Due today", "Overdue by 2 days". Overdue tasks get a red highlight, and tasks due soon an amber one. This is calculated in the browser from the existing due date, so it needs no backend change. Completed tasks show no countdown. It would be a small pure function with unit tests, used by the task row and the detail screen.

### Task priority

Let users mark each task as **urgent**, **high** or **low**.

- **Backend:** add a `priority` column (`urgent` | `high` | `low`, default `low`) with a migration, accept it in the create and update schemas, and return it on every task.
- **Frontend:** a priority picker in the new-task modal and on the detail screen, a coloured badge on each row, and a priority filter alongside the status filters. An optional "sort by priority" view would be read-only, because manual drag order has to stay the saved order.
- **Tests first:** the picker, the badge, the filter, and backend validation of unknown values.

### Workspaces

Today every task belongs to one user. A workspace lets people group tasks into separate spaces (for example "Personal", "Work", "Team") and optionally share them.

**What users would get**
- Create, rename and delete workspaces, and switch between them from a selector in the header.
- Tasks, search, filters and progress are all scoped to the active workspace.
- Invite other users to a workspace by email, with two roles: **owner** (manages members and settings) and **member** (manages tasks).
- Move a task to another workspace.

**Backend changes** (needed first, since the frontend depends on them)
- A `workspaces` table and a `workspace_members` table linking users to workspaces with a role.
- `tasks.workspace_id` replaces `owner_id` as the scope. The "your tasks only" check becomes "you are a member of this workspace". A migration creates a "Personal" workspace for each existing user and moves their tasks into it.
- Endpoints under `/api/v1`: `GET/POST /workspaces`, `PATCH/DELETE /workspaces/{id}`, `POST/DELETE /workspaces/{id}/members`, and the task routes under `/workspaces/{id}/tasks`.
- Reordering becomes per workspace, so a shared workspace has one agreed order.

**Frontend changes**
- A workspace switcher in the header, with the active workspace in the URL (`/w/:workspaceId/tasks`) so links can be shared.
- A "New workspace" modal and a members screen with an invite form, built from the existing modal component.
- Every task call in the API client takes a workspace ID.
- Tests first: the switcher, creating a workspace, inviting a member, and a not-found or forbidden state for a workspace you don't belong to.

**Open questions**
- Should invites work for people without an account yet (this needs email sending), or only for existing users?
- Should deleting a workspace delete its tasks, or require moving them first?
- Live updates when two people edit the same workspace are out of scope. They would need WebSockets or polling.

## Making it more robust

- CI running lint, typecheck and tests with coverage thresholds.
- Keep the token in an HttpOnly cookie instead of `localStorage`, and enforce "completed tasks are read-only" in the backend too. Today only the UI enforces it.
- Rate limiting and structured logging on the backend, and PostgreSQL integration tests.
- An error boundary and request timeouts in the frontend.
- Contract tests against the real API so the mocked frontend tests cannot drift from it.
