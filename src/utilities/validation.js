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
