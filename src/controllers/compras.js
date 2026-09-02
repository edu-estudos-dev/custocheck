import * as compraModel from '../models/compras.js';
import * as costService from '../services/costCalculation.js';

export const createCompra = async (req, res) => {
  try {
    const { lojaId, insumoId, embalagemId, qtdEmbalagens, valorTotal, fornecedor, dataCompra } = req.body;

    if (!lojaId || !insumoId || !qtdEmbalagens || !valorTotal) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const compra = await compraModel.createCompra(
      req.session.contaId,
      lojaId,
      insumoId,
      embalagemId || null,
      qtdEmbalagens,
      valorTotal,
      fornecedor,
      dataCompra
    );

    res.status(201).json(compra);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar compra' });
  }
};

export const listCompras = async (req, res) => {
  try {
    const { lojaId, dataInicio, dataFim } = req.query;

    if (!lojaId) {
      return res.status(400).json({ error: 'lojaId obrigatório' });
    }

    const compras = await compraModel.listComprasByLojaId(
      lojaId,
      req.session.contaId,
      dataInicio,
      dataFim
    );

    res.json(compras);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar compras' });
  }
};

export const getCompraById = async (req, res) => {
  try {
    const compra = await compraModel.getCompraById(req.params.id, req.session.contaId);
    if (!compra) return res.status(404).json({ error: 'Compra não encontrada' });
    res.json(compra);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar compra' });
  }
};

export const getCustoMedio = async (req, res) => {
  try {
    const { insumoId, dataInicio, dataFim } = req.query;

    if (!insumoId) {
      return res.status(400).json({ error: 'insumoId obrigatório' });
    }

    const resultado = await costService.calculateWeightedAverageCost(
      req.session.contaId,
      insumoId,
      dataInicio,
      dataFim
    );

    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao calcular custo médio' });
  }
};
