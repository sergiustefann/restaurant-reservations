PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS zones (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS reservations (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  code             TEXT NOT NULL UNIQUE,
  customer_name    TEXT NOT NULL,
  email            TEXT NOT NULL,
  party_size       INTEGER NOT NULL CHECK (party_size BETWEEN 1 AND 20),
  reservation_date TEXT NOT NULL,
  reservation_time TEXT NOT NULL,
  zone_id          INTEGER NOT NULL REFERENCES zones(id),
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  cancelled_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_reservations_slot
  ON reservations (zone_id, reservation_date, reservation_time, status);

-- O singură rezervare activă per (zonă, dată, oră); indexul parțial ignoră
-- rezervările anulate, deci slotul se eliberează automat după anulare.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_slot
  ON reservations (zone_id, reservation_date, reservation_time)
  WHERE status = 'active';
