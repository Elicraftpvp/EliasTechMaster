// site/script/dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    // --- Referências aos elementos da página ---
    const countOsAbertas = document.getElementById('count-os-abertas');
    const countOsAndamento = document.getElementById('count-os-andamento');
    const countOsFinalizadas = document.getElementById('count-os-finalizadas');
    const countClientes = document.getElementById('count-clientes');
    const listaOsAbertas = document.getElementById('lista-os-abertas');
    const listaOsAndamento = document.getElementById('lista-os-andamento');
    const listaOsFinalizadas = document.getElementById('lista-os-finalizadas');
    const listaClientes = document.getElementById('lista-clientes');

    try {
        // --- Carrega todos os dados necessários em paralelo ---
        const [dashboardResponse, osResponse, clientesResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/dashboard_api.php`),
            fetch(`${API_BASE_URL}/os_api.php`),
            fetch(`${API_BASE_URL}/clientes_api.php`)
        ]);

        if (!dashboardResponse.ok || !osResponse.ok || !clientesResponse.ok) {
            throw new Error('Falha ao carregar um ou mais recursos da API.');
        }

        const dashboardData = await dashboardResponse.json();
        const ordensDeServico = await osResponse.json();
        const clientes = await clientesResponse.json();
        
        // --- 1. Atualiza os contadores nos botões ---
        countOsAbertas.textContent = dashboardData.os_abertas;
        countOsFinalizadas.textContent = dashboardData.os_finalizadas;
        countClientes.textContent = dashboardData.total_clientes;

        // --- 2. Popula a lista de OS Abertas ---
        const osAbertas = ordensDeServico.filter(os => ['Aberta', 'Em Andamento', 'Aguardando Peças'].includes(os.status));
        listaOsAbertas.innerHTML = ''; // Limpa o spinner
        if (osAbertas.length > 0) {
            osAbertas.slice(-5).reverse().forEach(os => {
                const item = `<li class="list-group-item"><strong>OS #${os.id}</strong> - ${os.cliente_nome}<br><small class="text-muted">${os.equipamento} - Status: ${os.status}</small></li>`;
                listaOsAbertas.innerHTML += item;
            });
        } else {
            listaOsAbertas.innerHTML = '<li class="list-group-item text-center">Nenhuma OS aberta no momento.</li>';
        }

        // --- 3.1. Popula a lista de OS em Andamento ---
        const osEmAndamento = ordensDeServico.filter(os => os.status === 'Em Andamento');
        countOsAndamento.textContent = osEmAndamento.length;
        listaOsAndamento.innerHTML = '';
        if (osEmAndamento.length > 0) {
            osEmAndamento.slice(-5).reverse().forEach(os => {
                const item = `<li class="list-group-item"><strong>OS #${os.id}</strong> - ${os.cliente_nome}<br><small class="text-muted">${os.equipamento}</small></li>`;
                listaOsAndamento.innerHTML += item;
            });
        } else {
            listaOsAndamento.innerHTML = '<li class="list-group-item text-center">Nenhuma OS em andamento.</li>';
        }

        // --- 3. Popula a lista de OS Finalizadas ---
        const osFinalizadas = ordensDeServico.filter(os => os.status === 'Concluída');
        listaOsFinalizadas.innerHTML = '';
        if (osFinalizadas.length > 0) {
            osFinalizadas.slice(-5).reverse().forEach(os => {
                const dataSaida = new Date(os.data_saida).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                const item = `<li class="list-group-item"><strong>OS #${os.id}</strong> - ${os.cliente_nome}<br><small class="text-muted">${os.equipamento} - Finalizada em: ${dataSaida}</small></li>`;
                listaOsFinalizadas.innerHTML += item;
            });
        } else {
            listaOsFinalizadas.innerHTML = '<li class="list-group-item text-center">Nenhuma OS foi finalizada ainda.</li>';
        }
        
        // --- 4. Popula a lista de Últimos Clientes ---
        listaClientes.innerHTML = '';
        if (clientes.length > 0) {
            clientes.slice(-5).reverse().forEach(cliente => {
                const item = `<li class="list-group-item"><strong>${cliente.nome}</strong><br><small class="text-muted">${cliente.telefone || 'Telefone não informado'}</small></li>`;
                listaClientes.innerHTML += item;
            });
        } else {
            listaClientes.innerHTML = '<li class="list-group-item text-center">Nenhum cliente cadastrado.</li>';
        }

    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        const errorMsg = '<li class="list-group-item text-center text-danger">Erro ao carregar dados.</li>';
        listaOsAbertas.innerHTML = errorMsg;
        listaOsAndamento.innerHTML = errorMsg;
        listaOsFinalizadas.innerHTML = errorMsg;
        listaClientes.innerHTML = errorMsg;
    }
    
    // --- 5. Adiciona a lógica de navegação aos botões ---
    const navigateTo = (selector) => {
        try {
            const link = window.parent.document.querySelector(selector);
            if (link) link.click();
            else console.error(`Link de navegação não encontrado: ${selector}`);
        } catch(e) {
            console.error("Erro ao tentar navegar. Certifique-se que a página está dentro de um iframe.", e);
        }
    };
    
    document.getElementById('btn-nav-os-abertas').addEventListener('click', (e) => { e.preventDefault(); navigateTo('a[href="pages/gerenciar_os.html"]'); });
    document.getElementById('btn-nav-os-andamento').addEventListener('click', (e) => { e.preventDefault(); navigateTo('a[href="pages/gerenciar_os.html"]'); });
    document.getElementById('btn-nav-os-finalizadas').addEventListener('click', (e) => { e.preventDefault(); navigateTo('a[href="pages/gerenciar_os.html"]'); });
    document.getElementById('btn-nav-clientes').addEventListener('click', (e) => { e.preventDefault(); navigateTo('a[href="pages/clientes.html"]'); });
});