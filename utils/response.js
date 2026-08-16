/**
 * Uniform JSON response shape across the whole API.
 */
function success(res, data = {}, message = 'OK', statusCode = 200) {
  return res.status(statusCode).json({
    ok: true,
    message,
    data
  });
}

function fail(res, message = 'Something went wrong', statusCode = 400, errors = null) {
  return res.status(statusCode).json({
    ok: false,
    message,
    errors
  });
}

module.exports = { success, fail };
