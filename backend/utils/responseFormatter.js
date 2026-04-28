/**
 * ✅ STANDARDIZED RESPONSE FORMAT
 * 
 * All API endpoints should use this utility for consistent responses:
 * 
 * LIST responses:
 *   GET /api/jobs -> { data: [...], count: 10 }
 * 
 * SINGLE ITEM:
 *   GET /api/jobs/1 -> { data: {...} }
 * 
 * CREATE/UPDATE:
 *   POST /api/jobs -> { data: {...}, message: "Job created" }
 * 
 * DELETE:
 *   DELETE /api/jobs/1 -> { message: "Job deleted successfully" }
 * 
 * ERRORS: Use res.status(code).json({ error: "message" })
 */

/**
 * Response for list/collection queries
 * @param {Array} data - Array of items
 * @param {Number} count - Total count (optional, for pagination)
 * @returns {Object}
 */
const list = (data = [], count = null) => {
  const response = { data };
  if (count !== null) {
    response.count = count;
  }
  return response;
};

/**
 * Response for single item fetch
 * @param {Object} data - Single item object
 * @returns {Object}
 */
const single = (data = null) => {
  return { data };
};

/**
 * Response for successful create/update operations
 * @param {Object} data - Created/updated object
 * @param {String} message - Success message (optional)
 * @returns {Object}
 */
const created = (data = null, message = null) => {
  const response = { data };
  if (message) {
    response.message = message;
  }
  return response;
};

/**
 * Response for successful delete operations
 * @param {String} message - Success message
 * @returns {Object}
 */
const deleted = (message = "Resource deleted successfully") => {
  return { message };
};

/**
 * Response for successful operations without data
 * @param {String} message - Success message
 * @returns {Object}
 */
const success = (message = "Operation successful") => {
  return { message };
};

/**
 * Error response
 * @param {String} message - Error message
 * @param {*} details - Additional error details (optional)
 * @returns {Object}
 */
const error = (message = "An error occurred", details = null) => {
  const response = { error: message };
  if (details) {
    response.details = details;
  }
  return response;
};

/**
 * Pagination helper
 * @param {Number} page - Current page (1-indexed)
 * @param {Number} limit - Items per page
 * @returns {Object} { skip, limit, page }
 */
const getPagination = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;
  return { skip, limit: limitNum, page: pageNum };
};

module.exports = {
  list,
  single,
  created,
  deleted,
  success,
  error,
  getPagination,
};
