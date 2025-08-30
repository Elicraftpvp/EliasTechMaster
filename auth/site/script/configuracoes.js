document.addEventListener('DOMContentLoaded', () => {
    const iframe = document.getElementById('config-iframe');
    const tabs = document.querySelectorAll('#config-tabs .nav-link');

    // Função para ajustar a altura do iframe com base no seu conteúdo
    const adjustIframeHeight = () => {
        // Adiciona um pequeno delay para garantir que o conteúdo foi renderizado
        setTimeout(() => {
            if (iframe.contentWindow && iframe.contentWindow.document.body) {
                const newHeight = iframe.contentWindow.document.body.scrollHeight;
                iframe.style.height = newHeight + 'px';
            }
        }, 150);
    };

    // Ajusta a altura quando o iframe termina de carregar
    iframe.addEventListener('load', adjustIframeHeight);

    // Adiciona listener para cada aba
    tabs.forEach(tab => {
        tab.addEventListener('click', (event) => {
            event.preventDefault();
            const newSrc = event.target.getAttribute('data-iframe-src');
            if (iframe.src !== newSrc) {
                iframe.src = newSrc;
            }
        });
    });

    // Garante que a altura seja reajustada se a janela do navegador mudar de tamanho
    window.addEventListener('resize', adjustIframeHeight);
});