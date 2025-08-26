// site/script/clientes.js

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('clientes-table-body');
    const clienteModalElement = document.getElementById('clienteModal');
    const modal = new bootstrap.Modal(clienteModalElement);
    const form = document.getElementById('form-cliente');
    const modalTitle = document.getElementById('clienteModalLabel');
    let editMode = false;
    let editId = null;

    // --- FUNÇÕES ---

    // Carrega e exibe os clientes na tabela
    const carregarClientes = async () => {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center"><div class="spinner-border spinner-border-sm"></div></td></tr>`;
        try {
            const response = await fetch(`${API_BASE_URL}/clientes_api.php`);
            if (!response.ok) throw new Error('Erro na requisição');
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
                            <button class="btn btn-sm btn-warning btn-edit" data-id="${c.id}" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-danger btn-delete" data-id="${c.id}" title="Excluir"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
                tableBody.innerHTML += row;
            });
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar clientes.</td></tr>`;
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
            modalTitle.textContent = 'Editar Cliente';
            
            modal.show();
        } catch (error) {
            console.error('Erro ao buscar dados do cliente para edição:', error);
            alert('Não foi possível carregar os dados do cliente.');
        }
    };

    // Reseta o modal para o estado de "Adicionar"
    const resetarModal = () => {
        form.reset();
        editMode = false;
        editId = null;
        modalTitle.textContent = 'Adicionar Cliente';
    };

    // --- EVENT LISTENERS ---

    // Listener para o botão SALVAR no modal
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

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Erro ao salvar cliente.');

            modal.hide();
            carregarClientes();
        } catch (error) {
            console.error('Falha ao salvar cliente:', error);
            alert('Ocorreu um erro ao salvar. Verifique o console.');
        }
    });

    // Listener para cliques na tabela (usando delegação de eventos)
    tableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const id = target.dataset.id;

        if (target.classList.contains('btn-delete')) {
            if (confirm('Deseja realmente excluir este cliente?')) {
                try {
                    await fetch(`${API_BASE_URL}/clientes_api.php?id=${id}`, { method: 'DELETE' });
                    carregarClientes();
                } catch (error) {
                    console.error('Erro ao excluir cliente:', error);
                    alert('Não foi possível excluir o cliente.');
                }
            }
        } else if (target.classList.contains('btn-edit')) {
            // NOVO: Chama a função para preparar a edição
            prepararEdicao(id);
        }
    });

    // NOVO: Limpa o modal sempre que ele for fechado
    // Isso garante que ao clicar em "Adicionar Cliente", o formulário estará limpo
    clienteModalElement.addEventListener('hidden.bs.modal', resetarModal);


    // --- INICIALIZAÇÃO ---
    carregarClientes();
});