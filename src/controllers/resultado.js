import * as costService from '../services/costCalculation.js';
import * as lojaModel from '../models/lojas.js';
import { isValidDateRange } from '../utilities/validation.js';

export const getResultadoPeriodo = async (req, res) => {
  try {
    const { lojaId, dataInicio, dataFim } = req.query;

    if (!lojaId || !dataInicio || !dataFim) {
      return res.status(400).json({ error: 'lojaId, dataInicio e dataFim obrigatórios' });
    }

    if (!isValidDateRange(dataInicio, dataFim)) {
      return res.status(400).json({ error: 'Periodo invalido' });
    }

    const loja = await lojaModel.getLojaById(lojaId, req.session.contaId);
    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });

    const resultado = await costService.calculateResultadoPeriodo(
      req.session.contaId,
      lojaId,
      dataInicio,
      dataFim
    );

    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao calcular resultado do período' });
  }
};
