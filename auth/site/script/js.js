// Define o caminho base RELATIVO para todas as chamadas de API
const API_BASE_URL = '../php';

document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DO MENU LATERAL (PARA index.html) ---
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        // Lógica de proteção de rota: se não houver usuário no sessionStorage, volta para o login
        const loggedUser = sessionStorage.getItem('usuarioLogado');
        if (!loggedUser) {
            window.location.href = '../../login.html'; // Ajuste o caminho se necessário
            return;
        }

        const navLinks = sidebar.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (this.getAttribute('target') === 'contentFrame') {
                    navLinks.forEach(l => l.classList.remove('active'));
                    this.classList.add('active');
                }
            });
        });
    }

    // --- ROTEAMENTO DE LÓGICA PARA PÁGINAS INTERNAS ---
    const pageId = document.body.id;
    switch (pageId) {
        case 'page-login': initLoginPage(); break; // <-- NOVA ROTA ADICIONADA
        case 'page-dashboard': initDashboardPage(); break;
        case 'page-servicos': initServicosPage(); break;
        case 'page-clientes': initClientesPage(); break;
        case 'page-gerenciar-os': initGerenciarOsPage(); break;
        case 'page-abrir-os': initAbrirOsPage(); break;
    }
});

// ========================================================================
// |                             PÁGINA DE LOGIN                          |
// ========================================================================
function initLoginPage() {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('login-error');
    const loginButton = document.getElementById('login-button');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Impede o envio padrão do formulário
        errorDiv.classList.add('d-none'); // Esconde erros anteriores
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
            const response = await fetch(`${API_BASE_URL}/auth_api.php`, {
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
                // Salva os dados do usuário na sessão do navegador
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
}


// ========================================================================
// |                             PÁGINA DASHBOARD                         |
// ========================================================================
async function initDashboardPage() {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard_api.php`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        document.getElementById('card-os-abertas').textContent = data.os_abertas;
        document.getElementById('card-os-finalizadas').textContent = data.os_finalizadas;
        document.getElementById('card-clientes').textContent = data.total_clientes;
    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
    }
}

// ========================================================================
// |                             PÁGINA DE SERVIÇOS                       |
// ========================================================================
function initServicosPage() {
    const tableBody = document.getElementById('servicos-table-body');
    const modal = new bootstrap.Modal(document.getElementById('servicoModal'));
    const form = document.getElementById('form-servico');
    const modalTitle = document.getElementById('servicoModalLabel');
    const salvarBtn = document.getElementById('salvar-servico-btn');
    let editMode = false;
    let editId = null;

    const carregarServicos = async () => {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm"></div></td></tr>`;
        try {
            const response = await fetch(`${API_BASE_URL}/servicos_api.php`);
            const servicos = await response.json();
            tableBody.innerHTML = '';
            if (servicos.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Nenhum serviço cadastrado.</td></tr>`;
                return;
            }
            servicos.forEach(s => {
                const valorFormatado = parseFloat(s.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                const row = `
                    <tr>
                        <td>${s.id}</td>
                        <td>${s.nome}</td>
                        <td>${s.descricao || ''}</td>
                        <td>${valorFormatado}</td>
                        <td>
                            <button class="btn btn-sm btn-warning btn-edit" data-id="${s.id}" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-danger btn-delete" data-id="${s.id}" title="Excluir"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
                tableBody.innerHTML += row;
            });
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Erro ao carregar serviços.</td></tr>`;
            console.error(error);
        }
    };

    document.querySelector('button[data-bs-target="#servicoModal"]').addEventListener('click', () => {
        editMode = false;
        editId = null;
        modalTitle.textContent = 'Adicionar Novo Serviço';
        form.reset();
    });

    salvarBtn.addEventListener('click', async () => {
        const data = {
            nome: document.getElementById('servico_nome').value,
            descricao: document.getElementById('servico_descricao').value,
            valor: document.getElementById('servico_valor').value,
        };
        
        const url = editMode ? `${API_BASE_URL}/servicos_api.php?id=${editId}` : `${API_BASE_URL}/servicos_api.php`;
        const method = editMode ? 'PUT' : 'POST';

        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        modal.hide();
        carregarServicos();
    });

    tableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        
        if (target.classList.contains('btn-edit')) {
            const response = await fetch(`${API_BASE_URL}/servicos_api.php?id=${id}`);
            const servico = await response.json();
            
            editMode = true;
            editId = id;
            modalTitle.textContent = 'Editar Serviço';
            document.getElementById('servico_nome').value = servico.nome;
            document.getElementById('servico_descricao').value = servico.descricao;
            document.getElementById('servico_valor').value = servico.valor;
            modal.show();
        }

        if (target.classList.contains('btn-delete')) {
            if (confirm('Deseja excluir este serviço?')) {
                await fetch(`${API_BASE_URL}/servicos_api.php?id=${id}`, { method: 'DELETE' });
                carregarServicos();
            }
        }
    });

    carregarServicos();
}

// ========================================================================
// |                             PÁGINA DE CLIENTES                       |
// ========================================================================
function initClientesPage() {
    const tableBody = document.getElementById('clientes-table-body');
    const modal = new bootstrap.Modal(document.getElementById('clienteModal'));
    const form = document.getElementById('form-cliente');
    const modalTitle = document.getElementById('clienteModalLabel');
    let editMode = false;
    let editId = null;

    const carregarClientes = async () => {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center"><div class="spinner-border spinner-border-sm"></div></td></tr>`;
        try {
            const response = await fetch(`${API_BASE_URL}/clientes_api.php`);
            const clientes = await response.json();
            tableBody.innerHTML = '';
            if (clientes.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center">Nenhum cliente cadastrado.</td></tr>`;
                return;
            }
            clientes.forEach(c => {
                const row = `
                    <tr>
                        <td>${c.id}</td>
                        <td>${c.nome}</td>
                        <td>${c.cpf_cnpj || ''}</td>
                        <td>${c.telefone || ''}</td>
                        <td>${c.email || ''}</td>
                        <td>
                            <button class="btn btn-sm btn-warning btn-edit" data-id="${c.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-danger btn-delete" data-id="${c.id}"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
                tableBody.innerHTML += row;
            });
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center">Erro ao carregar clientes.</td></tr>`;
            console.error(error);
        }
    };

    document.getElementById('salvar-cliente-btn').addEventListener('click', async () => {
        const data = {
            nome: document.getElementById('cliente_nome').value,
            cpf_cnpj: document.getElementById('cliente_cpf_cnpj').value,
            telefone: document.getElementById('cliente_telefone').value,
            email: document.getElementById('cliente_email').value,
            endereco: document.getElementById('cliente_endereco').value,
        };
        
        const url = editMode ? `${API_BASE_URL}/clientes_api.php?id=${editId}` : `${API_BASE_URL}/clientes_api.php`;
        const method = editMode ? 'PUT' : 'POST';

        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        modal.hide();
        carregarClientes();
    });

    tableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        if (target.classList.contains('btn-delete')) {
            if (confirm('Deseja excluir este cliente?')) {
                await fetch(`${API_BASE_URL}/clientes_api.php?id=${id}`, { method: 'DELETE' });
                carregarClientes();
            }
        }
        // Lógica de edição para clientes pode ser adicionada aqui
    });

    carregarClientes();
}


// ========================================================================
// |                          PÁGINA GERENCIAR OS                         |
// ========================================================================
async function initGerenciarOsPage() {
    const tableBody = document.getElementById('os-table-body');
    const editModalElement = document.getElementById('editOsModal');
    if (!editModalElement) return;
    const editModal = new bootstrap.Modal(editModalElement);

    // --- Referências aos Elementos do Modal ---
    const editOsIdInput = document.getElementById('edit_os_id');
    const osIdModalSpan = document.getElementById('os-id-modal');
    const editClienteNomeInput = document.getElementById('edit_cliente_nome');
    const editClienteTelefoneInput = document.getElementById('edit_cliente_telefone');
    const editClienteEmailInput = document.getElementById('edit_cliente_email');
    const editEquipamentoInput = document.getElementById('edit_equipamento');
    const editStatusSelect = document.getElementById('edit_status');
    const editProblemaTextarea = document.getElementById('edit_problema');
    const editLaudoTextarea = document.getElementById('edit_laudo');
    const editServicosSelect = document.getElementById('edit-servicos-select');
    const editServicosTableBody = document.getElementById('edit-servicos-selecionados-body');
    const editTotalElement = document.getElementById('edit-total-os');
    const btnAdicionarServico = document.getElementById('edit-add-servico-btn');
    const btnSalvarAlteracoes = document.getElementById('salvar-edit-os-btn');

    let listaDeServicos = []; // Cache para a lista de serviços

    // --- Função auxiliar para atualizar totais no modal de edição ---
    const updateEditTotals = () => {
        let total = 0;
        editServicosTableBody.querySelectorAll('tr').forEach(row => {
            const qtd = parseInt(row.querySelector('.qtd-servico').value) || 0;
            const valorUnitario = parseFloat(row.dataset.valor);
            const subtotal = qtd * valorUnitario;
            row.querySelector('.subtotal').innerText = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            total += subtotal;
        });
        editTotalElement.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // --- Função para carregar serviços no dropdown do modal ---
    const carregarServicosParaModal = async () => {
        if (listaDeServicos.length > 0) return; // Evita recarregar
        try {
            const response = await fetch(`${API_BASE_URL}/servicos_api.php`);
            listaDeServicos = await response.json();
            editServicosSelect.innerHTML = '<option selected disabled>Selecione um serviço...</option>';
            listaDeServicos.forEach(s => {
                const valorF = parseFloat(s.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                editServicosSelect.innerHTML += `<option value="${s.id}">${s.nome} - ${valorF}</option>`;
            });
        } catch (error) {
            console.error("Erro ao carregar serviços para o modal:", error);
        }
    };
    
    // --- Lógica para adicionar/remover serviços no modal ---
    btnAdicionarServico.addEventListener('click', () => {
        const servicoId = editServicosSelect.value;
        if (!servicoId || servicoId === 'Selecione um serviço...') return;

        const servico = listaDeServicos.find(s => s.id == servicoId);
        if (editServicosTableBody.querySelector(`tr[data-id="${servico.id}"]`)) {
            alert('Este serviço já foi adicionado.');
            return;
        }
        
        const valorFormatado = parseFloat(servico.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const row = `
            <tr data-id="${servico.id}" data-valor="${servico.valor}">
                <td>${servico.nome}</td>
                <td><input type="number" class="form-control form-control-sm qtd-servico" value="1" min="1"></td>
                <td>${valorFormatado}</td>
                <td class="subtotal">${valorFormatado}</td>
                <td><button type="button" class="btn btn-danger btn-sm remover-servico">X</button></td>
            </tr>`;
        editServicosTableBody.innerHTML += row;
        updateEditTotals();
    });

    editServicosTableBody.addEventListener('input', e => {
        if (e.target.classList.contains('qtd-servico')) updateEditTotals();
    });

    editServicosTableBody.addEventListener('click', e => {
        if (e.target.classList.contains('remover-servico')) {
            e.target.closest('tr').remove();
            updateEditTotals();
        }
    });

    // --- Função principal para carregar a lista de OS ---
    const carregarOrdens = async () => {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center"><div class="spinner-border spinner-border-sm"></div></td></tr>`;
        try {
            const response = await fetch(`${API_BASE_URL}/os_api.php`);
            const ordens = await response.json();
            tableBody.innerHTML = '';
            if(ordens.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="7" class="text-center">Nenhuma Ordem de Serviço encontrada.</td></tr>`;
                return;
            }
            ordens.forEach(os => {
                const statusMap = { 'Aberta': 'bg-primary', 'Em Andamento': 'bg-warning text-dark', 'Aguardando Peças': 'bg-info text-dark', 'Concluída': 'bg-success', 'Cancelada': 'bg-danger' };
                const statusClass = statusMap[os.status] || 'bg-secondary';
                const dataEntrada = new Date(os.data_entrada).toLocaleDateString('pt-BR');
                const valorTotal = parseFloat(os.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                const row = `
                    <tr data-os-id="${os.id}">
                        <td>${os.id}</td>
                        <td>${os.cliente_nome}</td>
                        <td>${os.equipamento}</td>
                        <td>${dataEntrada}</td>
                        <td><span class="badge ${statusClass}">${os.status}</span></td>
                        <td>${valorTotal}</td>
                        <td>
                            <button class="btn btn-sm btn-info btn-visualizar" title="Visualizar/Baixar PDF"><i class="fas fa-file-pdf"></i></button>
                            <button class="btn btn-sm btn-warning btn-edit" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-danger btn-delete" title="Excluir"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center">Erro ao carregar Ordens de Serviço.</td></tr>`;
            console.error(error);
        }
    };
    
    // --- Event listener para as ações na tabela principal (Visualizar, Editar, Excluir) ---
    tableBody.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const row = button.closest('tr');
        const osId = row.dataset.osId;

        // --- Lidar com Download de PDF ---
        if (button.classList.contains('btn-visualizar')) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            try {
                // Modificado para usar GET e passar o ID na URL
                const response = await fetch(`${API_BASE_URL}/gerar_pdf.php?id=${osId}`);
                const result = await response.json();
                if (result.success) {
                    const pdfPathForBrowser = `../php/pdfs/${result.fileName}`;
                    window.open(pdfPathForBrowser, '_blank');
                } else {
                    alert('Erro ao gerar o PDF: ' + result.error);
                }
            } catch (error) {
                alert('Ocorreu um erro de comunicação ao tentar gerar o PDF.');
                console.error(error);
            } finally {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-file-pdf"></i>';
            }
        }

        // --- Lidar com Edição de OS ---
        if (button.classList.contains('btn-edit')) {
            try {
                // Busca os dados completos da OS, incluindo serviços
                const response = await fetch(`${API_BASE_URL}/os_api.php?id=${osId}`);
                if (!response.ok) throw new Error('Não foi possível carregar os dados da OS.');
                const osData = await response.json();
                
                // Preenche o modal
                editOsIdInput.value = osData.id;
                osIdModalSpan.textContent = osData.id;
                editClienteNomeInput.value = osData.cliente_nome;
                editClienteTelefoneInput.value = osData.cliente_telefone || '';
                editClienteEmailInput.value = osData.cliente_email || '';
                editEquipamentoInput.value = osData.equipamento;
                editStatusSelect.value = osData.status;
                editProblemaTextarea.value = osData.problema_relatado || '';
                editLaudoTextarea.value = osData.laudo_tecnico || '';

                editServicosTableBody.innerHTML = ''; // Limpa serviços anteriores
                if (osData.servicos && osData.servicos.length > 0) {
                    osData.servicos.forEach(servico => {
                        const valorUnitarioF = parseFloat(servico.valor_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        const subtotalF = parseFloat(servico.subtotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        const row = `
                            <tr data-id="${servico.servico_id}" data-valor="${servico.valor_unitario}">
                                <td>${servico.servico_nome}</td>
                                <td><input type="number" class="form-control form-control-sm qtd-servico" value="${servico.quantidade}" min="1"></td>
                                <td>${valorUnitarioF}</td>
                                <td class="subtotal">${subtotalF}</td>
                                <td><button type="button" class="btn btn-danger btn-sm remover-servico">X</button></td>
                            </tr>`;
                        editServicosTableBody.innerHTML += row;
                    });
                }
                updateEditTotals();
                editModal.show();

            } catch (error) {
                alert('Erro: ' + error.message);
            }
        }

        // --- Lidar com Exclusão de OS ---
        if (button.classList.contains('btn-delete')) {
            if (confirm(`Deseja realmente excluir a Ordem de Serviço Nº ${osId}?`)) {
                 try {
                    const response = await fetch(`${API_BASE_URL}/os_api.php?id=${osId}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error || 'Erro desconhecido');
                    alert('OS excluída com sucesso!');
                    carregarOrdens();
                } catch (error) {
                    alert('Erro ao excluir a OS: ' + error.message);
                }
            }
        }
    });

    // --- Event listener para salvar as alterações do modal ---
    btnSalvarAlteracoes.addEventListener('click', async () => {
        const osId = editOsIdInput.value;
        const osData = {
            equipamento: editEquipamentoInput.value,
            status: editStatusSelect.value,
            problema: editProblemaTextarea.value,
            laudo: editLaudoTextarea.value,
            total: parseFloat(editTotalElement.innerText.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()),
            servicos: []
        };

        editServicosTableBody.querySelectorAll('tr').forEach(row => {
            osData.servicos.push({
                id: row.dataset.id,
                qtd: row.querySelector('.qtd-servico').value,
                valorUnitario: row.dataset.valor,
                subtotal: parseFloat(row.querySelector('.subtotal').innerText.replace('R$', '').replace(/\./g, '').replace(',', '.').trim())
            });
        });

        if (!osData.equipamento || osData.servicos.length === 0) {
            alert('O equipamento e pelo menos um serviço são obrigatórios.');
            return;
        }

        btnSalvarAlteracoes.disabled = true;
        btnSalvarAlteracoes.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Salvando...`;

        try {
            const response = await fetch(`${API_BASE_URL}/os_api.php?id=${osId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(osData)
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Erro desconhecido ao salvar.');

            alert('Ordem de Serviço atualizada com sucesso!');
            editModal.hide();
            carregarOrdens(); // Recarrega a lista para mostrar as alterações

        } catch (error) {
            alert('Erro: ' + error.message);
        } finally {
            btnSalvarAlteracoes.disabled = false;
            btnSalvarAlteracoes.innerHTML = `Salvar Alterações`;
        }
    });

    // --- Carga Inicial ---
    carregarOrdens();
    carregarServicosParaModal();
}


// ========================================================================
// |                            PÁGINA ABRIR OS                           |
// ========================================================================
function initAbrirOsPage() {
    // ... (O código desta função permanece inalterado)
    const form = document.getElementById('os-form');
    const clienteIdInput = document.getElementById('cliente_id');
    const clienteNomeInput = document.getElementById('cliente_nome');
    const clienteTelefoneInput = document.getElementById('cliente_telefone');
    const clienteEmailInput = document.getElementById('cliente_email');
    const searchResultsDiv = document.getElementById('search-results');
    
    const servicosSelect = document.getElementById('servicos-select');
    const servicosTableBody = document.getElementById('servicos-selecionados-body');
    const totalElement = document.getElementById('total-os');
    const btnAdicionarServico = document.getElementById('add-servico-btn');
    const btnSalvarOS = document.getElementById('salvar-os-btn');
    const btnLimpar = document.getElementById('limpar-form-btn');

    let listaDeServicos = [];
    let searchTimeout;

    // --- LÓGICA DE BUSCA DE CLIENTE ---
    const handleClientSearch = async (event) => {
        const searchTerm = event.target.value;
        
        if (event.target === clienteNomeInput) {
            clienteIdInput.value = '';
        }

        if (searchTerm.length < 2) {
            searchResultsDiv.innerHTML = '';
            searchResultsDiv.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/clientes_api.php?search=${encodeURIComponent(searchTerm)}`);
            const clientes = await response.json();
            
            searchResultsDiv.innerHTML = '';
            if (clientes.length > 0) {
                clientes.forEach(cliente => {
                    const item = document.createElement('div');
                    item.className = 'search-result-item';
                    item.textContent = `${cliente.nome} - ${cliente.telefone || 'N/A'}`;
                    item.dataset.id = cliente.id;
                    item.dataset.nome = cliente.nome;
                    item.dataset.telefone = cliente.telefone || '';
                    item.dataset.email = cliente.email || '';
                    searchResultsDiv.appendChild(item);
                });
                searchResultsDiv.style.display = 'block';
            } else {
                searchResultsDiv.style.display = 'none';
            }
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            searchResultsDiv.style.display = 'none';
        }
    };

    clienteNomeInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => handleClientSearch(e), 300);
    });

    searchResultsDiv.addEventListener('click', (e) => {
        const item = e.target.closest('.search-result-item');
        if (item) {
            clienteIdInput.value = item.dataset.id;
            clienteNomeInput.value = item.dataset.nome;
            clienteTelefoneInput.value = item.dataset.telefone;
            clienteEmailInput.value = item.dataset.email;
            searchResultsDiv.innerHTML = '';
            searchResultsDiv.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-results-container')) {
            searchResultsDiv.style.display = 'none';
        }
    });

    // --- LÓGICA DE SERVIÇOS E TOTAL ---
    const carregarServicos = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/servicos_api.php`);
            listaDeServicos = await response.json();
            servicosSelect.innerHTML = '<option selected disabled>Selecione um serviço...</option>';
            listaDeServicos.forEach(s => {
                const valorF = parseFloat(s.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                servicosSelect.innerHTML += `<option value="${s.id}">${s.nome} - ${valorF}</option>`;
            });
        } catch (error) {
            console.error("Erro ao carregar serviços:", error);
        }
    };

    const updateTotals = () => {
        let total = 0;
        servicosTableBody.querySelectorAll('tr').forEach(row => {
            const qtd = parseInt(row.querySelector('.qtd-servico').value) || 0;
            const valorUnitario = parseFloat(row.dataset.valor);
            const subtotal = qtd * valorUnitario;
            row.querySelector('.subtotal').innerText = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            total += subtotal;
        });
        totalElement.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    btnAdicionarServico.addEventListener('click', () => {
        const servicoId = servicosSelect.value;
        if (!servicoId || servicoId === 'Selecione um serviço...') return;

        const servico = listaDeServicos.find(s => s.id == servicoId);
        if (servicosTableBody.querySelector(`tr[data-id="${servico.id}"]`)) {
            alert('Este serviço já foi adicionado.');
            return;
        }
        
        const valorFormatado = parseFloat(servico.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const row = `
            <tr data-id="${servico.id}" data-valor="${servico.valor}">
                <td>${servico.nome}</td>
                <td><input type="number" class="form-control form-control-sm qtd-servico" value="1" min="1"></td>
                <td>${valorFormatado}</td>
                <td class="subtotal">${valorFormatado}</td>
                <td><button type="button" class="btn btn-danger btn-sm remover-servico">X</button></td>
            </tr>`;
        servicosTableBody.innerHTML += row;
        updateTotals();
    });

    servicosTableBody.addEventListener('input', e => {
        if (e.target.classList.contains('qtd-servico')) updateTotals();
    });

    servicosTableBody.addEventListener('click', e => {
        if (e.target.classList.contains('remover-servico')) {
            e.target.closest('tr').remove();
            updateTotals();
        }
    });
    
    const limparFormulario = () => {
        form.reset();
        clienteIdInput.value = '';
        servicosTableBody.innerHTML = '';
        updateTotals();
    };

    btnLimpar.addEventListener('click', limparFormulario);

    // --- LÓGICA PARA SALVAR A OS ---
    btnSalvarOS.addEventListener('click', async () => {
        const osData = {
            clienteId: clienteIdInput.value,
            clienteNome: clienteNomeInput.value,
            clienteTelefone: clienteTelefoneInput.value,
            clienteEmail: clienteEmailInput.value,
            equipamento: document.getElementById('equipamento').value,
            problema: document.getElementById('problema').value,
            laudo: document.getElementById('laudo').value,
            total: parseFloat(totalElement.innerText.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()),
            servicos: []
        };

        servicosTableBody.querySelectorAll('tr').forEach(row => {
            osData.servicos.push({
                id: row.dataset.id,
                qtd: row.querySelector('.qtd-servico').value,
                valorUnitario: row.dataset.valor,
                subtotal: parseFloat(row.querySelector('.subtotal').innerText.replace('R$', '').replace(/\./g, '').replace(',', '.').trim())
            });
        });

        if (!osData.clienteNome || !osData.equipamento || osData.servicos.length === 0) {
            alert('Preencha o nome do cliente, o equipamento e adicione pelo menos um serviço.');
            return;
        }

        btnSalvarOS.disabled = true;
        btnSalvarOS.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Salvando...`;

        try {
            const saveResponse = await fetch(`${API_BASE_URL}/os_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(osData)
            });

            if (!saveResponse.ok) {
                 const errorResult = await saveResponse.json();
                 if (saveResponse.status === 409) {
                     throw new Error(errorResult.error || 'Esta Ordem de Serviço parece ser uma duplicata.');
                 }
                 throw new Error(errorResult.error || `Falha ao salvar a OS. Status: ${saveResponse.status}`);
            }
            
            const saveResult = await saveResponse.json();
            if (!saveResult.success) throw new Error(saveResult.error);
            
            alert('Ordem de Serviço salva com sucesso! ID: ' + saveResult.os_id);
            
            const pdfData = {...osData, os_id: saveResult.os_id, cliente_id: saveResult.cliente_id};
            
            const pdfResponse = await fetch(`${API_BASE_URL}/gerar_pdf.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pdfData)
            });
            const pdfResult = await pdfResponse.json();
            if(pdfResult.success) {
                const pdfPathForBrowser = `../php/pdfs/${pdfResult.fileName}`;
                window.open(pdfPathForBrowser, '_blank');
            } else {
                alert('OS salva, mas houve um erro ao gerar o PDF: ' + pdfResult.error);
            }
            
            limparFormulario();

        } catch (error) {
            alert('Erro: ' + error.message);
        } finally {
            btnSalvarOS.disabled = false;
            btnSalvarOS.innerHTML = `<i class="fas fa-file-pdf me-2"></i>Gerar PDF e Salvar OS`;
        }
    });

    carregarServicos();
    updateTotals();
}