// auth/auth.js

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DE LOGIN ---
    const loginForm = document.getElementById('login-form'); 
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('login-error');
    const loginButton = document.getElementById('login-button');

    // --- ELEMENTOS DO MODAL ESQUECI SENHA ---
    const modalElement = document.getElementById('modalEsqueciSenha');
    const modalEsqueciSenha = modalElement ? new bootstrap.Modal(modalElement) : null;
    const selectUser = document.getElementById('reset-user-select');
    const inputNovaSenha = document.getElementById('reset-nova-senha');
    const inputConfirmaSenha = document.getElementById('reset-confirma-senha');
    const resetFeedback = document.getElementById('reset-feedback');
    const btnSalvarReset = document.getElementById('btn-salvar-reset');

    // ===================================================================
    // 1. FLUXO DE LOGIN
    // ===================================================================
    if (loginForm && loginButton) {
        loginButton.addEventListener('click', async (e) => {
            e.preventDefault(); 
            
            errorDiv.classList.add('d-none');
            loginButton.disabled = true;
            loginButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Entrando...`;

            const email = emailInput.value.trim();
            const senha = passwordInput.value;

            if (!email || !senha) {
                errorDiv.textContent = 'Por favor, preencha todos os campos.';
                errorDiv.classList.remove('d-none');
                loginButton.disabled = false;
                loginButton.innerHTML = `Acessar Sistema <i class="fas fa-arrow-right ms-2 small"></i>`;
                return;
            }

            try {
                const response = await fetch(`./site/php/auth_api.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, senha })
                });
                
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Erro ao realizar login.');
                }
                
                if (result.success) {
                    sessionStorage.setItem('usuarioLogado', JSON.stringify(result.usuario));
                    window.location.href = './site/index.html';
                }

            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('d-none');
            } finally {
                loginButton.disabled = false;
                loginButton.innerHTML = `Acessar Sistema <i class="fas fa-arrow-right ms-2 small"></i>`;
            }
        });
    }

    // ===================================================================
    // 2. FLUXO DE ESQUECI MINHA SENHA (RESET LOCAL)
    // ===================================================================
    
    // Carrega a lista de usuários sempre que o modal for aberto
    if (modalElement && selectUser) {
        modalElement.addEventListener('show.bs.modal', async () => {
            resetFeedback.classList.add('d-none');
            inputNovaSenha.value = '';
            inputConfirmaSenha.value = '';
            selectUser.innerHTML = `<option value="" disabled selected>Carregando usuários...</option>`;

            try {
                const response = await fetch(`./site/php/auth_api.php?acao=listar_usuarios`);
                const result = await response.json();

                if (!response.ok || !result.success) {
                    const msg = result.details ? `${result.error} (${result.details})` : (result.error || 'Não foi possível carregar a lista de usuários.');
                    throw new Error(msg);
                }

                if (!result.usuarios || result.usuarios.length === 0) {
                    selectUser.innerHTML = `<option value="" disabled>Nenhum usuário cadastrado</option>`;
                    return;
                }

                let options = `<option value="" disabled selected>-- Selecione o Usuário --</option>`;
                result.usuarios.forEach(user => {
                    options += `<option value="${user.id}" data-email="${user.email}">${user.nome} (${user.email})</option>`;
                });
                selectUser.innerHTML = options;

            } catch (error) {
                console.error(error);
                selectUser.innerHTML = `<option value="" disabled>Erro ao carregar usuários</option>`;
                mostrarFeedbackReset(error.message, 'danger');
            }
        });
    }

    // Salvar a nova senha
    if (btnSalvarReset) {
        btnSalvarReset.addEventListener('click', async () => {
            resetFeedback.classList.add('d-none');

            const usuarioId = selectUser.value;
            const novaSenha = inputNovaSenha.value;
            const confirmaSenha = inputConfirmaSenha.value;

            if (!usuarioId) {
                mostrarFeedbackReset('Por favor, selecione um usuário no dropdown.', 'warning');
                return;
            }

            if (!novaSenha) {
                mostrarFeedbackReset('Por favor, digite a nova senha.', 'warning');
                inputNovaSenha.focus();
                return;
            }

            if (novaSenha !== confirmaSenha) {
                mostrarFeedbackReset('As senhas não coincidem. Digite a mesma senha nos dois campos.', 'danger');
                inputConfirmaSenha.focus();
                return;
            }

            btnSalvarReset.disabled = true;
            btnSalvarReset.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Salvando...`;

            try {
                const response = await fetch(`./site/php/auth_api.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        acao: 'reset_senha',
                        usuario_id: usuarioId,
                        nova_senha: novaSenha
                    })
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || 'Erro ao redefinir a senha.');
                }

                mostrarFeedbackReset('Senha redefinida com sucesso! Você já pode entrar.', 'success');

                // Preenche o e-mail no formulário de login e limpa a senha
                if (result.usuario && result.usuario.email) {
                    emailInput.value = result.usuario.email;
                }
                passwordInput.value = '';

                // Fecha o modal após 1.2 segundos e foca no campo de senha
                setTimeout(() => {
                    if (modalEsqueciSenha) {
                        modalEsqueciSenha.hide();
                    }
                    passwordInput.focus();
                }, 1200);

            } catch (error) {
                console.error(error);
                mostrarFeedbackReset(error.message, 'danger');
            } finally {
                btnSalvarReset.disabled = false;
                btnSalvarReset.innerHTML = `<i class="fas fa-save me-1"></i>Salvar Nova Senha`;
            }
        });
    }

    function mostrarFeedbackReset(mensagem, tipo = 'danger') {
        resetFeedback.className = `alert alert-${tipo} py-2 small mb-3`;
        resetFeedback.textContent = mensagem;
        resetFeedback.classList.remove('d-none');
    }
});