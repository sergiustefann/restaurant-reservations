require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { db } = require('./db');

const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schemaSql);
console.log('Schema a fost aplicata.');

const zones = [
  { slug: 'sea-side', name: 'Sea Side view', description: 'Mese lângă fereastră, cu vedere la mare.' },
  { slug: 'lounge', name: 'Lounge', description: 'Zona centrală, atmosferă relaxată și confortabilă.' },
  { slug: 'bar', name: 'Bar', description: 'Locuri la bar, ideale pentru grupuri mici.' },
];

const insertZone = db.prepare(
  'INSERT OR IGNORE INTO zones (slug, name, description) VALUES (?, ?, ?)'
);

for (const zone of zones) {
  const info = insertZone.run(zone.slug, zone.name, zone.description);
  console.log(`Zona "${zone.name}" - ${Number(info.changes) > 0 ? 'adaugata' : 'exista deja'}.`);
}

console.log('Seed finalizat.');
