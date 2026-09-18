const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const { listReservations, cancelById } = require('../services/reservations.service');
const { getAnalytics } = require('../services/analytics.service');

const router = express.Router();

router.use(adminAuth);

router.get('/analytics', (req, res, next) => {
  try {
    res.json(getAnalytics());
  } catch (err) {
    next(err);
  }
});

router.get('/reservations', (req, res, next) => {
  try {
    const { date, zone, status } = req.query;
    res.json(listReservations({ date, zoneSlug: zone, status }));
  } catch (err) {
    next(err);
  }
});

router.patch('/reservations/:id/cancel', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Id de rezervare invalid.' });
    }
    res.json(cancelById(id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
