const DATE_ONLY_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function formatDateOnly(value) {
  if (typeof value !== 'string') return '';

  const match = value.match(DATE_ONLY_PREFIX);
  if (!match) return '';

  const [, year, month, day] = match;
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const isLeapYear = yearNumber % 4 === 0
    && (yearNumber % 100 !== 0 || yearNumber % 400 === 0);
  const daysInMonth = monthNumber === 2 && isLeapYear
    ? 29
    : DAYS_IN_MONTH[monthNumber - 1];

  if (!daysInMonth || dayNumber < 1 || dayNumber > daysInMonth) return '';

  return `${day}/${month}/${year}`;
}
