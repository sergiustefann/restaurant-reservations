// Scenariul T1: 25 de cereri trimise simultan catre acelasi slot (zona + data + ora).
//
// Rezultatul asteptat este o singura rezervare acceptata (201) si 24 de raspunsuri 409,
// respinse fie de re-verificarea din interiorul tranzactiei BEGIN IMMEDIATE, fie de
// indexul unic partial uq_active_slot atunci cand doua cereri trec de verificare.
//
// Rulare: porneste serverul cu `npm start`, apoi, din alt terminal:
//   node test/concurrency.js

const ENDPOINT = `http://localhost:${process.env.PORT || 3000}/api/reservations`;
const NUM_REQUESTS = 25;

const ZONE_SLUG = 'sea-side';
const TIME = '19:00';

// Alegem o zi diferita la fiecare rulare, in fereastra de 60 de zile acceptata de
// validator, ca testul sa fie repetabil fara sa stergem manual rezervarea anterioara.
function randomFutureDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1 + Math.floor(Math.random() * 55));
  return date.toISOString().slice(0, 10);
}

async function run() {
  const reservationDate = randomFutureDate();
  console.log(`Slot testat: ${ZONE_SLUG} ${reservationDate} ${TIME}`);
  console.log(`Trimit ${NUM_REQUESTS} cereri simultane...`);

  const start = Date.now();

  const requests = Array.from({ length: NUM_REQUESTS }, (_, i) =>
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Test concurenta ${i}`,
        email: `test${i}@exemplu.com`,
        partySize: 2,
        date: reservationDate,
        time: TIME,
        zone: ZONE_SLUG,
      }),
    })
      .then((res) => res.status)
      .catch(() => 0)
  );

  const statuses = await Promise.all(requests);
  const durationMs = Date.now() - start;

  const created = statuses.filter((s) => s === 201).length;
  const conflicts = statuses.filter((s) => s === 409).length;
  const other = statuses.filter((s) => s !== 201 && s !== 409);

  console.log(`\nDurata totala: ${durationMs} ms`);
  console.log(`Acceptate (201): ${created}`);
  console.log(`Respinse, slot ocupat (409): ${conflicts}`);
  if (other.length > 0) {
    console.log(`Alte raspunsuri: ${other.join(', ')}`);
  }

  if (created === 1 && conflicts === NUM_REQUESTS - 1) {
    console.log('\nTEST TRECUT: exact o rezervare a ajuns in baza de date.');
    process.exitCode = 0;
  } else {
    console.log('\nTEST PICAT: regula unei singure rezervari active pe slot nu a fost respectata.');
    process.exitCode = 1;
  }
}

run();
