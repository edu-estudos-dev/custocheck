import express from 'express';
import { isAuthenticated, hasRole } from '../middleware/auth.js';
import * as lojaController from '../controllers/lojas.js';
import * as insumoController from '../controllers/insumos.js';
import * as compraController from '../controllers/compras.js';
import * as vendaController from '../controllers/vendas.js';
import * as contagemController from '../controllers/contagens.js';
import * as resultadoController from '../controllers/resultado.js';

const router = express.Router();

router.use(isAuthenticated);

// Lojas
router.post('/lojas', lojaController.createLoja);
router.get('/lojas', lojaController.listLojas);
router.get('/lojas/:id', lojaController.getLojaById);
router.put('/lojas/:id', lojaController.updateLoja);
router.delete('/lojas/:id', lojaController.deleteLoja);

// Insumos
router.post('/insumos', insumoController.createInsumo);
router.get('/insumos', insumoController.listInsumos);
router.get('/insumos/:id', insumoController.getInsumoById);
router.put('/insumos/:id', insumoController.updateInsumo);

// Embalagens
router.post('/insumos/:id/embalagens', insumoController.createEmbalagem);
router.get('/insumos/:id/embalagens', insumoController.listEmbalagens);

// Compras
router.post('/compras', compraController.createCompra);
router.get('/compras', compraController.listCompras);
router.get('/compras/:id', compraController.getCompraById);
router.get('/custo-medio', compraController.getCustoMedio);

// Vendas
router.post('/vendas', vendaController.createVenda);
router.get('/vendas', vendaController.listVendas);
router.get('/vendas/periodo', vendaController.getVenda);
router.put('/vendas/:id', vendaController.updateVenda);

// Contagens
router.post('/contagens', contagemController.createContagem);
router.get('/contagens', contagemController.listContagens);
router.get('/contagens/:id', contagemController.getContagemById);

// Resultado do período
router.get('/resultado', resultadoController.getResultadoPeriodo);

export default router;
