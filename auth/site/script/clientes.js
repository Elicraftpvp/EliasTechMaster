// site/script/clientes.js

document.addEventListener('DOMContentLoaded', () => {
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
        // TODO: Adicionar lógica de edição para clientes
    });

    carregarClientes();
});