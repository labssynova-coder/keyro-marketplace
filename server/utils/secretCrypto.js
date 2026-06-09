const crypto = require('crypto');
const env = require('../config/env');

const PREFIX = 'enc:v1:';

function getKey() {
  const source = process.env.DELIVERY_SECRET_KEY || env.jwt.secret;
  return crypto.createHash('sha256').update(String(source)).digest();
}

function encryptSecret(value) {
  if (!value) return null;
  const text = String(value);
  if (text.startsWith(PREFIX)) return text;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return PREFIX + [
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url')
  ].join('.');
}

function decryptSecret(value) {
  if (!value) return null;
  const text = String(value);
  if (!text.startsWith(PREFIX)) return text;

  const payload = text.slice(PREFIX.length).split('.');
  if (payload.length !== 3) return text;

  try {
    const [ivRaw, tagRaw, encryptedRaw] = payload;
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivRaw, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, 'base64url')),
      decipher.final()
    ]).toString('utf8');
  } catch (_) {
    return text;
  }
}

function decryptDeliveryRow(row) {
  if (!row) return row;
  return {
    ...row,
    key_value: decryptSecret(row.key_value),
    account_username: decryptSecret(row.account_username),
    account_password: decryptSecret(row.account_password),
    assigned_key: decryptSecret(row.assigned_key)
  };
}

module.exports = { encryptSecret, decryptSecret, decryptDeliveryRow };
