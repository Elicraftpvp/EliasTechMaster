document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('os-table-body');
    
    // --- Referências aos Modais ---
    const editModalElement = document.getElementById('editOsModal');
    const statusModalElement = document.getElementById('statusChangeModal');
    if (!editModalElement || !statusModalElement) return;
    const editModal = new bootstrap.Modal(editModalElement);
    const statusModal = new bootstrap.Modal(statusModalElement);

    // --- Referências aos Elementos do Modal de Edição ---
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

    // --- Referências aos Elementos do Modal de Status ---
    const statusModalOsIdText = document.getElementById('status-modal-os-id');
    const statusOsIdInput = document.getElementById('status_os_id_input');
    const statusSelectModal = document.getElementById('status_select_modal');
    const btnSalvarStatus = document.getElementById('salvar-status-btn');

    let listaDeServicos = [];

    // --- LÓGICA DE CÁLCULO DE TOTAL (MODAL DE EDIÇÃO) ---
    const updateEditTotals = () => {
        let subtotalServicos = 0;
        let totalDescontoFixo = 0;
        let totalDescontoPercentual = 0;

        editServicosTableBody.querySelectorAll('tr').forEach(row => {
            const qtd = parseFloat(row.querySelector('.qtd-servico').value) || 1;
            const valorUnitario = parseFloat(row.dataset.valor);
            const tipo = row.dataset.tipo;
            let subtotal = qtd * valorUnitario;

            if (tipo === 'servico') {
                subtotalServicos += subtotal;
                row.querySelector('.subtotal').textContent = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            } else if (tipo === 'desconto_fixo') {
                totalDescontoFixo += subtotal;
                row.querySelector('.subtotal').textContent = `-${subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
            } else if (tipo === 'desconto_percentual') {
                totalDescontoPercentual += subtotal;
                row.querySelector('.subtotal').textContent = `${subtotal.toFixed(2)}%`;
            }
        });

        const valorDoDescontoPercentual = subtotalServicos * (totalDescontoPercentual / 100);
        const totalFinal = subtotalServicos - totalDescontoFixo - valorDoDescontoPercentual;
        
        editTotalElement.textContent = totalFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // --- CARREGAMENTO DE DADOS ---
    const carregarServicosParaModal = async () => {
        if (listaDeServicos.length > 0) return;
        try {
            const response = await fetch(`${API_BASE_URL}/servicos_api.php`);
            listaDeServicos = await response.json();
            editServicosSelect.innerHTML = '<option selected disabled>Selecione um serviço ou desconto...</option>';
            listaDeServicos.forEach(s => {
                let displayText = `${s.nome}`;
                if (s.tipo === 'servico' || s.tipo === 'desconto_fixo') {
                    displayText += ` - ${parseFloat(s.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
                } else if (s.tipo === 'desconto_percentual') {
                    displayText += ` - ${s.valor}%`;
                }
                editServicosSelect.innerHTML += `<option value="${s.id}">${displayText}</option>`;
            });
        } catch (error) {
            console.error("Erro ao carregar serviços para o modal:", error);
        }
    };
    
    // --- MANIPULAÇÃO DE SERVIÇOS (MODAL DE EDIÇÃO) ---
    btnAdicionarServico.addEventListener('click', () => {
        const servicoId = editServicosSelect.value;
        if (!servicoId || servicoId.startsWith('Selecione')) return;
        
        const servico = listaDeServicos.find(s => s.id == servicoId);
        if (!servico) return;
        
        if (editServicosTableBody.querySelector(`tr[data-id="${servico.id}"]`)) {
            alert('Este item já foi adicionado.');
            return;
        }

        let valorDisplay, subtotalDisplay;
        const valorUnit = parseFloat(servico.valor);
        
        if(servico.tipo === 'desconto_percentual') {
            valorDisplay = `${valorUnit.toFixed(2)}%`;
            subtotalDisplay = `${valorUnit.toFixed(2)}%`;
        } else if (servico.tipo === 'desconto_fixo') {
            valorDisplay = `-${valorUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
            subtotalDisplay = `-${valorUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        } else {
            valorDisplay = valorUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            subtotalDisplay = valorUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        const row = `
            <tr data-id="${servico.id}" data-valor="${servico.valor}" data-tipo="${servico.tipo}">
                <td>${servico.nome}</td>
                <td><input type="number" class="form-control form-control-sm qtd-servico" value="1" min="1" ${servico.tipo === 'desconto_percentual' ? 'readonly' : ''}></td>
                <td>${valorDisplay}</td>
                <td class="subtotal">${subtotalDisplay}</td>
                <td><button type="button" class="btn btn-danger btn-sm remover-servico">X</button></td>
            </tr>`;
        editServicosTableBody.insertAdjacentHTML('beforeend', row);
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
                'Aberta': { class: 'bg-primary' },
                'Em Andamento': { class: 'bg-warning text-dark' },
                'Aguardando Peças': { class: 'bg-info text-dark' },
                'Concluída': { class: 'bg-success' },
                'Cancelada': { class: 'bg-danger' }
            };

            ordens.forEach(os => {
                const currentStatusInfo = statusInfo[os.status] || { class: 'bg-secondary' };
                const dataEntrada = new Date(os.data_entrada).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                const dataSaida = os.data_saida ? new Date(os.data_saida).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '--';
                const valorTotal = parseFloat(os.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                // **MUDANÇA AQUI**: Substituído o dropdown por um botão simples que abre o modal
                const statusButtonHtml = `
                    <button type="button" 
                            class="btn btn-sm ${currentStatusInfo.class} btn-change-status" 
                            data-bs-toggle="modal" 
                            data-bs-target="#statusChangeModal" 
                            data-os-id="${os.id}" 
                            data-current-status="${os.status}">
                        ${os.status}
                    </button>`;

                const row = `
                    <tr data-os-id="${os.id}">
                        <td>${String(os.id).padStart(4, '0')}</td>
                        <td>${os.cliente_nome}</td>
                        <td>${os.equipamento}</td>
                        <td>${dataEntrada}</td>
                        <td>${dataSaida}</td>
                        <td>${statusButtonHtml}</td>
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
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Erro ao carregar Ordens de Serviço.</td></tr>`;
            console.error(error);
        }
    };
    
    // --- EVENTOS NA TABELA PRINCIPAL ---
    tableBody.addEventListener('click', async (e) => {
        const target = e.target;
        
        // **REMOVIDO**: O listener antigo para 'status-change-option' foi removido.

        const button = target.closest('button');
        if (!button) return;
        
        const row = button.closest('tr');
        const osId = row.dataset.osId;

        // Visualizar PDF
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

        // Editar OS
        if (button.classList.contains('btn-edit')) {
            try {
                const response = await fetch(`${API_BASE_URL}/os_api.php?id=${osId}`);
                if(!response.ok) throw new Error('OS não encontrada ou erro na API');
                const osData = await response.json();
                
                editOsIdInput.value = osData.id;
                osIdModalSpan.textContent = String(osData.id).padStart(4, '0');
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
                        let valorDisplay, subtotalDisplay;
                        const valorUnit = parseFloat(servico.valor_unitario);
                        
                        if(servico.servico_tipo === 'desconto_percentual') {
                            valorDisplay = `${valorUnit.toFixed(2)}%`;
                            subtotalDisplay = `${(valorUnit * servico.quantidade).toFixed(2)}%`;
                        } else if (servico.servico_tipo === 'desconto_fixo') {
                            valorDisplay = `-${valorUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
                            subtotalDisplay = `-${(valorUnit * servico.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
                        } else {
                            valorDisplay = valorUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                            subtotalDisplay = (valorUnit * servico.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        }

                        const rowHTML = `
                            <tr data-id="${servico.servico_id}" data-valor="${servico.valor_unitario}" data-tipo="${servico.servico_tipo}">
                                <td>${servico.servico_nome}</td>
                                <td><input type="number" class="form-control form-control-sm qtd-servico" value="${servico.quantidade}" min="1" ${servico.servico_tipo === 'desconto_percentual' ? 'readonly' : ''}></td>
                                <td>${valorDisplay}</td>
                                <td class="subtotal">${subtotalDisplay}</td>
                                <td><button type="button" class="btn btn-danger btn-sm remover-servico">X</button></td>
                            </tr>`;
                        editServicosTableBody.innerHTML += rowHTML;
                    });
                }
                updateEditTotals();
                editModal.show();
            } catch (error) {
                alert('Erro ao carregar dados da OS: ' + error.message);
            }
        }

        // Deletar OS
        if (button.classList.contains('btn-delete')) {
            if (confirm(`Deseja realmente excluir a Ordem de Serviço Nº ${String(osId).padStart(4, '0')}?`)) {
                 try {
                    const response = await fetch(`${API_BASE_URL}/os_api.php?id=${osId}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error || 'Erro desconhecido');
                    await carregarOrdens();
                } catch (error) {
                    alert('Erro ao excluir a OS: ' + error.message);
                }
            }
        }
    });

    // --- NOVO: LÓGICA PARA O MODAL DE MUDANÇA DE STATUS ---
    statusModalElement.addEventListener('show.bs.modal', function (event) {
        // Pega o botão que acionou o modal
        const button = event.relatedTarget;
        
        // Extrai os dados do botão
        const osId = button.getAttribute('data-os-id');
        const currentStatus = button.getAttribute('data-current-status');
        
        // Popula o modal com os dados
        statusModalOsIdText.textContent = String(osId).padStart(4, '0');
        statusOsIdInput.value = osId;
        statusSelectModal.value = currentStatus;
    });

    btnSalvarStatus.addEventListener('click', async () => {
        const osId = statusOsIdInput.value;
        const newStatus = statusSelectModal.value;
        
        const quickUpdateData = { status: newStatus, quick_update: true };

        btnSalvarStatus.disabled = true;
        
        // MODIFICADO: Mensagem personalizada se a OS for concluída
        if (newStatus === 'Concluída') {
            btnSalvarStatus.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Enviando E-mail...`;
        } else {
            btnSalvarStatus.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Salvando...`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/os_api.php?id=${osId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quickUpdateData)
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Erro ao atualizar.');
            
            statusModal.hide();
            await carregarOrdens();
        } catch (error) {
            alert('Erro ao atualizar status da OS: ' + error.message);
        } finally {
            btnSalvarStatus.disabled = false;
            btnSalvarStatus.innerHTML = `Salvar`;
        }
    });

    // --- SALVAR EDIÇÃO (MODAL PRINCIPAL) ---
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
                tipo: row.dataset.tipo,
                subtotal: parseFloat(row.querySelector('.subtotal').textContent.replace('R$', '').replace(/\./g, '').replace(',', '.').replace('%','').trim())
            }))
        };

        if (!osData.equipamento || osData.servicos.length === 0) {
            alert('O equipamento e pelo menos um serviço/desconto são obrigatórios.');
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
            if (!result.success) throw new Error(result.error || 'Erro ao salvar.');
            editModal.hide();
            await carregarOrdens();
        } catch (error) {
            alert('Erro: ' + error.message);
        } finally {
            btnSalvarAlteracoes.disabled = false;
            btnSalvarAlteracoes.innerHTML = `Salvar Alterações`;
        }
    });

    // --- INICIALIZAÇÃO ---
    carregarOrdens();
    carregarServicosParaModal();
});