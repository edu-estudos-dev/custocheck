import express from 'express';
import * as userModel from '../models/users.js';
import * as resetModel from '../models/passwordReset.js';
import { sanitize, validateEmail, validatePassword } from '../utilities/validation.js';
import { withTransaction } from '../config/database.js';
import { loginLimiter, signupLimiter, passwordResetLimiter } from '../middleware/security.js';
import { logger } from '../observability/logger.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const router = express.Router();

// Troca o ID de sessão antes de autenticar (evita session fixation) e só
// então grava os dados do usuário na sessão nova. session.regenerate() apaga
// o csrfToken (era da sessão antiga), então recriamos e resincronizamos o
// cookie double-submit aqui — senão a próxima requisição falha o CSRF.
const regenerateSession = (req, res, data) =>
  new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      Object.assign(req.session, data);
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
      res.cookie('csrf_token', req.session.csrfToken, {
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      req.session.save((err2) => (err2 ? reject(err2) : resolve()));
    });
  });

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Usuário e senha obrigatórios' });
    }

    const loginSafe = sanitize(email).toLowerCase();
    const user = await userModel.getUserByLogin(loginSafe);

    if (!user || !user.ativo) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const match = await userModel.verifyPassword(senha, user.senha_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    await regenerateSession(req, res, {
      userId: user.id,
      contaId: user.conta_id,
      papel: user.papel,
    });

    if (req.accepts('html')) {
      return res.redirect('/dashboard');
    }
    res.json({ message: 'Login successful', userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login falhou' });
  }
});

router.post('/signup', signupLimiter, async (req, res) => {
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

    await regenerateSession(req, res, {
      userId: resultado.usuario.id,
      contaId: resultado.conta.id,
      papel: resultado.usuario.papel,
    });

    if (req.accepts('html')) {
      return res.redirect('/dashboard');
    }
    res.status(201).json({ message: 'Signup successful', userId: resultado.usuario.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Signup falhou' });
  }
});

router.post('/esqueci-senha', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Informe seu email' });
    }

    const emailSafe = sanitize(email).toLowerCase();
    const user = await userModel.getUserByEmail(emailSafe);

    // Resposta sempre igual, exista ou não a conta — evita enumeração de email.
    const resposta = {
      message: 'Se esse email existir na nossa base, enviamos um link de redefinição.',
    };

    if (user && user.ativo) {
      const token = await resetModel.createResetToken(user.id);
      const resetUrl = `${req.protocol}://${req.get('host')}/resetar-senha?token=${token}`;

      // Sem provedor de email configurado ainda: registra no log e,
      // fora de produção, devolve o link direto na resposta pra dar
      // pra testar o fluxo sem SMTP.
      logger.info({ userId: user.id, resetUrl }, 'Link de redefinição de senha gerado');
      if (process.env.NODE_ENV !== 'production') {
        resposta.devResetUrl = resetUrl;
      }
    }

    res.json(resposta);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Não foi possível processar o pedido' });
  }
});

router.post('/resetar-senha', passwordResetLimiter, async (req, res) => {
  try {
    const { token, senha } = req.body;

    if (!token || !senha) {
      return res.status(400).json({ error: 'Token e nova senha obrigatórios' });
    }

    if (!validatePassword(senha)) {
      return res.status(400).json({ error: 'Senha fraca' });
    }

    const usuarioId = await resetModel.consumeResetToken(token);
    if (!usuarioId) {
      return res.status(400).json({ error: 'Link inválido ou expirado' });
    }

    await userModel.updatePasswordById(usuarioId, senha);

    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Não foi possível redefinir a senha' });
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
