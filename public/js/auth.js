// Formulários de autenticação: login, cadastro, esqueci/resetar senha.
(() => {
  document.querySelectorAll('.lp-password-toggle').forEach((btn) => {
    const input = document.getElementById(btn.dataset.togglePassword);
    if (!input) return;
    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.classList.toggle('is-visible', show);
      btn.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
    });
  });

  const errorEl = document.getElementById('formError');
  const successEl = document.getElementById('formSuccess');

  const showError = (msg) => {
    if (successEl) successEl.classList.remove('is-visible');
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.classList.add('is-visible');
  };

  const showSuccess = (msg) => {
    if (errorEl) errorEl.classList.remove('is-visible');
    if (!successEl) return;
    successEl.innerHTML = msg;
    successEl.classList.add('is-visible');
  };

  const clearMessages = () => {
    if (errorEl) errorEl.classList.remove('is-visible');
    if (successEl) successEl.classList.remove('is-visible');
  };

  const withLoading = async (btn, fn) => {
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Aguarde…';
    try {
      await fn();
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  };

  const postJson = async (url, body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-Token': window.csrfToken,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  };

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessages();
      const submitBtn = document.getElementById('submitBtn');
      await withLoading(submitBtn, async () => {
        const { ok, data } = await postJson('/auth/login', {
          email: document.getElementById('email').value,
          senha: document.getElementById('password').value,
        });
        if (ok) {
          window.location.href = '/dashboard';
        } else {
          showError(data.error || 'Não foi possível entrar');
        }
      });
    });
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessages();
      const submitBtn = document.getElementById('submitBtn');
      await withLoading(submitBtn, async () => {
        const { ok, data } = await postJson('/auth/signup', {
          nome: document.getElementById('name').value,
          email: document.getElementById('email').value,
          senha: document.getElementById('password').value,
        });
        if (ok) {
          window.location.href = '/dashboard';
        } else {
          showError(data.error || 'Não foi possível criar a conta');
        }
      });
    });
  }

  const forgotForm = document.getElementById('forgotForm');
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessages();
      const submitBtn = document.getElementById('submitBtn');
      await withLoading(submitBtn, async () => {
        const { ok, data } = await postJson('/auth/esqueci-senha', {
          email: document.getElementById('email').value,
        });
        if (ok) {
          let msg = data.message;
          if (data.devResetUrl) {
            msg += `<div class="lp-auth-dev-link">Modo dev (sem envio de email configurado): <a href="${data.devResetUrl}" style="color:inherit;">${data.devResetUrl}</a></div>`;
          }
          showSuccess(msg);
          forgotForm.reset();
        } else {
          showError(data.error || 'Não foi possível processar o pedido');
        }
      });
    });
  }

  const resetForm = document.getElementById('resetForm');
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessages();
      const senha = document.getElementById('password').value;
      const senhaConfirm = document.getElementById('passwordConfirm').value;

      if (senha !== senhaConfirm) {
        showError('As senhas não coincidem');
        return;
      }

      const submitBtn = document.getElementById('submitBtn');
      await withLoading(submitBtn, async () => {
        const { ok, data } = await postJson('/auth/resetar-senha', {
          token: document.getElementById('token').value,
          senha,
        });
        if (ok) {
          showSuccess('Senha atualizada. Redirecionando para o login…');
          resetForm.reset();
          setTimeout(() => {
            window.location.href = '/login';
          }, 1800);
        } else {
          showError(data.error || 'Não foi possível redefinir a senha');
        }
      });
    });
  }
})();
