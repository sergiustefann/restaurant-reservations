# Maison du Rivage — Sistem de rezervări pentru restaurant

Aplicație web pentru gestiunea rezervărilor dintr-un restaurant, realizată ca proiect de licență.

## Tehnologii

- **Backend:** Node.js + Express
- **Bază de date:** SQLite (prin modulul nativ `node:sqlite`)
- **Frontend:** HTML, CSS și JavaScript Vanilla (fără framework-uri)

## Cerințe

- Node.js versiunea 22.5 sau mai nouă (pentru modulul `node:sqlite`)

## Instalare și pornire

```bash
npm install
cp .env.example .env    # apoi completează ADMIN_USER și ADMIN_PASSWORD
npm run seed
npm start
```

Serverul pornește pe `http://localhost:3000`. Pentru dezvoltare cu repornire automată: `npm run dev`.

## Structura proiectului

```
.
├── server.js               # configurarea Express și pornirea serverului
├── database/
│   ├── db.js               # conexiunea SQLite + helperele get / all / run / transaction
│   ├── schema.sql          # definiția tabelelor și a indexurilor
│   └── seed.js             # aplică schema și inserează zonele
├── src/
│   ├── routes/             # rutele HTTP, grupate pe resurse
│   ├── services/           # logica de business + interogările SQL
│   ├── middleware/         # autentificare admin + tratarea erorilor
│   └── utils/              # sloturi orare, validări, generare cod, erori HTTP
├── test/
│   └── concurrency.js      # testul de cereri simultane pe același slot
└── public/                 # frontendul servit static
    ├── index.html          # pagina de rezervare
    ├── cancel.html         # anulare pe bază de cod
    ├── admin.html          # panou de administrare
    ├── css/styles.css
    └── js/
```

## Rute API

| Metodă | Cale | Descriere |
|--------|------|-----------|
| GET | `/api/zones` | Lista zonelor de rezervare |
| GET | `/api/availability?zone=&date=` | Sloturile orare libere/ocupate pentru o zi și o zonă |
| POST | `/api/reservations` | Creează o rezervare (previne suprapunerile) |
| GET | `/api/reservations/:code` | Detaliile unei rezervări după cod |
| POST | `/api/reservations/cancel` | Anulează o rezervare pe bază de cod |
| GET | `/api/admin/analytics` | (admin) Totaluri, distribuție pe zone, ore de vârf |
| GET | `/api/admin/reservations` | (admin) Listă filtrabilă a rezervărilor |
| PATCH | `/api/admin/reservations/:id/cancel` | (admin) Anulează o rezervare |

## Prevenirea suprapunerilor

Un slot este combinația **zonă + dată + oră** și acceptă o singură rezervare activă:

1. Inserarea rezervării rulează într-o tranzacție `BEGIN IMMEDIATE`, care re-verifică
   dacă slotul este liber înainte de `INSERT`.
2. Indexul unic parțial `uq_active_slot` garantează, la nivel de bază de date, că nu pot
   exista două rezervări cu `status = 'active'` pe același slot. Dacă două cereri trec
   totuși de verificarea din tranzacție, a doua primește o eroare `UNIQUE` de la SQLite,
   care este tradusă în răspuns `409`.
3. Dacă slotul tocmai a fost ocupat, serverul răspunde cu `409` și un mesaj clar, iar
   interfața marchează slotul ca indisponibil (gri).
4. La anulare, `status` devine `'cancelled'`; slotul se eliberează automat, pentru că atât
   interogările de disponibilitate, cât și indexul parțial iau în calcul doar rezervările active.

### Verificarea prin test

Cu serverul pornit, din alt terminal:

```bash
node test/concurrency.js
```

Scriptul trimite 25 de cereri simultane către același slot și verifică faptul că exact una
este acceptată (`201`), iar celelalte 24 sunt respinse cu `409`.

## Configurare (`.env`)

Valorile se copiază din `.env.example` și se completează local. Fișierul `.env` nu se
urcă în repository.

| Variabilă | Rol |
|-----------|-----|
| `PORT` | portul serverului Express |
| `DB_PATH` | calea fișierului SQLite |
| `ADMIN_USER`, `ADMIN_PASSWORD` | credențialele pentru zona de administrare |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | serverul de e-mail pentru confirmări |

## Note de securitate

- Rutele `/api/admin/*` și pagina `admin.html` sunt protejate cu autentificare HTTP Basic.
  Credențialele se citesc exclusiv din `.env`; nu există valori implicite în codul sursă.
  Dacă `ADMIN_USER` sau `ADMIN_PASSWORD` lipsesc, zona de administrare răspunde `503` și
  rămâne inaccesibilă, în loc să cadă pe o parolă previzibilă.
- Compararea credențialelor se face pe hash-uri SHA-256 cu `crypto.timingSafeEqual`, ca
  durata răspunsului să nu dezvăluie cât din parolă este corect.
- HTTP Basic trimite credențialele codificate base64, nu criptate. Într-o instalare reală
  aplicația trebuie servită exclusiv prin HTTPS, iar pentru mai mulți administratori
  autentificarea ar trebui înlocuită cu sesiuni și parole stocate ca hash în baza de date.
- Datele introduse de utilizator sunt validate pe server (`src/utils/validators.js`), nu
  doar în browser, iar toate interogările folosesc parametri pregătiți (`?`), fără
  concatenare de SQL.
