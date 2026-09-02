import * as vendaModel from '../models/vendas.js';
import * as lojaModel from '../models/lojas.js';

export const createVenda = async (req, res) => {
  try {
    const { lojaId, dataInicio, dataFim, faturamento } = req.body;

    if (!lojaId || !dataInicio || !dataFim || !faturamento) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const loja = await lojaModel.getLojaById(lojaId, req.session.contaId);
    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });

    const venda = await vendaModel.createVendaPeriodo(
      req.session.contaId,
      lojaId,
      dataInicio,
      dataFim,
      faturamento
    );

    if (!venda) {
      return res.status(409).json({ error: 'Venda já registrada para este período' });
    }

    res.status(201).json(venda);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar venda' });
  }
};

export const listVendas = async (req, res) => {
  try {
    const { lojaId } = req.query;

    if (!lojaId) {
      return res.status(400).json({ error: 'lojaId obrigatório' });
    }

    const vendas = await vendaModel.listVendasByLojaId(lojaId, req.session.contaId);
    res.json(vendas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar vendas' });
  }
};

export const getVenda = async (req, res) => {
  try {
    const { lojaId, dataInicio, dataFim } = req.query;

    if (!lojaId || !dataInicio || !dataFim) {
      return res.status(400).json({ error: 'lojaId, dataInicio, dataFim obrigatórios' });
    }

    const venda = await vendaModel.getVendaPeriodo(lojaId, req.session.contaId, dataInicio, dataFim);
    if (!venda) return res.status(404).json({ error: 'Venda não encontrada' });
    res.json(venda);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar venda' });
  }
};

export const updateVenda = async (req, res) => {
  try {
    const { faturamento } = req.body;

    const venda = await vendaModel.updateVendaPeriodo(req.params.id, req.session.contaId, { faturamento });
    if (!venda) return res.status(404).json({ error: 'Venda não encontrada' });
    res.json(venda);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar venda' });
  }
};
