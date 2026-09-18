const { get, all } = require('../../database/db');
const { getTimeSlots } = require('../utils/timeSlots');

// Toate cifrele din dashboard se raporteaza la rezervarile cu status = 'active'
// (cele anulate nu reflecta activitate reala a restaurantului).
function getAnalytics() {
  const total = get(`SELECT COUNT(*) AS n FROM reservations WHERE status = 'active'`).n;

  const byZone = all(`
    SELECT z.slug, z.name, COUNT(r.id) AS count
    FROM zones z
    LEFT JOIN reservations r ON r.zone_id = z.id AND r.status = 'active'
    GROUP BY z.id
    ORDER BY z.id
  `);

  const grouped = all(`
    SELECT reservation_time AS time, COUNT(*) AS count
    FROM reservations
    WHERE status = 'active'
    GROUP BY reservation_time
  `);
  const countByTime = new Map(grouped.map((row) => [row.time, row.count]));
  const peakHours = getTimeSlots().map((time) => ({ time, count: countByTime.get(time) || 0 }));

  return { total, byZone, peakHours };
}

module.exports = { getAnalytics };
