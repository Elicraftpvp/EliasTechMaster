// auth/site/script/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos KPI ---
    const countOsAbertas = document.getElementById('count-os-abertas');
    const countOsAndamento = document.getElementById('count-os-andamento');
    const countOsFinalizadas = document.getElementById('count-os-finalizadas');
    const countClientes = document.getElementById('count-clientes');

    // --- Elementos Financeiros ---
    const valCaixaMes = document.getElementById('val-caixa-mes');
    const valCaixaAno = document.getElementById('val-caixa-ano');
    const valCaixaTotal = document.getElementById('val-caixa-total');

    // --- Containers de Feed ---
    const feedOsContainer = document.getElementById('feed-os-container');
    const feedClientesContainer = document.getElementById('feed-clientes-container');
    const btnRefresh = document.getElementById('btn-refresh-dashboard');
    const refreshIcon = document.getElementById('refresh-icon');

    // Estado local
    let ordensDeServicoData = [];
    let clientesData = [];
    let filtroAtual = 'todas';

    // Formatação de Moeda
    const formatBRL = (valor) => {
        return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Animação CountUp para valores numéricos e monetários
    const animateCounter = (element, targetValue, isCurrency = false, duration = 1200) => {
        if (!element) return;
        const startTime = performance.now();
        const startValue = 0;
        const target = Number(targetValue) || 0;

        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Curva easeOutExpo
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const currentValue = startValue + (target - startValue) * eased;

            if (isCurrency) {
                element.textContent = formatBRL(currentValue);
            } else {
                element.textContent = Math.round(currentValue);
            }

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                if (isCurrency) element.textContent = formatBRL(target);
                else element.textContent = target;
            }
        };
        requestAnimationFrame(update);
    };

    // Helper de data amigável
    const formatarData = (dataStr) => {
        if (!dataStr || dataStr === '01/01/1970' || dataStr.startsWith('1970')) return 'Data não informada';
        try {
            const dataObj = new Date(dataStr);
            if (isNaN(dataObj.getTime())) return dataStr;
            return dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            return dataStr;
        }
    };

    // Helper de ícone por tipo de equipamento
    const getEquipamentoIcon = (equipamento = '') => {
        const eq = (equipamento || '').toLowerCase();
        if (eq.includes('notebook') || eq.includes('laptop') || eq.includes('macbook')) return 'fa-laptop';
        if (eq.includes('iphone') || eq.includes('celular') || eq.includes('smartphone') || eq.includes('galaxy') || eq.includes('xiaomi')) return 'fa-mobile-screen-button';
        if (eq.includes('tablet') || eq.includes('ipad')) return 'fa-tablet-screen-button';
        if (eq.includes('impressora') || eq.includes('plotter')) return 'fa-print';
        if (eq.includes('console') || eq.includes('ps5') || eq.includes('ps4') || eq.includes('xbox') || eq.includes('switch')) return 'fa-gamepad';
        return 'fa-desktop';
    };

    // Helper de badge de status
    const getStatusBadge = (status) => {
        switch (status) {
            case 'Aberta':
                return '<span class="status-chip status-chip-aberta"><i class="fas fa-folder-open me-1"></i>Aberta</span>';
            case 'Em Andamento':
                return '<span class="status-chip status-chip-andamento"><i class="fas fa-screwdriver-wrench me-1"></i>Em Andamento</span>';
            case 'Aguardando Peças':
                return '<span class="status-chip status-chip-aguardando"><i class="fas fa-hourglass-half me-1"></i>Aguardando Peças</span>';
            case 'Concluída':
                return '<span class="status-chip status-chip-concluida"><i class="fas fa-circle-check me-1"></i>Concluída</span>';
            case 'Cancelado':
            case 'Cancelada':
                return '<span class="status-chip status-chip-cancelada"><i class="fas fa-ban me-1"></i>Cancelada</span>';
            default:
                return `<span class="status-chip status-chip-default">${status || 'Pendente'}</span>`;
        }
    };

    // Renderizar Lista de Ordens de Serviço
    const renderizarFeedOs = () => {
        if (!feedOsContainer) return;

        let listaFiltrada = [...ordensDeServicoData];
        if (filtroAtual === 'abertas') {
            listaFiltrada = listaFiltrada.filter(os => ['Aberta', 'Aguardando Peças'].includes(os.status));
        } else if (filtroAtual === 'andamento') {
            listaFiltrada = listaFiltrada.filter(os => os.status === 'Em Andamento');
        } else if (filtroAtual === 'concluidas') {
            listaFiltrada = listaFiltrada.filter(os => os.status === 'Concluída');
        }

        // Limita aos 8 mais recentes
        const exibicao = listaFiltrada.slice(0, 8);

        if (exibicao.length === 0) {
            feedOsContainer.innerHTML = `
                <div class="empty-state-box py-5 text-center">
                    <div class="empty-state-icon mb-2">
                        <i class="fas fa-inbox text-muted fs-2"></i>
                    </div>
                    <h6 class="text-muted fw-bold mb-1">Nenhuma Ordem de Serviço encontrada</h6>
                    <p class="text-muted small mb-0">Não há registros para o filtro selecionado (${filtroAtual}).</p>
                </div>
            `;
            return;
        }

        feedOsContainer.innerHTML = exibicao.map(os => {
            const eqIcon = getEquipamentoIcon(os.equipamento);
            const dataExibicao = os.status === 'Concluída' && os.data_saida ? os.data_saida : (os.data_entrada || os.data_abertura);
            const valorTotal = formatBRL(os.valor_total || 0);
            const osNumero = String(os.id).padStart(4, '0');

            return `
                <div class="os-feed-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center p-3 border-bottom" role="button" data-os-id="${os.id}">
                    <div class="d-flex align-items-start gap-3 mb-2 mb-sm-0">
                        <div class="os-item-icon-box">
                            <i class="fas ${eqIcon}"></i>
                        </div>
                        <div>
                            <div class="d-flex align-items-center gap-2 flex-wrap">
                                <span class="os-item-code">OS #${osNumero}</span>
                                <span class="os-item-client">${os.cliente_nome || 'Cliente não identificado'}</span>
                            </div>
                            <div class="os-item-equip text-muted small mt-1">
                                <i class="fas ${eqIcon} me-1 text-secondary"></i>${os.equipamento || 'Equipamento não especificado'}
                            </div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between justify-content-sm-end gap-3">
                        <div class="text-sm-end">
                            <div class="os-item-value text-dark fw-bold">${valorTotal}</div>
                            <small class="text-muted d-block" style="font-size: 11px;">
                                <i class="fas fa-clock me-1"></i>${formatarData(dataExibicao)}
                            </small>
                        </div>
                        <div>
                            ${getStatusBadge(os.status)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Eventos de clique nos itens da lista para navegar
        feedOsContainer.querySelectorAll('.os-feed-item').forEach(item => {
            item.addEventListener('click', () => {
                navigateTo('a[href="pages/gerenciar_os.html"]');
            });
        });
    };

    // Renderizar Lista de Clientes Recentes
    const renderizarFeedClientes = () => {
        if (!feedClientesContainer) return;

        const ultimosClientes = clientesData.slice(0, 5);

        if (ultimosClientes.length === 0) {
            feedClientesContainer.innerHTML = `
                <div class="empty-state-box py-4 text-center">
                    <p class="text-muted small mb-0">Nenhum cliente cadastrado no momento.</p>
                </div>
            `;
            return;
        }

        feedClientesContainer.innerHTML = ultimosClientes.map(cliente => {
            const inicial = (cliente.nome || 'C').charAt(0).toUpperCase();
            return `
                <div class="client-feed-item d-flex align-items-center justify-content-between p-3 border-bottom" role="button">
                    <div class="d-flex align-items-center gap-3">
                        <div class="client-avatar-circle">
                            ${inicial}
                        </div>
                        <div>
                            <div class="fw-bold text-dark fs-6">${cliente.nome}</div>
                            <div class="text-muted small">
                                <i class="fas fa-phone me-1 text-secondary"></i>${cliente.telefone || 'Telefone não informado'}
                            </div>
                        </div>
                    </div>
                    <div>
                        <span class="badge bg-light text-secondary border px-2 py-1">
                            <i class="fas fa-user-check me-1 text-success"></i>Ativo
                        </span>
                    </div>
                </div>
            `;
        }).join('');

        feedClientesContainer.querySelectorAll('.client-feed-item').forEach(item => {
            item.addEventListener('click', () => {
                navigateTo('a[href="pages/clientes.html"]');
            });
        });
    };

    // Carregar todos os dados do Dashboard
    const carregarDashboard = async () => {
        if (refreshIcon) refreshIcon.classList.add('fa-spin');

        try {
            const [dashboardRes, osRes, clientesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/dashboard_api.php`),
                fetch(`${API_BASE_URL}/os_api.php`),
                fetch(`${API_BASE_URL}/clientes_api.php`)
            ]);

            if (!dashboardRes.ok || !osRes.ok || !clientesRes.ok) {
                throw new Error('Falha ao carregar dados do servidor.');
            }

            const dashboardData = await dashboardRes.json();
            ordensDeServicoData = await osRes.json();
            clientesData = await clientesRes.json();

            // 1. Atualizar KPIs do Topo
            animateCounter(countOsAbertas, dashboardData.os_abertas || 0);
            animateCounter(countOsAndamento, dashboardData.os_andamento || 0);
            animateCounter(countOsFinalizadas, dashboardData.os_finalizadas || 0);
            animateCounter(countClientes, dashboardData.total_clientes || 0);

            // 2. Atualizar Painel Financeiro
            if (dashboardData.financeiro) {
                const fin = dashboardData.financeiro;
                animateCounter(valCaixaMes, fin.total_mes, true, 1400);
                animateCounter(valCaixaAno, fin.total_ano, true, 1600);
                animateCounter(valCaixaTotal, fin.total_geral, true, 1800);
            }

            // 3. Renderizar Listas
            renderizarFeedOs();
            renderizarFeedClientes();

        } catch (error) {
            console.error('Erro ao carregar Dashboard:', error);
            if (feedOsContainer) {
                feedOsContainer.innerHTML = `
                    <div class="p-4 text-center text-danger">
                        <i class="fas fa-triangle-exclamation mb-2 fs-4"></i>
                        <div>Falha ao carregar dados do servidor. Verifique a conexão com o banco.</div>
                    </div>
                `;
            }
        } finally {
            if (refreshIcon) refreshIcon.classList.remove('fa-spin');
        }
    };

    // Navegação entre abas/páginas através do frame principal
    const navigateTo = (selector) => {
        try {
            const link = window.parent.document.querySelector(selector);
            if (link) {
                link.click();
            } else {
                console.warn(`Seletor não encontrado: ${selector}`);
            }
        } catch (e) {
            console.error("Erro ao navegar:", e);
        }
    };

    // Filtros de OS (Abas)
    const filterTabs = document.getElementById('os-filter-tabs');
    if (filterTabs) {
        filterTabs.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterTabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filtroAtual = btn.getAttribute('data-filter') || 'todas';
                renderizarFeedOs();
            });
        });
    }

    // Eventos de clique nos botões KPI do topo
    document.getElementById('kpi-btn-abertas')?.addEventListener('click', () => navigateTo('a[href="pages/gerenciar_os.html"]'));
    document.getElementById('kpi-btn-andamento')?.addEventListener('click', () => navigateTo('a[href="pages/gerenciar_os.html"]'));
    document.getElementById('kpi-btn-finalizadas')?.addEventListener('click', () => navigateTo('a[href="pages/gerenciar_os.html"]'));
    document.getElementById('kpi-btn-clientes')?.addEventListener('click', () => navigateTo('a[href="pages/clientes.html"]'));

    // Ações Rápidas
    document.getElementById('quick-btn-abrir-os')?.addEventListener('click', (e) => { e.preventDefault(); navigateTo('a[href="pages/abrir_os.html"]'); });
    document.getElementById('quick-btn-novo-cliente')?.addEventListener('click', (e) => { e.preventDefault(); navigateTo('a[href="pages/clientes.html"]'); });
    document.getElementById('quick-btn-gerenciar-os')?.addEventListener('click', (e) => { e.preventDefault(); navigateTo('a[href="pages/gerenciar_os.html"]'); });
    document.getElementById('quick-btn-config')?.addEventListener('click', (e) => { e.preventDefault(); navigateTo('a[href="pages/configuracoes.html"]'); });
    document.getElementById('link-ver-todos-clientes')?.addEventListener('click', (e) => { e.preventDefault(); navigateTo('a[href="pages/clientes.html"]'); });

    // Botão de Atualizar
    btnRefresh?.addEventListener('click', carregarDashboard);

    // Inicialização
    carregarDashboard();
});