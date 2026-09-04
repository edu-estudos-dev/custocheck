const DATE_ONLY_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

export function formatDateOnly(value) {
  if (typeof value !== 'string') return '';

  const match = value.match(DATE_ONLY_PREFIX);
  if (!match) return '';

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}
