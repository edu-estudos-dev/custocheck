import * as contagemModel from '../models/contagens.js';
import * as lojaModel from '../models/lojas.js';
import * as insumoModel from '../models/insumos.js';

const normalizarItens = async (contaId, itens) => {
  const insumosConta = await insumoModel.listInsumosByContaId(contaId);
  const insumoIdsValidos = new Set(insumosConta.map((i) => i.id));

  const itensNormalizados = [];
  for (const item of itens) {
    const insumoId = parseInt(item.insumoId, 10);
    const qtdBase = parseFloat(item.qtdBase);
    if (!insumoIdsValidos.has(insumoId)) {
      throw new Error(`Insumo ${item.insumoId} não pertence a esta conta`);
    }
    if (Number.isNaN(qtdBase) || qtdBase < 0) {
      throw new Error('Quantidade inválida na contagem');
    }
    itensNormalizados.push({ insumoId, qtdBase });
  }
  return itensNormalizados;
};

export const createContagem = async (req, res) => {
  try {
    const { lojaId, dataReferencia, itens } = req.body;

    if (!lojaId || !dataReferencia || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: 'Loja, data e itens da contagem são obrigatórios' });
    }

    const loja = await lojaModel.getLojaById(lojaId, req.session.contaId);
    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });

    const itensNormalizados = await normalizarItens(req.session.contaId, itens);

    const contagem = await contagemModel.createContagem(
      req.session.contaId,
      lojaId,
      dataReferencia,
      req.session.userId,
      itensNormalizados
    );

    res.status(201).json(contagem);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Já existe uma contagem para esta loja nesta data' });
    }
    if (error.message.includes('Insumo') || error.message.includes('Quantidade')) {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar contagem' });
  }
};

export const updateContagem = async (req, res) => {
  try {
    const { dataReferencia, itens } = req.body;

    if (!dataReferencia || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: 'Data e itens da contagem são obrigatórios' });
    }

    const existente = await contagemModel.getContagemComItens(req.params.id, req.session.contaId);
    if (!existente) return res.status(404).json({ error: 'Contagem não encontrada' });

    const itensNormalizados = await normalizarItens(req.session.contaId, itens);

    const contagem = await contagemModel.updateContagem(
      req.params.id,
      req.session.contaId,
      dataReferencia,
      itensNormalizados
    );

    if (!contagem) return res.status(404).json({ error: 'Contagem não encontrada' });
    res.json(contagem);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Já existe uma contagem para esta loja nesta data' });
    }
    if (error.message.includes('Insumo') || error.message.includes('Quantidade')) {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar contagem' });
  }
};

export const deleteContagem = async (req, res) => {
  try {
    const result = await contagemModel.deleteContagem(req.params.id, req.session.contaId);
    if (!result) return res.status(404).json({ error: 'Contagem não encontrada' });
    res.json({ message: 'Contagem removida' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao remover contagem' });
  }
};

export const listContagens = async (req, res) => {
  try {
    const { lojaId } = req.query;
    if (!lojaId) return res.status(400).json({ error: 'lojaId obrigatório' });

    const contagens = await contagemModel.listContagensByLoja(lojaId, req.session.contaId);
    res.json(contagens);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar contagens' });
  }
};

export const getContagemById = async (req, res) => {
  try {
    const contagem = await contagemModel.getContagemComItens(req.params.id, req.session.contaId);
    if (!contagem) return res.status(404).json({ error: 'Contagem não encontrada' });
    res.json(contagem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar contagem' });
  }
};
