// auth/site/script/main.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verifica se o usuário está logado na sessão
    const loggedUser = sessionStorage.getItem('usuarioLogado');
    if (!loggedUser) {
        window.location.href = '../login.html';
        return;
    }

    const sidebar = document.getElementById('sidebar');
    const iframe = document.getElementById('contentFrame');
    if (!sidebar || !iframe) return;

    // Mapeamento das páginas suportadas
    const PAGE_MAP = {
        'dashboard': 'pages/dashboard.html',
        'clientes': 'pages/clientes.html',
        'servicos': 'pages/servicos.html',
        'abrir_os': 'pages/abrir_os.html',
        'gerenciar_os': 'pages/gerenciar_os.html',
        'configuracoes': 'pages/configuracoes.html'
    };

    // Atualiza a seleção ativa no Sidebar
    const setActiveLink = (pageKey) => {
        const navLinks = sidebar.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            if (link.getAttribute('data-page') === pageKey) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    };

    // Navega para uma página e salva no hash da URL para suporte ao F5
    const navigateTo = (pageKey, forceReload = false) => {
        const targetUrl = PAGE_MAP[pageKey] || 'pages/dashboard.html';
        const currentSrc = iframe.getAttribute('src') || '';

        window.location.hash = `#${pageKey}`;
        setActiveLink(pageKey);
        sessionStorage.setItem('elias_active_page', pageKey);

        if (forceReload || !currentSrc.endsWith(targetUrl)) {
            iframe.src = targetUrl;
        }
    };

    // Listener para os cliques nos links do Sidebar
    const navLinks = sidebar.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && !href.includes('login.html')) {
                e.preventDefault();
                const pageKey = this.getAttribute('data-page');
                if (pageKey) {
                    navigateTo(pageKey);
                }
            }
        });
    });

    // Sincroniza quando o iframe mudar de página internamente
    iframe.addEventListener('load', () => {
        try {
            const iframePath = iframe.contentWindow.location.pathname;
            for (const [key, url] of Object.entries(PAGE_MAP)) {
                if (iframePath.endsWith(url) || iframePath.includes(key)) {
                    window.location.hash = `#${key}`;
                    setActiveLink(key);
                    sessionStorage.setItem('elias_active_page', key);
                    break;
                }
            }
        } catch (e) {
            // Caso ocorra restrição de cross-origin
        }
    });

    // INICIALIZAÇÃO / SUPORTE AO F5
    const initFromHashOrStorage = () => {
        const hash = window.location.hash.replace('#', '').trim();
        if (hash && PAGE_MAP[hash]) {
            navigateTo(hash, true);
        } else {
            const saved = sessionStorage.getItem('elias_active_page');
            if (saved && PAGE_MAP[saved]) {
                navigateTo(saved, true);
            } else {
                navigateTo('dashboard', true);
            }
        }
    };

    initFromHashOrStorage();
});