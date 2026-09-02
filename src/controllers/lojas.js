import * as lojaModel from '../models/lojas.js';

export const createLoja = async (req, res) => {
  try {
    const { nome, cidade } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome obrigatório' });

    const loja = await lojaModel.createLoja(req.session.contaId, nome, cidade);
    res.status(201).json(loja);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar loja' });
  }
};

export const listLojas = async (req, res) => {
  try {
    const lojas = await lojaModel.listLojasByContaId(req.session.contaId);
    res.json(lojas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar lojas' });
  }
};

export const getLojaById = async (req, res) => {
  try {
    const loja = await lojaModel.getLojaById(req.params.id, req.session.contaId);
    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });
    res.json(loja);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar loja' });
  }
};

export const updateLoja = async (req, res) => {
  try {
    const loja = await lojaModel.updateLoja(req.params.id, req.session.contaId, req.body);
    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });
    res.json(loja);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar loja' });
  }
};

export const deleteLoja = async (req, res) => {
  try {
    const result = await lojaModel.deleteLoja(req.params.id, req.session.contaId);
    if (!result) return res.status(404).json({ error: 'Loja não encontrada' });
    res.json({ message: 'Loja deletada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao deletar loja' });
  }
};
