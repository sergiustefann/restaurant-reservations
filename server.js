require('dotenv').config();

const path = require('node:path');
const express = require('express');

const adminAuth = require('./src/middleware/adminAuth');
const errorHandler = require('./src/middleware/errorHandler');

const zonesRoutes = require('./src/routes/zones.routes');
const availabilityRoutes = require('./src/routes/availability.routes');
const reservationsRoutes = require('./src/routes/reservations.routes');
const adminRoutes = require('./src/routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(express.json());

// Pagina de administrare cere aceleași credențiale ca API-ul admin.
app.get('/admin.html', adminAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

app.use(express.static(PUBLIC_DIR));

app.use('/api/zones', zonesRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Resursă inexistentă.' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Serverul ruleaza la http://localhost:${PORT}`);
});
