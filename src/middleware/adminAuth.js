const crypto = require('node:crypto');

// Comparam hash-urile SHA-256, nu sirurile brute: bufferele au intotdeauna
// aceeasi lungime, deci timingSafeEqual nu arunca si nu se scurge lungimea
// parolei prin diferenta de timp de raspuns.
function safeEqual(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function adminAuth(req, res, next) {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPass = process.env.ADMIN_PASSWORD;

  // Fara credentiale in .env zona de administrare ramane inchisa. O valoare
  // implicita scrisa in cod ar fi publica odata cu codul sursa, deci ar face
  // panoul accesibil oricui cloneaza proiectul si il porneste fara configurare.
  if (!expectedUser || !expectedPass) {
    console.error(
      'ADMIN_USER / ADMIN_PASSWORD lipsesc din .env: zona de administrare este dezactivata.'
    );
    return res.status(503).json({
      error: 'Zona de administrare nu este configurată pe acest server.',
    });
  }

  const [scheme, encoded] = (req.headers.authorization || '').split(' ');

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const sep = decoded.indexOf(':');

    if (sep > 0) {
      const user = decoded.slice(0, sep);
      const pass = decoded.slice(sep + 1);

      if (safeEqual(user, expectedUser) && safeEqual(pass, expectedPass)) {
        return next();
      }
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin Dashboard", charset="UTF-8"');
  return res.status(401).json({ error: 'Autentificare necesară pentru zona de administrare.' });
}

module.exports = adminAuth;
