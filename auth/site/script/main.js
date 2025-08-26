// site/script/main.js

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // 1. Verifica se o usuário está logado na sessão
    const loggedUser = sessionStorage.getItem('usuarioLogado');
    if (!loggedUser) {
        // Se não estiver logado, redireciona para a página de login
        window.location.href = '../login.html'; 
        return;
    }

    // 2. Lógica para marcar o link do menu como 'ativo' ao ser clicado
    const navLinks = sidebar.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Aplica a classe 'active' apenas se o link abrir no iframe
            if (this.getAttribute('target') === 'contentFrame') {
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
});