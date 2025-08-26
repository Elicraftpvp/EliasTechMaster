// site/script/gerenciar_os.js

document.addEventListener('DOMContentLoaded', async () => {
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

    let listaDeServicos = [];

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

    const carregarServicosParaModal = async () => {
        if (listaDeServicos.length > 0) return;
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

    const carregarOrdens = async () => {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center"><div class="spinner-border spinner-border-sm"></div></td></tr>`;
        try {
            const response = await fetch(`${API_BASE_URL}/os_api.php`);
            if (!response.ok) throw new Error(`Erro na rede: ${response.statusText}`);
            const ordens = await response.json();
            
            tableBody.innerHTML = '';
            if(ordens.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="8" class="text-center">Nenhuma Ordem de Serviço encontrada.</td></tr>`;
                return;
            }

            const statusInfo = {
                'Aberta': { class: 'bg-primary', text: 'Aberta' },
                'Em Andamento': { class: 'bg-warning text-dark', text: 'Em Andamento' },
                'Aguardando Peças': { class: 'bg-info text-dark', text: 'Aguard. Peças' },
                'Concluída': { class: 'bg-success', text: 'Concluída' },
                'Cancelada': { class: 'bg-danger', text: 'Cancelada' }
            };

            ordens.forEach(os => {
                const currentStatusInfo = statusInfo[os.status] || { class: 'bg-secondary', text: os.status };
                const dataEntrada = new Date(os.data_entrada).toLocaleDateString('pt-BR');
                const dataSaida = os.data_saida ? new Date(os.data_saida).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '--';
                const valorTotal = parseFloat(os.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                let statusDropdownHtml = `<span class="badge ${currentStatusInfo.class}">${currentStatusInfo.text}</span>`;
                if (os.status !== 'Cancelada' && os.status !== 'Aguardando Peças') {
                     statusDropdownHtml = `
                        <div class="btn-group">
                            <button type="button" class="btn btn-sm ${currentStatusInfo.class} dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">${currentStatusInfo.text}</button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item status-change-option" href="#" data-new-status="Aberta">Aberta</a></li>
                                <li><a class="dropdown-item status-change-option" href="#" data-new-status="Em Andamento">Em Andamento</a></li>
                                <li><a class="dropdown-item status-change-option" href="#" data-new-status="Concluída">Concluída</a></li>
                            </ul>
                        </div>`;
                }

                const row = `
                    <tr data-os-id="${os.id}" data-os-status="${os.status}">
                        <td>${os.id}</td>
                        <td>${os.cliente_nome}</td>
                        <td>${os.equipamento}</td>
                        <td>${dataEntrada}</td>
                        <td>${dataSaida}</td>
                        <td>${statusDropdownHtml}</td>
                        <td>${valorTotal}</td>
                        <td class="text-nowrap">
                            <button class="btn btn-sm btn-info btn-visualizar" title="Visualizar/Baixar PDF"><i class="fas fa-file-pdf"></i></button>
                            <button class="btn btn-sm btn-warning btn-edit" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-danger btn-delete" title="Excluir"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
                tableBody.innerHTML += row;
            });
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center">Erro ao carregar Ordens de Serviço.</td></tr>`;
            console.error(error);
        }
    };
    
    tableBody.addEventListener('click', async (e) => {
        const button = e.target.closest('button:not(.dropdown-toggle)');
        const link = e.target.closest('a.status-change-option');

        if (link) {
            e.preventDefault();
            const row = link.closest('tr');
            const osId = row.dataset.osId;
            const newStatus = link.dataset.newStatus;

            const getTodayISO = () => new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            
            const quickUpdateData = {
                status: newStatus,
                data_saida: newStatus === 'Concluída' ? getTodayISO() : null,
                quick_update: true
            };

            try {
                const response = await fetch(`${API_BASE_URL}/os_api.php?id=${osId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(quickUpdateData)
                });
                const result = await response.json();
                if (!result.success) throw new Error(result.error || 'Erro desconhecido ao atualizar.');
                carregarOrdens();
            } catch (error) {
                alert('Erro ao atualizar status da OS: ' + error.message);
            }
        }

        if (!button) return;
        
        const row = button.closest('tr');
        const osId = row.dataset.osId;

        if (button.classList.contains('btn-visualizar')) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            try {
                const response = await fetch(`${API_BASE_URL}/gerar_pdf.php?id=${osId}`);
                const result = await response.json();
                if (result.success) {
                    window.open(`../php/pdfs/${result.fileName}`, '_blank');
                } else {
                    alert('Erro ao gerar o PDF: ' + result.error);
                }
            } catch (error) {
                alert('Ocorreu um erro de comunicação ao tentar gerar o PDF.');
            } finally {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-file-pdf"></i>';
            }
        }

        if (button.classList.contains('btn-edit')) {
            try {
                const response = await fetch(`${API_BASE_URL}/os_api.php?id=${osId}`);
                const osData = await response.json();
                
                editOsIdInput.value = osData.id;
                osIdModalSpan.textContent = osData.id;
                editClienteNomeInput.value = osData.cliente_nome;
                editClienteTelefoneInput.value = osData.cliente_telefone || '';
                editClienteEmailInput.value = osData.cliente_email || '';
                editEquipamentoInput.value = osData.equipamento;
                editStatusSelect.value = osData.status;
                editProblemaTextarea.value = osData.problema_relatado || '';
                editLaudoTextarea.value = osData.laudo_tecnico || '';

                editServicosTableBody.innerHTML = '';
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

        if (button.classList.contains('btn-delete')) {
            if (confirm(`Deseja realmente excluir a Ordem de Serviço Nº ${osId}?`)) {
                 try {
                    const response = await fetch(`${API_BASE_URL}/os_api.php?id=${osId}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error || 'Erro desconhecido');
                    carregarOrdens();
                } catch (error) {
                    alert('Erro ao excluir a OS: ' + error.message);
                }
            }
        }
    });

    btnSalvarAlteracoes.addEventListener('click', async () => {
        const osId = editOsIdInput.value;
        const osData = {
            equipamento: editEquipamentoInput.value,
            status: editStatusSelect.value,
            problema: editProblemaTextarea.value,
            laudo: editLaudoTextarea.value,
            total: parseFloat(editTotalElement.innerText.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()),
            servicos: Array.from(editServicosTableBody.querySelectorAll('tr')).map(row => ({
                id: row.dataset.id,
                qtd: row.querySelector('.qtd-servico').value,
                valorUnitario: row.dataset.valor,
                subtotal: parseFloat(row.querySelector('.subtotal').innerText.replace('R$', '').replace(/\./g, '').replace(',', '.').trim())
            }))
        };

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
            editModal.hide();
            carregarOrdens();
        } catch (error) {
            alert('Erro: ' + error.message);
        } finally {
            btnSalvarAlteracoes.disabled = false;
            btnSalvarAlteracoes.innerHTML = `Salvar Alterações`;
        }
    });

    carregarOrdens();
    carregarServicosParaModal();
});