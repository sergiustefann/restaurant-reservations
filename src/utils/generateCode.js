const crypto = require('node:crypto');

// Alfabet fără caractere ambigue (0/O, 1/I/L), ca sa fie usor de tastat.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

function generateCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  }
  return code;
}

module.exports = { generateCode };
