// auth.js - Script exclusivo para a página de login

document.addEventListener('DOMContentLoaded', () => {
    // A função initLoginPage será chamada assim que o DOM da página de login estiver pronto.
    initLoginPage();
});

// ========================================================================
// |                             PÁGINA DE LOGIN                          |
// ========================================================================
function initLoginPage() {
    const loginForm = document.getElementById('login-form'); 
    if (!loginForm) return;

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('login-error');
    const loginButton = document.getElementById('login-button');

    // Adiciona um listener para o evento 'submit' do formulário, 
    // que também captura o clique no botão se o tipo for "submit",
    // ou para o clique do botão se o tipo for "button".
    const handleLogin = async (e) => {
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
            // O caminho para a API é relativo à localização do login.html
            const response = await fetch(`./site/php/auth_api.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, senha })
            });
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro desconhecido ao tentar fazer login.');
            }
            
            if (result.success) {
                // Armazena os dados do usuário na sessionStorage para uso nas outras páginas
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
    };

    loginForm.addEventListener('submit', handleLogin);
    loginButton.addEventListener('click', handleLogin);
}