const { isValidTimeSlot } = require('./timeSlots');

const MAX_DAYS_AHEAD = 60;

function validateName(name) {
  if (typeof name !== 'string' || name.trim().length < 2) {
    return 'Numele trebuie să aibă cel puțin 2 caractere.';
  }
  if (name.trim().length > 60) {
    return 'Numele este prea lung (maxim 60 de caractere).';
  }
  return null;
}

function validateEmail(email) {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return 'Adresa de e-mail nu este validă.';
  }
  if (email.trim().length > 120) {
    return 'Adresa de e-mail este prea lungă.';
  }
  return null;
}

function validatePartySize(partySize) {
  const n = Number(partySize);
  if (!Number.isInteger(n) || n < 1 || n > 20) {
    return 'Numărul de persoane trebuie să fie între 1 și 20.';
  }
  return null;
}

function validateDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return 'Data trebuie să fie în formatul AAAA-LL-ZZ.';
  }

  // Verificare existență zi calendaristică (ex: 31 februarie)
  const pickedUtc = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(pickedUtc.getTime()) || pickedUtc.toISOString().split('T')[0] !== date) {
    return 'Data calendaristică nu există.';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const picked = new Date(`${date}T00:00:00`);
  if (picked < today) {
    return 'Data rezervării nu poate fi în trecut.';
  }

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);
  if (picked > maxDate) {
    return `Rezervările se pot face cu maxim ${MAX_DAYS_AHEAD} de zile în avans.`;
  }

  return null;
}

function validateTime(time) {
  if (!isValidTimeSlot(time)) {
    return 'Ora selectată nu face parte din programul restaurantului.';
  }
  return null;
}

module.exports = {
  MAX_DAYS_AHEAD,
  validateName,
  validateEmail,
  validatePartySize,
  validateDate,
  validateTime,
};