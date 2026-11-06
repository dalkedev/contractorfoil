const { ApiError } = require('./errors');

async function verifyCaptcha(token, { config, fetchImpl }) {
  if (!config.useRecaptcha) return;
  if (!token) throw new ApiError(400, 'CAPTCHA_REQUIRED', 'Complete CAPTCHA verification.', { captchaToken: 'CAPTCHA is required.' });
  let verdict;
  try {
    const response = await fetchImpl('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: config.recaptchaSecretKey, response: token }).toString(),
      signal: AbortSignal.timeout(config.recaptchaTimeoutMs || 3000),
    });
    if (!response.ok) throw new Error('Upstream request failed');
    verdict = await response.json();
  } catch {
    throw new ApiError(503, 'CAPTCHA_UNAVAILABLE', 'CAPTCHA verification is temporarily unavailable. Try again.');
  }
  if (!verdict || verdict.success !== true || typeof verdict.score !== 'number' || !Number.isFinite(verdict.score) || verdict.score < 0.5 || verdict.score > 1 ||
      verdict.action !== 'register' || verdict.hostname !== config.recaptchaHostname) {
    throw new ApiError(400, 'CAPTCHA_FAILED', 'CAPTCHA verification failed.', { captchaToken: 'Try CAPTCHA verification again.' });
  }
}

module.exports = { verifyCaptcha };
