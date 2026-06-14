# CruiseTravelNow

Web app for managing new cruise travel requests.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + TypeScript + Vite |
| Backend API | Python 3.12 + FastAPI |
| Auth | JWT bearer tokens + bcrypt password hashing |
| Web server | Nginx (reverse proxy) |
| Database | MySQL 8.4 |
| Containers | Docker Compose |

Python was chosen for the API because it is widely used for modern web services, pairs well with FastAPI for workflow APIs, and keeps the backend easy to extend as the cruise request workflow grows.

## Quick start

1. Copy environment defaults if needed:

```powershell
Copy-Item .env.example .env
```

2. Start the full stack:

```powershell
docker compose up --build
```

3. Open the app:

- App (via Nginx): http://localhost:8080
- Frontend dev server: http://localhost:5173
- API docs: http://localhost:8080/docs
- MySQL: localhost:3306

4. Sign in with the seeded admin account from `.env`:

- Username: `admin`
- Password: value of `SEED_ADMIN_PASSWORD` in `.env`

You can also register a new account from the Register tab. Passwords must be more than 10 characters and include at least one uppercase letter, one lowercase letter, one numeral, and one special character. Spaces are not allowed.

## Authentication

- `POST /api/auth/register` creates a new user
- `POST /api/auth/login` returns a JWT access token
- `GET /api/auth/me` returns the current signed-in user
- All `/api/requests` endpoints require authentication

## Audit tracking

Each travel request stores:

- `created_by` and `created_at` when the request is submitted
- `updated_by` and `updated_at` when the request is changed

These values are shown in the request list in the app.

## Services

- `nginx` serves the frontend and proxies `/api` to the backend
- `frontend` runs the React dev server with hot reload
- `backend` runs FastAPI with auto-reload
- `db` runs MySQL with persistent storage

## API endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/requests`
- `POST /api/requests`
- `GET /api/requests/{id}`
- `PATCH /api/requests/{id}`

## Useful commands

```powershell
docker compose up --build
docker compose down
docker compose logs -f backend
```

If you already had an older database volume before auth was added, apply the migration:

```powershell
Get-Content db\migrate_auth.sql | docker compose exec -T db mysql -uroot -prootsecret cruisetravelnow
docker compose restart backend
```

## Local credentials

Defaults are in `.env.example`. Change `JWT_SECRET`, database passwords, and the seeded admin password before deploying anywhere outside local development.
