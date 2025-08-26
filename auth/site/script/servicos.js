document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('servicos-table-body');
    const modal = new bootstrap.Modal(document.getElementById('servicoModal'));
    const form = document.getElementById('form-servico');
    const modalTitle = document.getElementById('servicoModalLabel');
    const salvarBtn = document.getElementById('salvar-servico-btn');
    let editMode = false;
    let editId = null;

    const formatarTipo = (tipo) => {
        switch (tipo) {
            case 'servico': return '<span class="badge bg-primary">Serviço</span>';
            case 'desconto_percentual': return '<span class="badge bg-success">Desconto %</span>';
            case 'desconto_fixo': return '<span class="badge bg-info">Desconto R$</span>';
            default: return tipo;
        }
    };
    
    const formatarValor = (valor, tipo) => {
        if (tipo === 'desconto_percentual') {
            return `${parseFloat(valor).toFixed(2)}%`;
        }
        return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const carregarServicos = async () => {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm"></div></td></tr>`;
        try {
            const response = await fetch(`${API_BASE_URL}/servicos_api.php`);
            if (!response.ok) throw new Error('Falha ao carregar dados da API');
            const servicos = await response.json();
            
            tableBody.innerHTML = '';
            if (!servicos || servicos.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Nenhum serviço cadastrado.</td></tr>`;
                return;
            }
            servicos.forEach(s => {
                const row = `
                    <tr>
                        <td>${s.id}</td>
                        <td>${s.nome}</td>
                        <td>${formatarTipo(s.tipo)}</td>
                        <td>${formatarValor(s.valor, s.tipo)}</td>
                        <td>
                            <button class="btn btn-sm btn-warning btn-edit" data-id="${s.id}" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-danger btn-delete" data-id="${s.id}" title="Excluir"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
                tableBody.innerHTML += row;
            });
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar serviços.</td></tr>`;
            console.error(error);
        }
    };

    // Abre o modal para ADICIONAR
    document.querySelector('button[data-bs-target="#servicoModal"]').addEventListener('click', () => {
        editMode = false;
        editId = null;
        modalTitle.textContent = 'Adicionar Novo Serviço';
        form.reset();
        document.getElementById('servico_tipo').value = 'servico';
    });

    salvarBtn.addEventListener('click', async () => {
        const data = {
            nome: document.getElementById('servico_nome').value,
            descricao: document.getElementById('servico_descricao').value,
            valor: document.getElementById('servico_valor').value,
            tipo: document.getElementById('servico_tipo').value, // Novo campo
        };

        if (!data.nome || !data.valor) {
            alert('Nome e Valor são obrigatórios.');
            return;
        }
        
        const url = editMode ? `${API_BASE_URL}/servicos_api.php?id=${editId}` : `${API_BASE_URL}/servicos_api.php`;
        const method = editMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Erro ao salvar o serviço.');
            
            modal.hide();
            await carregarServicos();
        } catch (error) {
            console.error(error);
            alert('Não foi possível salvar o serviço.');
        }
    });

    tableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        
        if (target.classList.contains('btn-edit')) {
            try {
                const response = await fetch(`${API_BASE_URL}/servicos_api.php?id=${id}`);
                if (!response.ok) throw new Error('Serviço não encontrado.');
                const servico = await response.json();
                
                editMode = true;
                editId = id;
                modalTitle.textContent = 'Editar Serviço';
                document.getElementById('servico_nome').value = servico.nome;
                document.getElementById('servico_descricao').value = servico.descricao;
                document.getElementById('servico_valor').value = servico.valor;
                document.getElementById('servico_tipo').value = servico.tipo; // Novo campo
                modal.show();
            } catch (error) {
                console.error(error);
                alert('Não foi possível carregar os dados para edição.');
            }
        }

        if (target.classList.contains('btn-delete')) {
            if (confirm('Deseja realmente excluir este serviço?')) {
                try {
                    const response = await fetch(`${API_BASE_URL}/servicos_api.php?id=${id}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Erro ao excluir.');
                    await carregarServicos();
                } catch(error) {
                    console.error(error);
                    alert('Não foi possível excluir o serviço.');
                }
            }
        }
    });

    carregarServicos();
});