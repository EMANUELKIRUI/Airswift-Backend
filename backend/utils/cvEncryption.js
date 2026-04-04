const crypto = require('crypto');

// AES-256-GCM encryption for CV files
const ENCRYPTION_KEY = crypto.scryptSync(process.env.CV_ENCRYPTION_KEY || 'default-key-change-in-production', 'salt', 32);
const ALGORITHM = 'aes-256-gcm';

const encryptCV = (buffer) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  cipher.setAAD(Buffer.from('cv-file'));

  let encrypted = cipher.update(buffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Return format: iv + authTag + encryptedData
  return Buffer.concat([iv, authTag, encrypted]);
};

const decryptCV = (encryptedBuffer) => {
  const iv = encryptedBuffer.slice(0, 16);
  const authTag = encryptedBuffer.slice(16, 32);
  const encrypted = encryptedBuffer.slice(32);

  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  decipher.setAAD(Buffer.from('cv-file'));
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted;
};

module.exports = {
  encryptCV,
  decryptCV,
};