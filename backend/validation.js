const { ApiError } = require('./errors');

const requiredStrings = { name: 200, phone: 100, nip: 100, address: 1000 };
const optionalStrings = { notes: 10000, typeUnknown: 200 };
const priceKeys = ['priceColorless', 'priceColor', 'priceUnknown'];
const idPattern = /^[a-fA-F0-9]{24}$/;

function invalid(field, message) {
  throw new ApiError(400, 'INVALID_INPUT', 'Check the highlighted fields.', { [field]: message });
}

function objectBody(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('body', 'Provide a JSON object.');
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) invalid(key, 'This field cannot be written.');
  }
}

function validateId(id) {
  if (typeof id !== 'string' || !idPattern.test(id)) invalid('id', 'Provide a valid record ID.');
  return id;
}

function boundedString(value, field, max, required = true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    invalid(field, required ? `Enter a nonempty string of at most ${max} characters.` : `Enter a string of at most ${max} characters.`);
  }
  return value;
}

function calendarDate(value) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') invalid('contactDate', 'Enter a date or null.');
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(value);
  if (!match) invalid('contactDate', 'Use YYYY-MM-DD or an ISO timestamp.');
  const [year, month, day] = match.slice(1).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1]) invalid('contactDate', 'Enter a real calendar date.');
  const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  if (!Number.isFinite(date.getTime())) invalid('contactDate', 'Enter a valid ISO timestamp.');
  return date;
}

function contractorInput(body, { partial = false, id } = {}) {
  objectBody(body, [...Object.keys(requiredStrings), ...Object.keys(optionalStrings), ...priceKeys, 'contactDate', ...(partial ? ['_id'] : [])]);
  if (Object.hasOwn(body, '_id') && (typeof body._id !== 'string' || body._id.toLowerCase() !== id.toLowerCase())) invalid('_id', 'Record identity cannot be changed.');
  const result = {};
  for (const [key, max] of Object.entries(requiredStrings)) {
    if (!partial || Object.hasOwn(body, key)) result[key] = boundedString(body[key], key, max);
  }
  for (const [key, max] of Object.entries(optionalStrings)) {
    if (Object.hasOwn(body, key)) result[key] = body[key] === null ? null : boundedString(body[key], key, max, false);
  }
  for (const key of priceKeys) {
    if (!Object.hasOwn(body, key)) continue;
    const value = body[key];
    if (value === null || (typeof value === 'string' && !value.trim())) result[key] = null;
    else {
      if (typeof value !== 'number' && (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim()))) invalid(key, 'Enter a finite number or null.');
      const price = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(price)) invalid(key, 'Enter a finite number or null.');
      result[key] = price;
    }
  }
  if (Object.hasOwn(body, 'contactDate')) result.contactDate = calendarDate(body.contactDate);
  return result;
}

function authInput(body, register = false) {
  objectBody(body, register ? ['name', 'email', 'password', 'captchaToken'] : ['email', 'password']);
  const email = boundedString(body.email, 'email', 254).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invalid('email', 'Enter a valid email address.');
  const password = boundedString(body.password, 'password', 1024);
  if (register && (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72)) invalid('password', 'Use at least 8 characters and at most 72 UTF-8 bytes.');
  const result = { email, password };
  if (register) {
    result.name = boundedString(body.name, 'name', 200).trim();
    if (Object.hasOwn(body, 'captchaToken')) result.captchaToken = boundedString(body.captchaToken, 'captchaToken', 4096);
  }
  return result;
}

module.exports = { validateId, contractorInput, authInput };
