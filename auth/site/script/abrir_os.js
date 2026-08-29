// auth/site/script/abrir_os.js

document.addEventListener('DOMContentLoaded', () => {
    // Referências aos elementos do formulário
    const form = document.getElementById('os-form');
    const clienteIdInput = document.getElementById('cliente_id');
    const clienteNomeInput = document.getElementById('cliente_nome');
    const clienteTelefoneInput = document.getElementById('cliente_telefone');
    const clienteEmailInput = document.getElementById('cliente_email');
    const searchResultsDiv = document.getElementById('search-results');
    const dataEntradaInput = document.getElementById('data_entrada');
    
    const servicosSelect = document.getElementById('servicos-select');
    const addServicoBtn = document.getElementById('add-servico-btn');
    const servicosTableBody = document.getElementById('servicos-selecionados-body');
    const totalOsElement = document.getElementById('total-os');
    
    const salvarBtn = document.getElementById('salvar-os-btn');
    const limparBtn = document.getElementById('limpar-form-btn');

    let listaDeServicos = [];
    let searchTimeout;

    // Inicializa a data com o dia de hoje (YYYY-MM-DD)
    const resetDataHoje = () => {
        if (dataEntradaInput) {
            const hoje = new Date();
            const ano = hoje.getFullYear();
            const mes = String(hoje.getMonth() + 1).padStart(2, '0');
            const dia = String(hoje.getDate()).padStart(2, '0');
            dataEntradaInput.value = `${ano}-${mes}-${dia}`;
        }
    };
    resetDataHoje();

    // --- CARREGAMENTO INICIAL DE SERVIÇOS ---
    const carregarServicos = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/servicos_api.php`);
            listaDeServicos = await response.json();
            servicosSelect.innerHTML = '<option selected disabled>Selecione um serviço ou desconto...</option>';
            listaDeServicos.forEach(s => {
                let displayText = `${s.nome}`;
                if (s.tipo === 'servico' || s.tipo === 'desconto_fixo') {
                    displayText += ` - ${parseFloat(s.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
                } else if (s.tipo === 'desconto_percentual') {
                    displayText += ` - ${s.valor}%`;
                }
                servicosSelect.innerHTML += `<option value="${s.id}">${displayText}</option>`;
            });
        } catch (error) {
            console.error("Erro ao carregar serviços:", error);
            servicosSelect.innerHTML = '<option>Erro ao carregar serviços</option>';
        }
    };

    // --- LÓGICA DE CÁLCULO DE TOTAL ---
    const updateTotal = () => {
        let runningTotal = 0;
        servicosTableBody.querySelectorAll('tr').forEach(row => {
            const qtd = parseFloat(row.querySelector('.qtd-servico').value) || 1;
            const valorUnitario = parseFloat(row.dataset.valor);
            const tipo = row.dataset.tipo;
            
            let impacto = 0;
            if (tipo === 'servico' || tipo === 'peca') {
                impacto = qtd * valorUnitario;
            } else if (tipo === 'desconto_fixo') {
                impacto = -(qtd * valorUnitario);
            } else if (tipo === 'desconto_percentual') {
                impacto = -(runningTotal * (valorUnitario / 100));
            }

            runningTotal += impacto;
            row.dataset.impactoIndividual = impacto;
            row.querySelector('.subtotal').textContent = runningTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        });
        
        totalOsElement.textContent = runningTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // --- MANIPULAÇÃO DE SERVIÇOS ---
    addServicoBtn.addEventListener('click', () => {
        const servicoId = servicosSelect.value;
        if (!servicoId || servicoId.startsWith('Selecione')) return;

        const servico = listaDeServicos.find(s => s.id == servicoId);
        if (!servico) return;

        // Evita duplicar
        if (servicosTableBody.querySelector(`tr[data-id="${servico.id}"]`)) {
            showToast('Este item já foi adicionado.', 'error');
            return;
        }

        let valorDisplay, subtotalDisplay;
        const valorUnit = parseFloat(servico.valor);
        
        if (servico.tipo === 'desconto_percentual') {
            valorDisplay = `${valorUnit.toFixed(2)}%`;
            subtotalDisplay = `${valorUnit.toFixed(2)}%`;
        } else if (servico.tipo === 'desconto_fixo') {
            valorDisplay = `-${valorUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
            subtotalDisplay = `-${valorUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        } else {
            valorDisplay = valorUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            subtotalDisplay = valorUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        const tr = document.createElement('tr');
        tr.dataset.id = servico.id;
        tr.dataset.nome = servico.nome;
        tr.dataset.valor = valorUnit;
        tr.dataset.tipo = servico.tipo;

        tr.innerHTML = `
            <td class="fw-semibold">${servico.nome} <span class="badge bg-light text-secondary border ms-1">${servico.tipo}</span></td>
            <td><input type="number" class="form-control form-control-sm qtd-servico text-center" value="1" min="1" style="max-width: 80px;"></td>
            <td class="valor-unitario">${valorDisplay}</td>
            <td class="subtotal fw-bold text-dark">${subtotalDisplay}</td>
            <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger remove-servico-btn rounded-circle"><i class="fas fa-trash"></i></button></td>
        `;

        servicosTableBody.appendChild(tr);
        updateTotal();
        servicosSelect.selectedIndex = 0;
    });

    // Delegar eventos na tabela (quantidade e remoção)
    servicosTableBody.addEventListener('input', (e) => {
        if (e.target.classList.contains('qtd-servico')) {
            updateTotal();
        }
    });

    servicosTableBody.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-servico-btn');
        if (removeBtn) {
            removeBtn.closest('tr').remove();
            updateTotal();
        }
    });

    // --- ITEM AVULSO ---
    const avulsoModalEl = document.getElementById('avulsoModal');
    const avulsoModal = avulsoModalEl ? new bootstrap.Modal(avulsoModalEl) : null;
    const openAvulsoModalBtn = document.getElementById('open-avulso-modal-btn');
    const addAvulsoBtn = document.getElementById('add-avulso-btn');

    openAvulsoModalBtn?.addEventListener('click', () => {
        document.getElementById('avulso-nome').value = '';
        document.getElementById('avulso-valor').value = '';
        document.getElementById('avulso-tipo').selectedIndex = 0;
        avulsoModal?.show();
    });

    addAvulsoBtn?.addEventListener('click', () => {
        const nome = document.getElementById('avulso-nome').value.trim();
        const valor = parseFloat(document.getElementById('avulso-valor').value) || 0;
        const tipo = document.getElementById('avulso-tipo').value;

        if (!nome || valor <= 0) {
            showAlert('Por favor, informe a descrição e um valor válido.', 'warning', 'Item Inválido');
            return;
        }

        const fakeId = 'avulso_' + Date.now();
        const tr = document.createElement('tr');
        tr.dataset.id = fakeId;
        tr.dataset.nome = nome;
        tr.dataset.valor = valor;
        tr.dataset.tipo = tipo;

        let valorDisplay = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (tipo === 'desconto_fixo') valorDisplay = `-${valorDisplay}`;
        if (tipo === 'desconto_percentual') valorDisplay = `${valor.toFixed(2)}%`;

        tr.innerHTML = `
            <td class="fw-semibold">${nome} <span class="badge bg-warning-subtle text-warning border ms-1">Avulso</span></td>
            <td><input type="number" class="form-control form-control-sm qtd-servico text-center" value="1" min="1" style="max-width: 80px;"></td>
            <td class="valor-unitario">${valorDisplay}</td>
            <td class="subtotal fw-bold text-dark">${valorDisplay}</td>
            <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger remove-servico-btn rounded-circle"><i class="fas fa-trash"></i></button></td>
        `;

        servicosTableBody.appendChild(tr);
        updateTotal();
        avulsoModal?.hide();
    });

    // --- AUTOCOMPLETE DE CLIENTES ---
    clienteNomeInput?.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const termo = clienteNomeInput.value.trim();
        if (termo.length < 2) {
            searchResultsDiv.style.display = 'none';
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/clientes_api.php`);
                const clientes = await response.json();
                const filtrados = clientes.filter(c => c.nome.toLowerCase().includes(termo.toLowerCase()));

                if (filtrados.length > 0) {
                    searchResultsDiv.innerHTML = filtrados.map(c => `
                        <div class="search-result-item" data-id="${c.id}" data-nome="${c.nome}" data-tel="${c.telefone || ''}" data-email="${c.email || ''}">
                            <strong>${c.nome}</strong> - <small class="text-muted">${c.telefone || 'Sem telefone'}</small>
                        </div>
                    `).join('');

                    searchResultsDiv.querySelectorAll('.search-result-item').forEach(item => {
                        item.addEventListener('click', () => {
                            clienteIdInput.value = item.dataset.id;
                            clienteNomeInput.value = item.dataset.nome;
                            clienteTelefoneInput.value = item.dataset.tel;
                            clienteEmailInput.value = item.dataset.email;
                            searchResultsDiv.style.display = 'none';
                        });
                    });
                    searchResultsDiv.style.display = 'block';
                } else {
                    searchResultsDiv.style.display = 'none';
                }
            } catch (error) {
                console.error('Erro na busca de clientes:', error);
            }
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-results-container')) {
            searchResultsDiv.style.display = 'none';
        }
    });

    // --- SALVAR E LIMPAR ---
    limparBtn?.addEventListener('click', () => {
        form.reset();
        servicosTableBody.innerHTML = '';
        clienteIdInput.value = '';
        resetDataHoje();
        updateTotal();
    });

    salvarBtn?.addEventListener('click', async () => {
        const osData = {
            clienteId: clienteIdInput.value,
            clienteNome: clienteNomeInput.value.trim(),
            clienteTelefone: clienteTelefoneInput.value.trim(),
            clienteEmail: clienteEmailInput.value.trim(),
            equipamento: document.getElementById('equipamento').value.trim(),
            problema: document.getElementById('problema').value.trim(),
            laudo: document.getElementById('laudo').value.trim(),
            data_entrada: dataEntradaInput ? dataEntradaInput.value.trim() : '',
            total: parseFloat(totalOsElement.textContent.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0,
            servicos: Array.from(servicosTableBody.querySelectorAll('tr')).map(row => ({
                id: row.dataset.id,
                nome: row.dataset.nome,
                qtd: row.querySelector('.qtd-servico').value,
                valorUnitario: row.dataset.valor,
                tipo: row.dataset.tipo,
                subtotal: row.dataset.impactoIndividual || 0
            }))
        };
        
        if (!osData.clienteNome || !osData.equipamento || osData.servicos.length === 0) {
            showAlert('Cliente, Equipamento e pelo menos um Serviço/Item são obrigatórios.', 'warning', 'Dados Incompletos');
            return;
        }
        
        salvarBtn.disabled = true;
        salvarBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Salvando...';

        try {
            const response = await fetch(`${API_BASE_URL}/os_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(osData)
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Erro desconhecido ao salvar.');

            // Pergunta sobre inclusão do formato NFSe
            const querNfse = await perguntarFormatoNfse();

            // Gerar PDF
            const pdfResponse = await fetch(`${API_BASE_URL}/gerar_pdf.php?id=${result.os_id}&nfse=${querNfse ? 1 : 0}`);
            const pdfResult = await pdfResponse.json();
            if (pdfResult.success) {
                window.open(`../php/pdfs/${pdfResult.fileName}`, '_blank');
                showToast('Ordem de Serviço salva com sucesso!', 'success');
                limparBtn.click();
            } else {
                showAlert(`OS salva (Nº ${result.os_id}), mas houve um erro ao gerar o PDF: ${pdfResult.error}`, 'error', 'Erro no PDF');
            }

        } catch (error) {
            showAlert('Erro ao salvar OS: ' + error.message, 'error', 'Falha no Servidor');
        } finally {
            salvarBtn.disabled = false;
            salvarBtn.innerHTML = '<i class="fas fa-file-pdf me-2"></i>Gerar PDF e Salvar OS';
        }
    });

    carregarServicos();
});