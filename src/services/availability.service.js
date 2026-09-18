const { all, get } = require('../../database/db');
const { getTimeSlots } = require('../utils/timeSlots');

function getZoneBySlug(slug) {
  return get('SELECT id, slug, name, description FROM zones WHERE slug = ?', slug);
}

function listZones() {
  return all('SELECT id, slug, name, description FROM zones ORDER BY id');
}

function getAvailability(slug, date) {
  const zone = getZoneBySlug(slug);
  if (!zone) return null;

  const takenRows = all(
    `SELECT reservation_time FROM reservations
     WHERE zone_id = ? AND reservation_date = ? AND status = 'active'`,
    zone.id,
    date
  );
  const taken = new Set(takenRows.map((row) => row.reservation_time));

  const slots = getTimeSlots().map((time) => ({ time, available: !taken.has(time) }));
  return { date, zone, slots };
}

module.exports = { getZoneBySlug, listZones, getAvailability };
