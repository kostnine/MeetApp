# MeetLink API

Local NestJS backend for the MeetLink MVP.

## What is included

- Supabase PostgreSQL connection through `DATABASE_URL`
- PostGIS-ready migration for nearby users
- Public profile endpoint
- Public reservation endpoint
- Public contact request endpoint
- Simple chat endpoints
- Admin login with a short-lived JWT session
- Admin-protected reservation, contact, and message lists
- Likes endpoint
- Basic WebSocket online counter

## Setup

1. Copy `.env.example` to `.env`.
2. Use the Supabase Session pooler connection string for local development.
3. Leave `placeholder` inside `DATABASE_URL`.
4. Put your Supabase database password into `DATABASE_PASSWORD`.
5. Set `ADMIN_PASSWORD` and `ADMIN_JWT_SECRET` for the local admin login.
6. In Supabase SQL Editor, run `migrations/001_init.sql`.
7. Run `migrations/002_messages.sql` for chat tables.
7. Install and start:

```bash
npm install
npm run dev
```

The API runs on `http://127.0.0.1:4000`.

On Windows you can create `.env` without editing it by hand:

```powershell
.\scripts\setup-env.ps1
```

## Useful endpoints

```txt
GET  /health
POST /auth/login
GET  /auth/me                  Authorization: Bearer your JWT
GET  /profiles/kirov
POST /reservations
GET  /reservations              Authorization: Bearer your JWT
POST /contacts
GET  /contacts                  Authorization: Bearer your JWT
POST /messages/conversations
GET  /messages/conversations    Authorization: Bearer your JWT
GET  /messages/conversations/:id Authorization: Bearer your JWT
POST /messages/conversations/:id/messages Authorization: Bearer your JWT
POST /nearby/location
GET  /nearby?lat=54.6872&lng=25.2797&radius=500
POST /likes
GET  /likes/kirov
```

For local development, `x-admin-token` still works as a fallback, but the frontend now uses `/auth/login`.

## Reservation body example

```json
{
  "ownerNickname": "kirov",
  "guestNickname": "Guest_4821",
  "contact": "@guest",
  "comment": "Better to write in the evening",
  "meetingDate": "2026-06-05",
  "meetingTime": "19:30",
  "place": "Old Town"
}
```

## Supabase note

If Supabase says `relation "profiles" already exists`, the first table was already created.
Use this repo migration because it uses `if not exists` and can be run again safely.

For free Supabase projects, the direct database host can resolve to IPv6 only.
If your local network does not work with that, use Session pooler:

```env
DATABASE_URL=postgresql://postgres.wyaaujkkqmewfzpqognk:placeholder@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require
DATABASE_PASSWORD=YOUR-DATABASE-PASSWORD
```
