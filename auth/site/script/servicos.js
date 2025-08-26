// site/script/servicos.js

document.addEventListener('DOMContentLoaded', () => {
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
});