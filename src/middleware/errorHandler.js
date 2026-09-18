// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Cererea trimisă nu este un JSON valid.' });
  }

  const status = err.status || 500;
  if (status === 500) {
    console.error('Eroare neasteptata:', err);
  }

  const message = status === 500
    ? 'A apărut o eroare pe server. Încearcă din nou mai târziu.'
    : err.message;

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
