import * as insumoModel from '../models/insumos.js';

export const createInsumo = async (req, res) => {
  try {
    const { nome, unidadeBase } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome obrigatório' });

    const insumo = await insumoModel.createInsumo(req.session.contaId, nome, unidadeBase || 'g');
    res.status(201).json(insumo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar insumo' });
  }
};

export const listInsumos = async (req, res) => {
  try {
    const insumos = await insumoModel.listInsumosByContaId(req.session.contaId);
    res.json(insumos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar insumos' });
  }
};

export const getInsumoById = async (req, res) => {
  try {
    const insumo = await insumoModel.getInsumoById(req.params.id, req.session.contaId);
    if (!insumo) return res.status(404).json({ error: 'Insumo não encontrado' });
    res.json(insumo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar insumo' });
  }
};

export const updateInsumo = async (req, res) => {
  try {
    const insumo = await insumoModel.updateInsumo(req.params.id, req.session.contaId, req.body);
    if (!insumo) return res.status(404).json({ error: 'Insumo não encontrado' });
    res.json(insumo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar insumo' });
  }
};

export const createEmbalagem = async (req, res) => {
  try {
    const { descricao, fatorConversao } = req.body;
    const insumoId = req.params.id;

    if (!descricao || !fatorConversao) {
      return res.status(400).json({ error: 'Descrição e fator obrigatórios' });
    }

    const embalagem = await insumoModel.createEmbalagem(insumoId, descricao, fatorConversao);
    res.status(201).json(embalagem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar embalagem' });
  }
};

export const listEmbalagens = async (req, res) => {
  try {
    const embalagens = await insumoModel.getEmbalagensByInsumoId(req.params.id);
    res.json(embalagens);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar embalagens' });
  }
};
