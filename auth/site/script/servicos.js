// auth/site/script/servicos.js

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('servicos-table-body');
    const modalEl = document.getElementById('servicoModal');
    const modal = new bootstrap.Modal(modalEl);
    const form = document.getElementById('form-servico');
    const modalTitle = document.getElementById('servicoModalLabel');
    const salvarBtn = document.getElementById('salvar-servico-btn');
    const searchInput = document.getElementById('search-servico-input');
    let editMode = false;
    let editId = null;

    const formatarTipo = (tipo) => {
        switch (tipo) {
            case 'servico':
                return '<span class="status-chip status-chip-andamento"><i class="fas fa-screwdriver-wrench me-1"></i>Serviço</span>';
            case 'peca':
                return '<span class="status-chip status-chip-aguardando"><i class="fas fa-microchip me-1"></i>Peça</span>';
            case 'desconto_percentual':
                return '<span class="status-chip status-chip-concluida"><i class="fas fa-percent me-1"></i>Desconto %</span>';
            case 'desconto_fixo':
                return '<span class="status-chip status-chip-concluida"><i class="fas fa-dollar-sign me-1"></i>Desconto R$</span>';
            default:
                return `<span class="status-chip status-chip-default">${tipo || 'Item'}</span>`;
        }
    };
    
    const formatarValor = (valor, tipo) => {
        if (tipo === 'desconto_percentual') {
            return `<strong class="text-success">-${parseFloat(valor).toFixed(2)}%</strong>`;
        }
        if (tipo === 'desconto_fixo') {
            return `<strong class="text-success">-${parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>`;
        }
        return `<strong class="text-dark">${parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>`;
    };

    const carregarServicos = async () => {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>`;
        try {
            const response = await fetch(`${API_BASE_URL}/servicos_api.php`);
            if (!response.ok) throw new Error('Falha ao carregar dados da API');
            const servicos = await response.json();
            
            tableBody.innerHTML = '';
            if (!servicos || servicos.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Nenhum serviço cadastrado no momento.</td></tr>`;
                return;
            }

            servicos.forEach(s => {
                const row = `
                    <tr>
                        <td class="ps-4 fw-bold text-muted">#${s.id}</td>
                        <td>
                            <div class="fw-semibold text-dark fs-6">${s.nome}</div>
                            ${s.descricao ? `<small class="text-muted">${s.descricao}</small>` : ''}
                        </td>
                        <td>${formatarTipo(s.tipo)}</td>
                        <td>${formatarValor(s.valor, s.tipo)}</td>
                        <td class="pe-4 text-center">
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-warning btn-edit" data-id="${s.id}" title="Editar"><i class="fas fa-pen-to-square"></i></button>
                                <button class="btn btn-danger btn-delete" data-id="${s.id}" title="Excluir"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>`;
                tableBody.innerHTML += row;
            });
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Erro ao carregar catálogo de serviços.</td></tr>`;
            console.error(error);
        }
    };

    // Abre o modal para ADICIONAR
    document.getElementById('btn-novo-servico-modal')?.addEventListener('click', () => {
        editMode = false;
        editId = null;
        modalTitle.innerHTML = '<i class="fas fa-plus-circle text-primary me-2"></i>Novo Serviço / Desconto';
        form.reset();
        document.getElementById('servico_tipo').value = 'servico';
    });

    salvarBtn?.addEventListener('click', async () => {
        const nomeVal = document.getElementById('servico_nome').value.trim();
        const valorVal = document.getElementById('servico_valor').value.trim();

        if (!nomeVal || !valorVal) {
            showAlert('Nome e Valor são campos obrigatórios.', 'warning', 'Atenção');
            return;
        }

        const data = {
            nome: nomeVal,
            descricao: document.getElementById('servico_descricao').value.trim(),
            valor: valorVal,
            tipo: document.getElementById('servico_tipo').value,
        };
        
        const url = editMode ? `${API_BASE_URL}/servicos_api.php?id=${editId}` : `${API_BASE_URL}/servicos_api.php`;
        const method = editMode ? 'PUT' : 'POST';

        salvarBtn.disabled = true;
        salvarBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Salvando...';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Erro ao salvar o serviço.');
            
            modal.hide();
            showToast('Serviço/Desconto salvo com sucesso!', 'success');
            await carregarServicos();
        } catch (error) {
            console.error(error);
            showAlert('Não foi possível salvar o serviço. Verifique os dados.', 'error', 'Erro');
        } finally {
            salvarBtn.disabled = false;
            salvarBtn.innerHTML = '<i class="fas fa-save me-1"></i> Salvar Item';
        }
    });

    tableBody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');

        if (editBtn) {
            const id = editBtn.dataset.id;
            try {
                const response = await fetch(`${API_BASE_URL}/servicos_api.php?id=${id}`);
                if (!response.ok) throw new Error('Falha ao buscar dados.');
                const servico = await response.json();
                
                document.getElementById('servico_id').value = servico.id;
                document.getElementById('servico_nome').value = servico.nome;
                document.getElementById('servico_descricao').value = servico.descricao || '';
                document.getElementById('servico_valor').value = servico.valor;
                document.getElementById('servico_tipo').value = servico.tipo;
                
                editMode = true;
                editId = id;
                modalTitle.innerHTML = `<i class="fas fa-pen-to-square text-primary me-2"></i>Editar Item #${id}`;
                modal.show();
            } catch (err) {
                showAlert('Não foi possível carregar os dados para edição.', 'error', 'Erro');
            }
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            const confirmado = await showConfirm(
                'Deseja realmente excluir este serviço/item?',
                'Excluir Item',
                'Excluir',
                'Cancelar'
            );

            if (confirmado) {
                try {
                    const response = await fetch(`${API_BASE_URL}/servicos_api.php?id=${id}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Falha ao excluir.');
                    showToast('Item excluído com sucesso!', 'success');
                    await carregarServicos();
                } catch (err) {
                    showAlert('Erro ao excluir item.', 'error', 'Erro');
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

    carregarServicos();
});