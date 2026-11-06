const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { ApiError } = require('../errors');

async function protect(req, res, next) {
  const authorization = req.get('authorization');
  const match = typeof authorization === 'string' && /^Bearer ([^\s]+)$/i.exec(authorization);
  const unauthorized = () => new ApiError(401, 'UNAUTHORIZED', 'Sign in to continue.');
  if (!match) throw unauthorized();
  let decoded;
  try { decoded = jwt.verify(match[1], req.app.locals.config.jwtSecret, { algorithms: ['HS256'] }); }
  catch { throw unauthorized(); }
  if (!decoded || typeof decoded.id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(decoded.id)) throw unauthorized();
  const user = await User.findById(decoded.id).select('_id name email');
  if (!user) throw unauthorized();
  req.user = user;
  next();
}

module.exports = { protect };
