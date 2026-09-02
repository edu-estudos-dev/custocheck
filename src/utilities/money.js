export const roundMoney = (value) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

export const formatMoney = (value, locale = 'pt-BR') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const parseMoney = (str) => {
  const cleaned = str
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');

  const parsed = parseFloat(cleaned);
  if (Number.isNaN(parsed)) {
    throw new Error('Invalid money format');
  }
  return roundMoney(parsed);
};
