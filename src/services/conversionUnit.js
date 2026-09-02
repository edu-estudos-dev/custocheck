import { roundMoney } from '../utilities/money.js';

export const convertToBaseUnit = (qtdEmbalagens, fatorConversao) => {
  if (!fatorConversao) {
    throw new Error('Fator de conversão não definido');
  }

  const qtdBase = roundMoney(qtdEmbalagens * fatorConversao);
  return qtdBase;
};

export const convertBetweenUnits = (valor, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return valor;

  const conversions = {
    'g->ml': 1,
    'ml->g': 1,
    'g->un': null,
    'ml->un': null,
    'un->g': null,
    'un->ml': null,
  };

  const key = `${fromUnit}->${toUnit}`;
  const factor = conversions[key];

  if (factor === null) {
    throw new Error(`Conversão de ${fromUnit} para ${toUnit} não suportada`);
  }

  if (factor === undefined) {
    throw new Error(`Conversão desconhecida: ${key}`);
  }

  return roundMoney(valor * factor);
};

export const normalizeUnit = (unit) => {
  const normalized = unit.toLowerCase().trim();
  if (!['g', 'ml', 'un'].includes(normalized)) {
    throw new Error(`Unidade desconhecida: ${unit}`);
  }
  return normalized;
};
