const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { authInput } = require('../validation');
const { ApiError } = require('../errors');
const { verifyCaptcha } = require('../captcha');

const publicUser = user => ({ _id: user._id, name: user.name, email: user.email });
const session = (user, config) => ({ ...publicUser(user), token: jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '30d', algorithm: 'HS256' }) });

async function registerUser(req, res) {
  const { name, email, password, captchaToken } = authInput(req.body, true);
  await verifyCaptcha(captchaToken, req.app.locals);
  if (await User.exists({ email })) throw new ApiError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');
  const user = await User.create({ name, email, password });
  res.status(201).json(session(user, req.app.locals.config));
}

async function loginUser(req, res) {
  const { email, password } = authInput(req.body);
  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  res.json(session(user, req.app.locals.config));
}

async function getMe(req, res) {
  res.json(publicUser(req.user));
}

module.exports = { registerUser, loginUser, getMe };
