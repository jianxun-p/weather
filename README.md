# Weather App (React + Express + SQLite)

Full-stack weather application with:
- location search and reverse geocoding
- live weather + 5-day forecast (Open-Meteo)
- session-based authentication
- per-user saved weather history

## Project Structure

- `Client/`: Vite + React frontend
- `Server/`: Express API + SQLite persistence

## Requirements

- Node.js 24+
- npm
- Docker (optional)

## Run with Docker (Recommended)

1. Build the image

```bash
docker build -t weather-app:latest .
```

2. Start a container

Start a new terminal and run:

```bash
echo 'EXPORT_PASSWORD=CHANGE_ME' > Server/.env
docker run -p 4000:4000 --env-file Server/.env -v weather-data:/app/Server/data weather-app:latest
```

## Run locally

Run frontend and backend in separate terminals.

1. Start the server

Start a new terminal and run:

```bash
cd Server
npm install
npm run dev
```

Server runs on `http://localhost:4000`.

2. Build the client

Start a new terminal and run:

```bash
cd Client
npm install
npm run build
```

3. Visit the Website

Then open `http://localhost:4000`.

## Authentication Behavior

- `POST /login`:
  - if username does not exist: server registers user and returns `201` with message asking to login again
  - if username exists and password matches: returns authenticated user payload
- Session is stored with `express-session` cookie (`httpOnly`, `sameSite: strict`, `secure` for production).
- Most history operations require authentication.

## Export Authentication

- `POST /export` requires a normal logged-in session.
- `POST /export/admin` requires header `Authorization: Bearer <EXPORT_PASSWORD>`.
- Set `EXPORT_PASSWORD` in your environment before using admin export.

## API Endpoints

### Auth

- `GET /userinfo`
  - returns current session user info, or `401` if not logged in

- `POST /login`

Request:
```json
{
  "username": "alice",
  "password": "secret"
}
```

Success (existing user):
```json
{
  "ok": true,
  "user": {
    "id": 1,
    "username": "alice"
  }
}
```

Registration path (new user):
```json
{
  "ok": true,
  "message": "User successfully registered. Please log in again."
}
```

- `POST /logout`
  - destroys session and returns `{ "ok": true }`

### Weather

- `POST /weather`

Request:
```json
{
  "name": "Berlin, Germany",
  "latitude": 52.52,
  "longitude": 13.405,
  "pastDays": 0,
  "forecastDays": 5
}
```

Behavior:
- returns Open-Meteo weather payload (wrapped with `ok: true`)
- if logged in, stores the request + weather snapshot into history
- if anonymous, returns weather without persistence

Validation:
- `latitude`: number in `[-90, 90]`
- `longitude`: number in `[-180, 180]`
- `pastDays`: integer `0..60`
- `forecastDays`: integer `1..14`
- optional `date` must be a non-negative integer epoch milliseconds within allowed range

### History

- `GET /history`
  - returns current user's saved weather entries

- `DELETE /history`
  - clears all history for current user

- `GET /history/:id`
  - fetches one history item by id

- `PUT /history/:id`
  - updates history item name/notes

Request body:
```json
{
  "name": "Berlin, Germany",
  "notes": "Trip planning"
}
```

- `DELETE /history/:id`
  - deletes one saved history item (owned by current session user)

### Export

- `POST /export`
  - exports current user's history as CSV data URL
  - requires logged-in session
  - stores export metadata in `exports` table

- `POST /export/admin`
  - exports all users' history as CSV data URL
  - requires `Authorization: Bearer <EXPORT_PASSWORD>`
  - stores export metadata in `exports` table (system user)

Successful response shape:

```json
{
  "ok": true,
  "export": {
    "url": "data:text/csv;base64,..."
  }
}
```

## Data Storage

- SQLite file: `Server/data/weather.db`
- Schema file: `Server/sql/init.sql`
- Tables:
  - `users`
  - `history`
  - `exports`

## Notes

- Weather data provider: Open-Meteo API
- Geocoding provider (frontend): OpenStreetMap Nominatim
