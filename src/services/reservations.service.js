const { get, all, run, transaction } = require('../../database/db');
const { getZoneBySlug } = require('./availability.service');
const { generateCode } = require('../utils/generateCode');
const { httpError } = require('../utils/httpError');
const { sendConfirmationEmail } = require('../utils/mailer');

const SLOT_TAKEN_MESSAGE =
  'Ne pare rău, cineva tocmai a rezervat acest interval. Te rugăm să alegi altul.';

const SELECT_WITH_ZONE = `
  SELECT r.*, z.slug AS zone_slug, z.name AS zone_name
  FROM reservations r
  JOIN zones z ON z.id = r.zone_id
`;

function formatReservation(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.customer_name,
    email: row.email,
    partySize: row.party_size,
    date: row.reservation_date,
    time: row.reservation_time,
    zoneSlug: row.zone_slug,
    zoneName: row.zone_name,
    status: row.status,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
  };
}

function pickUnusedCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    if (!get('SELECT 1 FROM reservations WHERE code = ?', code)) return code;
  }
  return generateCode();
}

function createReservation(data) {
  const zone = getZoneBySlug(data.zoneSlug);
  if (!zone) throw httpError(400, 'Zona selectată nu există.');

  const name = data.name.trim();
  const email = data.email.trim();

  const result = transaction(() => {
    const existing = get(
      `SELECT id FROM reservations
       WHERE zone_id = ? AND reservation_date = ? AND reservation_time = ? AND status = 'active'`,
      zone.id,
      data.date,
      data.time
    );
    if (existing) throw httpError(409, SLOT_TAKEN_MESSAGE);

    const code = pickUnusedCode();
    try {
      const info = run(
        `INSERT INTO reservations
         (code, customer_name, email, party_size, reservation_date, reservation_time, zone_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        code,
        name,
        email,
        Number(data.partySize),
        data.date,
        data.time,
        zone.id
      );
      return { id: Number(info.lastInsertRowid), code };
    } catch (err) {
      // Indexul uq_active_slot a respins inserarea: slotul e deja ocupat.
      if (/UNIQUE/i.test(err.message)) throw httpError(409, SLOT_TAKEN_MESSAGE);
      throw err;
    }
  });

  // Dupa COMMIT: trimitem confirmarea pe e-mail fara sa blocam raspunsul.
  sendConfirmationEmail({
    code: result.code,
    name,
    email,
    date: data.date,
    time: data.time,
    zoneName: zone.name,
    partySize: Number(data.partySize),
  }).catch((err) => console.error('Trimiterea e-mailului de confirmare a esuat:', err.message));

  return result;
}

function findByCode(code) {
  const row = get(`${SELECT_WITH_ZONE} WHERE r.code = ?`, code);
  return row ? formatReservation(row) : null;
}

function cancelByCode(code) {
  const reservation = get('SELECT * FROM reservations WHERE code = ?', code);
  if (!reservation) throw httpError(404, 'Nu am găsit nicio rezervare cu acest cod.');
  if (reservation.status === 'cancelled') throw httpError(409, 'Această rezervare este deja anulată.');

  run(
    `UPDATE reservations SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?`,
    reservation.id
  );
  return { message: 'Rezervarea a fost anulată. Intervalul este acum disponibil.' };
}

function cancelById(id) {
  const reservation = get('SELECT * FROM reservations WHERE id = ?', id);
  if (!reservation) throw httpError(404, 'Rezervarea nu există.');
  if (reservation.status === 'cancelled') throw httpError(409, 'Rezervarea este deja anulată.');

  run(
    `UPDATE reservations SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?`,
    id
  );
  return { message: 'Rezervarea a fost anulată.' };
}

function listReservations(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.date) {
    conditions.push('r.reservation_date = ?');
    params.push(filters.date);
  }
  if (filters.zoneSlug) {
    conditions.push('z.slug = ?');
    params.push(filters.zoneSlug);
  }
  if (filters.status) {
    conditions.push('r.status = ?');
    params.push(filters.status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = all(
    `${SELECT_WITH_ZONE} ${where}
     ORDER BY r.reservation_date DESC, r.reservation_time DESC, r.id DESC`,
    ...params
  );
  return rows.map(formatReservation);
}

module.exports = {
  createReservation,
  findByCode,
  cancelByCode,
  cancelById,
  listReservations,
};
