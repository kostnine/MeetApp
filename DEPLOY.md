# Deploying meetlink

The whole app ships as **one service**: the NestJS backend serves the API (`/api`),
the websockets (`/socket.io`) **and** the built Vue SPA from a single origin. That
sidesteps CORS entirely and means one URL, one deploy.

The database is **Supabase (already cloud-hosted)** and the migrations are already
applied — there is no separate DB to provision or migrate for a normal deploy.

---

## Environment variables

Set these on your host (do **not** commit them — `.env` is gitignored):

| Variable            | Required | What it is                                                                 |
| ------------------- | -------- | -------------------------------------------------------------------------- |
| `DATABASE_URL`      | ✅       | Supabase connection string (the pooler URL).                               |
| `DATABASE_PASSWORD` | if not embedded in the URL | DB password.                                              |
| `ADMIN_JWT_SECRET`  | ✅       | Long random string used to sign auth tokens. **Generate a fresh one.**     |
| `ADMIN_PASSWORD`    | ✅       | Password for the owner / "Continue as guest" login (see note below).       |
| `ADMIN_TOKEN`       | optional | Static admin bearer token (fallback). Can be any random string.            |
| `ADMIN_NICKNAME`    | optional | Owner nickname. Defaults to `kostnine`.                                     |
| `ALLOWED_ORIGIN`    | optional | Your deploy URL, e.g. `https://meetlink.onrender.com`. Not required for single-origin, but safe to set. |
| `PORT`              | auto     | Injected by the host; the app reads it (falls back to 4000).               |

> **Guest-login note:** the "Continue as guest" button logs in as the **owner (admin)**
> using a password baked into the frontend at build time (`VITE_ADMIN_PASSWORD`,
> default `kostnine-admin`). It must equal the backend's `ADMIN_PASSWORD`.
> - For a quick demo: leave both at the default.
> - For a locked-down deploy: build with `--build-arg VITE_ADMIN_PASSWORD=<secret>`
>   and set `ADMIN_PASSWORD=<same secret>`. Real visitors should register their own
>   accounts; guest = full owner access.

---

## Test the production image locally (optional but recommended)

From this `outputs/` directory:

```bash
docker build -t meetlink .
docker run --rm -p 4000:4000 --env-file meetlink-api/.env meetlink
# open http://localhost:4000
```

---

## Deploy

The `Dockerfile` here works on any Docker host. Pick one:

### Render (easiest free path)
1. Push the repo to GitHub.
2. Render → **New → Web Service** → connect the repo.
3. **Runtime: Docker**, **Root Directory: `outputs`** (so it finds this Dockerfile).
4. Add the environment variables from the table above.
5. Create the service. Render builds the image and gives you a URL.
6. (Optional) set `ALLOWED_ORIGIN` to that URL and redeploy.

> Free instances sleep after inactivity and cold-start on the next request.

### Fly.io (no GitHub needed — deploys from your machine)
```bash
cd outputs
fly launch            # detects the Dockerfile; say no to a DB (we use Supabase)
fly secrets set DATABASE_URL=... DATABASE_PASSWORD=... ADMIN_JWT_SECRET=... ADMIN_PASSWORD=...
fly deploy
```

### Railway
1. New project → **Deploy from GitHub repo** (or `railway up` from `outputs/`).
2. Set the service **Root Directory** to `outputs` (Docker build).
3. Add the environment variables. Railway assigns a URL.

---

## If you ever deploy against a fresh database
Run each migration once (they're idempotent):
```bash
cd meetlink-api
node scripts/run-migration.mjs migrations/001_*.sql   # …through the latest
```
