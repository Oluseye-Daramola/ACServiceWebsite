// Reads ?page=&limit= and returns mongoose-ready values plus a meta builder
const getPagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    meta: (total) => ({ page, limit, total, pages: Math.ceil(total / limit) })
  };
};

// Escapes user input before using it in a RegExp search
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { getPagination, escapeRegex };
