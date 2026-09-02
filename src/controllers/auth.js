import * as userModel from '../models/users.js';
import * as contaModel from '../models/contas.js';
import { sanitize, validateEmail, validatePassword } from '../utilities/validation.js';
import { withTransaction } from '../config/database.js';

export const signup = async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const nomeSafe = sanitize(nome);
    const emailSafe = sanitize(email).toLowerCase();

    if (!validateEmail(emailSafe)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    if (!validatePassword(senha)) {
      return res.status(400).json({ error: 'Password too weak' });
    }

    const existing = await userModel.getUserByEmail(emailSafe);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

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
        [conta.id, nomeSafe, emailSafe, await require('bcrypt').hash(senha, 10), 'dono']
      );

      return { conta, usuario: usuarioRes.rows[0] };
    });

    req.session.userId = resultado.usuario.id;
    req.session.contaId = resultado.conta.id;
    req.session.papel = resultado.usuario.papel;

    res.status(201).json({ message: 'Signup successful', userId: resultado.usuario.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Signup failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const emailSafe = sanitize(email).toLowerCase();
    const user = await userModel.getUserByEmail(emailSafe);

    if (!user || !user.ativo) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await userModel.verifyPassword(senha, user.senha_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.contaId = user.conta_id;
    req.session.papel = user.papel;

    res.json({ message: 'Login successful', userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }

    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
};
