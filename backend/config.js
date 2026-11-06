function readConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  if (typeof env.JWT_SECRET !== 'string' || !env.JWT_SECRET.trim()) throw new Error('JWT_SECRET is required.');
  if (production && !env.MONGO_URI) throw new Error('MONGO_URI is required in production.');
  const mongoUri = env.MONGO_URI || 'mongodb://127.0.0.1:27017/contractorfoil';
  if (!/^mongodb(?:\+srv)?:\/\/[^\s]+\/[a-zA-Z0-9_-]+(?:\?[^\s]*)?$/.test(mongoUri)) throw new Error('MONGO_URI must name an explicit MongoDB database.');
  const portText = env.PORT === undefined ? '5000' : env.PORT;
  if (!/^\d+$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) throw new Error('PORT must be between 1 and 65535.');
  if (production && env.CORS_ORIGINS === undefined) throw new Error('CORS_ORIGINS must be explicit in production (empty permits same-origin only).');
  const corsOrigins = (env.CORS_ORIGINS === undefined ? 'http://localhost:5173,http://127.0.0.1:5173' : env.CORS_ORIGINS).split(',').map(value => value.trim()).filter(Boolean);
  for (const origin of corsOrigins) {
    let url;
    try { url = new URL(origin); } catch { throw new Error('CORS_ORIGINS must contain HTTP(S) origins.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || url.username || url.password) throw new Error('CORS_ORIGINS must contain exact HTTP(S) origins without paths.');
  }
  if (env.USE_RECAPTCHA !== undefined && !['true', 'false'].includes(env.USE_RECAPTCHA)) throw new Error('USE_RECAPTCHA must be true or false.');
  const useRecaptcha = env.USE_RECAPTCHA === 'true';
  if (useRecaptcha && (!env.RECAPTCHA_SECRET_KEY || !env.RECAPTCHA_HOSTNAME)) throw new Error('Enabled CAPTCHA requires RECAPTCHA_SECRET_KEY and RECAPTCHA_HOSTNAME.');
  if (useRecaptcha && !/^[a-zA-Z0-9.-]+$/.test(env.RECAPTCHA_HOSTNAME)) throw new Error('RECAPTCHA_HOSTNAME must be an exact hostname.');
  return Object.freeze({ mongoUri, jwtSecret: env.JWT_SECRET, port: Number(portText), host: production ? '0.0.0.0' : '127.0.0.1', corsOrigins,
    useRecaptcha, recaptchaSecretKey: env.RECAPTCHA_SECRET_KEY, recaptchaHostname: env.RECAPTCHA_HOSTNAME,
    recaptchaTimeoutMs: 3000, databaseTimeoutMs: 5000, shutdownTimeoutMs: 5000 });
}

module.exports = { readConfig };
