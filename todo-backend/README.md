# Todo API

A typed, modular FastAPI backend for a multi-user to-do application. The API supports account registration/login, private task CRUD, search/filtering, and explicit task ordering.

## Requirements

- Python 3.12+
- PostgreSQL 16+ for a shared deployment (SQLite is supported for local development/tests)

## Run locally on macOS

```bash
cd todo-backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -e '.[dev]'
cp .env.example .env
```

For a quick local run, change `DATABASE_URL` in `.env` to `sqlite:///./todo.db`. Replace `SECRET_KEY` with a random value of at least 32 characters. Then:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

Open `http://localhost:8000/docs` for interactive OpenAPI documentation and `http://localhost:8000/health` for the health check. Apply the schema with `alembic upgrade head` before starting the API. Alembic migrations are used in all environments.

## Run with Docker Compose

Set a strong secret and start the PostgreSQL-backed service:

```bash
export SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
docker compose up --build
```

The API is available at `http://localhost:8000`. The container applies migrations (`alembic upgrade head`) on start, runs as a non-root user, and reports health through `/health`. Before deploying publicly, use managed PostgreSQL, a secret manager, TLS termination, restricted CORS origins, backups, and a migration job. Do not use the sample database credentials in a public deployment.

## API overview

All application routes are prefixed with `/api/v1`.

| Method | Endpoint | Authentication | Purpose |
|---|---|---:|---|
| POST | `/auth/register` | No | Create account and return access token |
| POST | `/auth/login` | No | Authenticate and return access token |
| GET | `/auth/me` | Yes | Get current user |
| GET | `/tasks` | Yes | List tasks; optional `search`, `completed`, `limit` (1-500) and `offset` |
| POST | `/tasks` | Yes | Create task |
| GET | `/tasks/{task_id}` | Yes | Read task |
| PATCH | `/tasks/{task_id}` | Yes | Update task fields |
| DELETE | `/tasks/{task_id}` | Yes | Delete task |
| PUT | `/tasks/reorder` | Yes | Set full ordered list of the user's task IDs |

`CORS_ORIGINS` accepts a comma-separated list (`http://localhost:5173,https://app.example.com`) or a JSON array.

Send `Authorization: Bearer <access_token>` on protected routes. Task endpoints scope every read/write by the authenticated owner; a task belonging to another account returns 404.

### Example task payload

```json
{
  "title": "Prepare project demo",
  "description": "Review API and frontend flow",
  "due_date": null
}
```

### Status codes

`200`/`201`/`204` for success, `400` for invalid input (the response `detail` is a list of field errors, or a message for business rules such as a bad reorder list), `401` for missing, invalid or expired tokens and wrong credentials, `404` for a missing task or one owned by another user (so task existence is not revealed), and `409` for a duplicate email. `PATCH` requires at least one field. Search matches the task title case-insensitively and treats `%` and `_` literally.

### Reordering

`PUT /api/v1/tasks/reorder` accepts `{ "task_ids": [3, 1, 2] }`. The list must contain every task owned by the current user exactly once. This prevents accidentally omitting or moving another user's tasks.

## Quality checks

```bash
pytest --cov=app --cov-report=term-missing --cov-fail-under=90
ruff check .
ruff format --check .
mypy app
```

`pytest-cov` is part of the `dev` extras (`pip install -e '.[dev]'`).

## Implementation summary

- Modular API, schema, service, model, and database layers.
- Passwords hashed with Argon2; short-lived signed JWT bearer tokens.
- Pydantic request validation and standard HTTP status codes.
- Ownership enforced in database queries for every task operation.
- Search, completion filtering, and deterministic ordering.
- Automated tests for auth (including expired, malformed and foreign tokens), CRUD, privacy boundaries, search escaping, pagination, reorder validation, and settings validation.
- Production startup refuses placeholder secrets, including the one in `.env.example`.
- Unknown emails cost the same hashing time as wrong passwords, so login timing does not reveal registered emails.
- Position changes take a per-user row lock on PostgreSQL, so concurrent creates cannot share a position.

## Known limits

- Reordering requires the full list of task IDs; for a very large list, `limit`/`offset` paging cannot be combined with reordering.
- Tokens expire after 30 minutes with no refresh flow.

## Next improvements

For a hardened public deployment: refresh-token rotation/revocation, rate limiting on login and register, structured request logging and tracing, database connection/pool tuning, CI coverage thresholds, and integration tests against PostgreSQL. Add password reset and email verification if the product requires account recovery. Estimate: 1-2 additional engineering days for the operational hardening baseline, plus provider integration time for email workflows.
