// site/script/clientes.js

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('clientes-table-body');
    const clienteModalElement = document.getElementById('clienteModal');
    const modal = new bootstrap.Modal(clienteModalElement);
    const form = document.getElementById('form-cliente');
    const modalTitle = document.getElementById('clienteModalLabel');
    const searchInput = document.getElementById('search-cliente-input');
    let editMode = false;
    let editId = null;

    // --- FUNÇÕES ---

    // Carrega e exibe os clientes na tabela
    const carregarClientes = async () => {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>`;
        try {
            const response = await fetch(`${API_BASE_URL}/clientes_api.php`);
            if (!response.ok) throw new Error('Erro na requisição');
            const clientes = await response.json();
            
            tableBody.innerHTML = '';
            if (clientes.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum cliente cadastrado no momento.</td></tr>`;
                return;
            }

            clientes.forEach(c => {
                const inicial = (c.nome || 'C').charAt(0).toUpperCase();
                const row = `
                    <tr>
                        <td class="ps-4 fw-bold text-muted">#${c.id}</td>
                        <td>
                            <div class="d-flex align-items-center gap-2">
                                <div class="client-avatar-circle" style="width: 32px; height: 32px; font-size: 12px;">${inicial}</div>
                                <span class="fw-semibold text-dark">${c.nome}</span>
                            </div>
                        </td>
                        <td>${c.cpf_cnpj || '<span class="text-muted small">Não informado</span>'}</td>
                        <td>${c.telefone ? `<i class="fas fa-phone me-1 text-secondary"></i>${c.telefone}` : '<span class="text-muted small">Sem telefone</span>'}</td>
                        <td>${c.email ? `<i class="fas fa-envelope me-1 text-secondary"></i>${c.email}` : '<span class="text-muted small">Sem e-mail</span>'}</td>
                        <td class="pe-4 text-center">
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-warning btn-edit" data-id="${c.id}" title="Editar"><i class="fas fa-pen-to-square"></i></button>
                                <button class="btn btn-danger btn-delete" data-id="${c.id}" title="Excluir"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>`;
                tableBody.innerHTML += row;
            });
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Erro ao carregar clientes.</td></tr>`;
            console.error('Falha ao carregar clientes:', error);
        }
    };

    // Prepara o modal para edição de um cliente
    const prepararEdicao = async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/clientes_api.php?id=${id}`);
            if (!response.ok) throw new Error('Cliente não encontrado');
            const cliente = await response.json();

            // Preenche o formulário
            document.getElementById('cliente_nome').value = cliente.nome;
            document.getElementById('cliente_cpf_cnpj').value = cliente.cpf_cnpj || '';
            document.getElementById('cliente_telefone').value = cliente.telefone || '';
            document.getElementById('cliente_email').value = cliente.email || '';
            document.getElementById('cliente_endereco').value = cliente.endereco || '';

            // Configura o modo de edição
            editMode = true;
            editId = id;
            modalTitle.innerHTML = `<i class="fas fa-user-pen text-primary me-2"></i>Editar Cliente #${id}`;
            
            modal.show();
        } catch (error) {
            console.error('Erro ao buscar dados do cliente para edição:', error);
            showAlert('Não foi possível carregar os dados do cliente.', 'error', 'Erro');
        }
    };

    // Reseta o modal para o estado de "Adicionar"
    const resetarModal = () => {
        form.reset();
        editMode = false;
        editId = null;
        modalTitle.innerHTML = `<i class="fas fa-user-plus text-primary me-2"></i>Novo Cliente`;
    };

    // --- EVENT LISTENERS ---

    // Listener para o botão SALVAR no modal
    document.getElementById('salvar-cliente-btn').addEventListener('click', async () => {
        const nomeVal = document.getElementById('cliente_nome').value.trim();
        if (!nomeVal) {
            showAlert('O nome do cliente é obrigatório.', 'warning', 'Campo Obrigatório');
            return;
        }

        const data = {
            nome: nomeVal,
            cpf_cnpj: document.getElementById('cliente_cpf_cnpj').value.trim(),
            telefone: document.getElementById('cliente_telefone').value.trim(),
            email: document.getElementById('cliente_email').value.trim(),
            endereco: document.getElementById('cliente_endereco').value.trim(),
        };
        
        const url = editMode ? `${API_BASE_URL}/clientes_api.php?id=${editId}` : `${API_BASE_URL}/clientes_api.php`;
        const method = editMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Não foi possível salvar o cliente.');
            }

            modal.hide();
            showToast(result.message || 'Cliente salvo com sucesso!', 'success');
            await carregarClientes();
        } catch (error) {
            showAlert(error.message, 'error', 'Erro');
        }
    });

    // Listener para cliques na tabela (Editar e Excluir)
    tableBody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');

        if (editBtn) {
            prepararEdicao(editBtn.dataset.id);
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            const confirmado = await showConfirm(
                'Tem certeza que deseja excluir este cliente?',
                'Excluir Cliente',
                'Excluir',
                'Cancelar'
            );

            if (confirmado) {
                try {
                    const response = await fetch(`${API_BASE_URL}/clientes_api.php?id=${id}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || 'Erro ao excluir');
                    
                    showToast(result.message || 'Cliente excluído com sucesso!', 'success');
                    await carregarClientes();
                } catch (error) {
                    showAlert(error.message, 'error', 'Erro ao Excluir');
                }
            }
        }
    });

    // Busca rápida em tempo real
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase().trim();
            tableBody.querySelectorAll('tr').forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
            });
        });
    }

    // Listener para o botão que abre o modal de Novo Cliente
    document.getElementById('btn-novo-cliente-modal')?.addEventListener('click', resetarModal);

    // Reseta o formulário quando o modal é fechado
    clienteModalElement.addEventListener('hidden.bs.modal', resetarModal);

    // --- CARREGAMENTO INICIAL ---
    carregarClientes();
});