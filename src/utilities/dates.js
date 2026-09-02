import { format, parse, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR/index.js';

export const formatDate = (date, formatStr = 'dd/MM/yyyy') => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, formatStr, { locale: ptBR }) : '';
};

export const formatDateTime = (date, formatStr = 'dd/MM/yyyy HH:mm:ss') => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, formatStr, { locale: ptBR }) : '';
};

export const parseDate = (dateStr, formatStr = 'dd/MM/yyyy') => {
  const parsed = parse(dateStr, formatStr, new Date(), { locale: ptBR });
  if (!isValid(parsed)) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  return parsed;
};

export const today = () => format(new Date(), 'yyyy-MM-dd');
