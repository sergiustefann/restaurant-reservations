const express = require('express');
const { getAvailability } = require('../services/availability.service');
const { validateDate } = require('../utils/validators');

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    const { date, zone } = req.query;

    if (!zone) {
      return res.status(400).json({ error: 'Parametrul "zone" este obligatoriu.' });
    }
    const dateError = validateDate(date);
    if (dateError) {
      return res.status(400).json({ error: dateError });
    }

    const result = getAvailability(zone, date);
    if (!result) {
      return res.status(404).json({ error: 'Zona cerută nu există.' });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
