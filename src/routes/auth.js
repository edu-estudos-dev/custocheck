import express from 'express';
import * as userModel from '../models/users.js';
import { sanitize, validateEmail, validatePassword } from '../utilities/validation.js';
import { withTransaction } from '../config/database.js';
import bcrypt from 'bcrypt';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha obrigatórios' });
    }

    const emailSafe = sanitize(email).toLowerCase();
    const user = await userModel.getUserByEmail(emailSafe);

    if (!user || !user.ativo) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const match = await userModel.verifyPassword(senha, user.senha_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    req.session.userId = user.id;
    req.session.contaId = user.conta_id;
    req.session.papel = user.papel;

    if (req.accepts('html')) {
      return res.redirect('/dashboard');
    }
    res.json({ message: 'Login successful', userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login falhou' });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const nomeSafe = sanitize(nome);
    const emailSafe = sanitize(email).toLowerCase();

    if (!validateEmail(emailSafe)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    if (!validatePassword(senha)) {
      return res.status(400).json({ error: 'Senha fraca' });
    }

    const existing = await userModel.getUserByEmail(emailSafe);
    if (existing) {
      return res.status(409).json({ error: 'Email já registrado' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const resultado = await withTransaction(async (client) => {
      const contaRes = await client.query(
        'INSERT INTO contas (nome, email, plano) VALUES ($1, $2, $3) RETURNING id, nome, email, plano, criado_em',
        [nomeSafe, emailSafe, 'basic']
      );
      const conta = contaRes.rows[0];

      const usuarioRes = await client.query(
        `INSERT INTO usuarios (conta_id, nome, email, senha_hash, papel)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, conta_id, nome, email, papel, ativo, criado_em`,
        [conta.id, nomeSafe, emailSafe, senhaHash, 'dono']
      );

      return { conta, usuario: usuarioRes.rows[0] };
    });

    req.session.userId = resultado.usuario.id;
    req.session.contaId = resultado.conta.id;
    req.session.papel = resultado.usuario.papel;

    if (req.accepts('html')) {
      return res.redirect('/dashboard');
    }
    res.status(201).json({ message: 'Signup successful', userId: resultado.usuario.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Signup falhou' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }

    res.clearCookie('connect.sid');
    if (req.accepts('html')) {
      return res.redirect('/');
    }
    res.json({ message: 'Logout successful' });
  });
});

export default router;
