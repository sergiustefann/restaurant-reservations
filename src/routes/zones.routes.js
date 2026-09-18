const express = require('express');
const { listZones } = require('../services/availability.service');

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    res.json(listZones());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
