/**
 * Standardized API Response Utilities for Zoho Catalyst Functions
 * Conforms to the RichenQuest Architectural Standard
 */

function sendSuccess(res, data = {}, message = 'Operation completed successfully', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  });
}

function sendError(res, code = 'INTERNAL_ERROR', message = 'An unexpected error occurred', statusCode = 500, details = null) {
  const errorPayload = {
    success: false,
    error: {
      code,
      message
    },
    timestamp: new Date().toISOString()
  };

  if (details && process.env.NODE_ENV !== 'production') {
    errorPayload.error.details = details;
  }

  return res.status(statusCode).json(errorPayload);
}

module.exports = {
  sendSuccess,
  sendError
};
