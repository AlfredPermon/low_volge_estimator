const crypto = require('crypto');

function computeSha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function getRandomHex(bytesCount = 16) {
  return crypto.randomBytes(bytesCount).toString('hex');
}

function createLegacyHash(password) {
  const salt = getRandomHex(16);
  const hash = computeSha256Hex(password + salt);
  return `${salt}:${hash}`;
}

console.log(createLegacyHash('AdminPassword123!'));
