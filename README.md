# Maison du Rivage: restaurant reservation system

Web application for managing table reservations in a restaurant, built as my bachelor's thesis project.

The user interface and the confirmation emails are in Romanian, since the application was written around a Romanian restaurant scenario. Code identifiers and documentation are in English.

## Stack

- **Backend:** Node.js + Express
- **Database:** SQLite, through Node's built-in `node:sqlite` module
- **Frontend:** HTML, CSS and vanilla JavaScript, no framework

## Requirements

- Node.js 22.5 or newer, for the `node:sqlite` module

## Running it

```bash
npm install
cp .env.example .env    # then fill in ADMIN_USER and ADMIN_PASSWORD
npm run seed
npm start
```

The server listens on `http://localhost:3000`. For development with auto restart: `npm run dev`.

## Project layout

```
.
├── server.js               # Express setup and server startup
├── database/
│   ├── db.js               # SQLite connection + get / all / run / transaction helpers
│   ├── schema.sql          # table and index definitions
│   └── seed.js             # applies the schema and inserts the zones
├── src/
│   ├── routes/             # HTTP routes, grouped per resource
│   ├── services/           # business logic and SQL queries
│   ├── middleware/         # admin authentication and error handling
│   └── utils/              # time slots, validation, code generation, HTTP errors
├── test/
│   └── concurrency.js      # simultaneous requests against the same slot
└── public/                 # statically served frontend
    ├── index.html          # reservation page
    ├── cancel.html         # cancellation by code
    ├── admin.html          # admin dashboard
    ├── css/styles.css
    └── js/
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/zones` | List of bookable zones |
| GET | `/api/availability?zone=&date=` | Free and taken time slots for one day and zone |
| POST | `/api/reservations` | Create a reservation, rejecting overlaps |
| GET | `/api/reservations/:code` | Look up a reservation by its code |
| POST | `/api/reservations/cancel` | Cancel a reservation by its code |
| GET | `/api/admin/analytics` | (admin) Totals, distribution per zone, peak hours |
| GET | `/api/admin/reservations` | (admin) Filterable reservation list |
| PATCH | `/api/admin/reservations/:id/cancel` | (admin) Cancel a reservation |

## Preventing double bookings

This was the main problem of the project. A slot is the combination of **zone + date + time**, and it accepts exactly one active reservation.

Checking availability and then inserting is not safe on its own: two requests can both read "free" before either one writes. The guarantee is built in two layers.

1. **Transaction.** The insert runs inside `BEGIN IMMEDIATE`, which takes the write lock at the start of the transaction rather than at the first write. The re-check of the slot and the `INSERT` are therefore atomic with respect to other writers.

2. **Partial unique index.** The database enforces the rule independently:

   ```sql
   CREATE UNIQUE INDEX uq_active_slot
     ON reservations (zone_id, reservation_date, reservation_time)
     WHERE status = 'active';
   ```

   The index is partial: it only covers rows with `status = 'active'`, so a cancelled reservation stops occupying the slot and the same slot can be booked again without deleting any history. If two requests somehow both pass the in-transaction check, the second one gets a `UNIQUE` violation from SQLite, which is caught and translated into a `409` response.

3. **Response.** A caller that loses the race receives `409` with a readable message, and the interface marks the slot as unavailable.

### Verifying it

With the server running, in a second terminal:

```bash
node test/concurrency.js
```

The script fires 25 simultaneous requests at the same slot and asserts that exactly one is accepted (`201`) while the other 24 are rejected (`409`). It picks a random future date on each run, so it can be repeated without clearing the database.

## Reporting

The admin dashboard shows total active reservations, distribution per zone, and reservations per hour, drawn with Chart.js. The aggregation happens in SQL.

Two details in `src/services/analytics.service.js` are worth pointing out:

- The per zone query uses `LEFT JOIN` with `status = 'active'` placed in the `ON` clause rather than in `WHERE`. In `WHERE`, the filter would run after the join and drop zones with no active reservations entirely, instead of showing them with a count of zero.
- `GROUP BY reservation_time` only returns hours that actually appear in the table. The hours with no reservations are filled in afterwards in JavaScript, from the full list of opening slots, so the bar chart shows the whole schedule rather than only the busy hours.

## Configuration

Values are copied from `.env.example` into `.env`, which is not committed.

| Variable | Purpose |
|----------|---------|
| `PORT` | Express server port |
| `DB_PATH` | path to the SQLite file |
| `ADMIN_USER`, `ADMIN_PASSWORD` | credentials for the admin area |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | mail server for confirmation emails |

If the SMTP variables are missing, the application still works normally and simply does not send confirmation emails. The email is sent after the transaction commits, never before, so a rolled back transaction cannot produce a confirmation for a reservation that does not exist. A failure to send is logged and does not invalidate the reservation.

## Security notes

- The `/api/admin/*` routes and `admin.html` are protected with HTTP Basic authentication. Credentials are read only from `.env`. There is no default value in the source code: if `ADMIN_USER` or `ADMIN_PASSWORD` are missing, the admin area returns `503` and stays closed, rather than falling back to a password that would be public along with the code.
- Credentials are compared as SHA-256 digests through `crypto.timingSafeEqual`, so the response time does not reveal how much of the password was correct, and the buffers always have equal length.
- HTTP Basic encodes credentials in base64, it does not encrypt them. A real deployment would have to be served over HTTPS, and supporting multiple administrators would mean replacing this with sessions and hashed passwords stored in the database.
- Input is validated on the server in `src/utils/validators.js`, not only in the browser, and every query uses prepared statements with `?` parameters rather than string concatenation.

## Known limitations

- Confirmation emails are sent inline with the request and are not retried on failure. A production version would hand them to a queue with backoff.
- The schedule is fixed at hourly slots between 12:00 and 21:00, defined in `src/utils/timeSlots.js`, and there is no per zone table count. Each zone accepts one reservation per slot.
