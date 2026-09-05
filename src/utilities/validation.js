import sanitizeHtml from 'sanitize-html';

export const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return sanitizeHtml(str, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
};

export const parseDecimal = (value) => {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new Error('Invalid decimal');
  }
  return parsed;
};

export const parseFiniteDecimal = (value) => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    throw new TypeError('Invalid finite decimal');
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new TypeError('Invalid finite decimal');
  }
  return parsed;
};

export const parsePositiveDecimal = (value) => {
  const parsed = parseFiniteDecimal(value);
  if (parsed <= 0) {
    throw new TypeError('Decimal must be positive');
  }
  return parsed;
};

export const parseNonNegativeDecimal = (value) => {
  const parsed = parseFiniteDecimal(value);
  if (parsed < 0) {
    throw new TypeError('Decimal must be non-negative');
  }
  return parsed;
};

export const isIsoDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

export const isValidDateRange = (inicio, fim) => (
  isIsoDate(inicio) && isIsoDate(fim) && inicio <= fim
);

export const parseInteger = (value) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error('Invalid integer');
  }
  return parsed;
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password) => {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
};

export const validateUrl = (url, baseUrl = 'http://localhost') => {
  try {
    const parsed = new URL(url, baseUrl);
    const base = new URL(baseUrl);
    return parsed.origin === base.origin;
  } catch {
    return false;
  }
};
