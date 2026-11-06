class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const asyncHandler = handler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let mapped = error;
  if (error instanceof ApiError) mapped = error;
  else if (error.type === 'entity.parse.failed') mapped = new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  else if (error.type === 'entity.too.large') mapped = new ApiError(413, 'BODY_TOO_LARGE', 'Request body is too large.');
  else if (error.status === 415) mapped = new ApiError(415, 'UNSUPPORTED_ENCODING', 'Request encoding is not supported.');
  else if (error.status === 400) mapped = new ApiError(400, 'INVALID_REQUEST', 'Request is malformed.');
  else if (error.code === 11000) mapped = new ApiError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');
  else if (error.name === 'ValidationError' || error.name === 'CastError') mapped = new ApiError(400, 'INVALID_INPUT', 'Request contains invalid values.');
  if (!(mapped instanceof ApiError)) mapped = new ApiError(500, 'INTERNAL_ERROR', 'Internal server error.');
  res.status(mapped.status).json({ message: mapped.message, code: mapped.code, ...(mapped.fields ? { fields: mapped.fields } : {}) });
}

module.exports = { ApiError, asyncHandler, errorHandler };
