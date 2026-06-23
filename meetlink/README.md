# MeetLink Frontend

Vue 3 + Vite frontend for the MeetLink MVP.

## Setup

```bash
npm install
npm run dev
```

The app runs on `http://127.0.0.1:5173`.

## API connection

The frontend uses the local backend by default:

```env
VITE_API_URL=http://127.0.0.1:4000
```

Copy `.env.example` to `.env` only if you need to change these values.
Admin access is now handled through the `/login` page. The browser stores the JWT returned by the backend in local storage.

Current MVP flows:

- profile loads from `GET /profiles/kostnine`
- request link creation works locally in Pinia and saves to browser local storage
- public request page is available at `/r/:code`
- accepting a request creates a local chat and exposes the contact
- declining a request stores only the declined status
- nearby map/list use "Написать" as the primary action
- contact form saves through `POST /contacts`
- chat starts through `POST /messages/conversations`
- chat replies save through `POST /messages/conversations/:id/messages`
- admin login uses `POST /auth/login`
- request responses are shown in the "Ответы" tab
- legacy reservations still load through `GET /reservations` after login
- contacts load through `GET /contacts` after login
- message dialogs load through `GET /messages/conversations` after login

Next backend step: add database tables/endpoints for request links and request responses so `/r/:code` works across devices.
