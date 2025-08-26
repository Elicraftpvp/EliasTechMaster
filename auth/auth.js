// auth/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form'); 
    if (!loginForm) return;

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('login-error');
    const loginButton = document.getElementById('login-button');

    loginButton.addEventListener('click', async (e) => {
        e.preventDefault(); 
        
        errorDiv.classList.add('d-none');
        loginButton.disabled = true;
        loginButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Entrando...`;

        const email = emailInput.value;
        const senha = passwordInput.value;

        if (!email || !senha) {
            errorDiv.textContent = 'Por favor, preencha todos os campos.';
            errorDiv.classList.remove('d-none');
            loginButton.disabled = false;
            loginButton.textContent = 'Entrar';
            return;
        }

        try {
            // O caminho aqui é relativo à localização de login.html
            const response = await fetch(`./site/php/auth_api.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, senha })
            });
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro desconhecido');
            }
            
            if (result.success) {
                sessionStorage.setItem('usuarioLogado', JSON.stringify(result.usuario));
                // Redireciona para a página principal do sistema
                window.location.href = './site/index.html';
            }

        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('d-none');
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = 'Entrar';
        }
    });
});