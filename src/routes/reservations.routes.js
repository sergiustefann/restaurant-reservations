const express = require('express');
const {
  createReservation,
  findByCode,
  cancelByCode,
} = require('../services/reservations.service');
const {
  validateName,
  validateEmail,
  validatePartySize,
  validateDate,
  validateTime,
} = require('../utils/validators');

const router = express.Router();

router.post('/', (req, res, next) => {
  try {
    const { name, email, partySize, date, time, zone } = req.body;

    const errorMessage =
      validateName(name) ||
      validateEmail(email) ||
      validatePartySize(partySize) ||
      validateDate(date) ||
      validateTime(time) ||
      (!zone ? 'Zona este obligatorie.' : null);

    if (errorMessage) {
      return res.status(400).json({ error: errorMessage });
    }

    const result = createReservation({ name, email, partySize, date, time, zoneSlug: zone });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:code', (req, res, next) => {
  try {
    const reservation = findByCode(req.params.code.trim().toUpperCase());
    if (!reservation) {
      return res.status(404).json({ error: 'Nu am găsit nicio rezervare cu acest cod.' });
    }
    res.json(reservation);
  } catch (err) {
    next(err);
  }
});

router.post('/cancel', (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Codul rezervării este obligatoriu.' });
    }
    res.json(cancelByCode(code.trim().toUpperCase()));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
