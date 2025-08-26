// site/script/abrir_os.js

document.addEventListener('DOMContentLoaded', () => {
    // Referências aos elementos do formulário
    const form = document.getElementById('os-form');
    const clienteIdInput = document.getElementById('cliente_id');
    const clienteNomeInput = document.getElementById('cliente_nome');
    const clienteTelefoneInput = document.getElementById('cliente_telefone');
    const clienteEmailInput = document.getElementById('cliente_email');
    const searchResultsDiv = document.getElementById('search-results');
    
    const servicosSelect = document.getElementById('servicos-select');
    const addServicoBtn = document.getElementById('add-servico-btn');
    const servicosTableBody = document.getElementById('servicos-selecionados-body');
    const totalOsElement = document.getElementById('total-os');
    
    const salvarBtn = document.getElementById('salvar-os-btn');
    const limparBtn = document.getElementById('limpar-form-btn');

    let listaDeServicos = [];
    let searchTimeout;

    // --- CARREGAMENTO INICIAL ---
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
            servicosSelect.innerHTML = '<option>Erro ao carregar</option>';
        }
    };

    // --- LÓGICA DE CÁLCULO DE TOTAL ---
    const updateTotal = () => {
        let subtotalServicos = 0;
        let totalDescontoFixo = 0;
        let totalDescontoPercentual = 0;

        servicosTableBody.querySelectorAll('tr').forEach(row => {
            const qtd = parseFloat(row.querySelector('.qtd-servico').value) || 1;
            const valorUnitario = parseFloat(row.dataset.valor);
            const tipo = row.dataset.tipo;
            let subtotal = qtd * valorUnitario;

            if (tipo === 'servico') {
                subtotalServicos += subtotal;
                row.querySelector('.subtotal').textContent = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            } else if (tipo === 'desconto_fixo') {
                totalDescontoFixo += subtotal;
                // Exibe como negativo
                row.querySelector('.subtotal').textContent = `-${subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
            } else if (tipo === 'desconto_percentual') {
                totalDescontoPercentual += subtotal; // Soma as porcentagens
                row.querySelector('.subtotal').textContent = `${subtotal.toFixed(2)}%`;
            }
        });
        
        const valorDoDescontoPercentual = subtotalServicos * (totalDescontoPercentual / 100);
        const totalFinal = subtotalServicos - totalDescontoFixo - valorDoDescontoPercentual;
        
        totalOsElement.textContent = totalFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // --- MANIPULAÇÃO DE SERVIÇOS ---
    addServicoBtn.addEventListener('click', () => {
        const servicoId = servicosSelect.value;
        if (!servicoId || servicoId.startsWith('Selecione')) return;

        const servico = listaDeServicos.find(s => s.id == servicoId);
        if (!servico) return;

        // Evita adicionar o mesmo item duas vezes
        if (servicosTableBody.querySelector(`tr[data-id="${servico.id}"]`)) {
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
        } else { // tipo 'servico'
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
        servicosTableBody.insertAdjacentHTML('beforeend', row);
        updateTotal();
    });

    servicosTableBody.addEventListener('input', e => {
        if (e.target.classList.contains('qtd-servico')) {
            updateTotal();
        }
    });

    servicosTableBody.addEventListener('click', e => {
        if (e.target.classList.contains('remover-servico')) {
            e.target.closest('tr').remove();
            updateTotal();
        }
    });

    // --- BUSCA DE CLIENTES ---
    clienteNomeInput.addEventListener('keyup', () => {
        clearTimeout(searchTimeout);
        const query = clienteNomeInput.value;
        if (query.length < 2) {
            searchResultsDiv.style.display = 'none';
            return;
        }
        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/clientes_api.php?search=${query}`);
                const clientes = await response.json();
                searchResultsDiv.innerHTML = '';
                if (clientes.length > 0) {
                    clientes.forEach(cliente => {
                        const div = document.createElement('div');
                        div.className = 'search-result-item';
                        div.textContent = `${cliente.nome} - ${cliente.telefone || 'Sem telefone'}`;
                        div.addEventListener('click', () => {
                            clienteIdInput.value = cliente.id;
                            clienteNomeInput.value = cliente.nome;
                            clienteTelefoneInput.value = cliente.telefone || '';
                            clienteEmailInput.value = cliente.email || '';
                            searchResultsDiv.style.display = 'none';
                        });
                        searchResultsDiv.appendChild(div);
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
    limparBtn.addEventListener('click', () => {
        form.reset();
        servicosTableBody.innerHTML = '';
        clienteIdInput.value = '';
        updateTotal();
    });

    salvarBtn.addEventListener('click', async () => {
        const osData = {
            clienteId: clienteIdInput.value,
            clienteNome: clienteNomeInput.value,
            clienteTelefone: clienteTelefoneInput.value,
            clienteEmail: clienteEmailInput.value,
            equipamento: document.getElementById('equipamento').value,
            problema: document.getElementById('problema').value,
            laudo: document.getElementById('laudo').value,
            total: parseFloat(totalOsElement.textContent.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()),
            servicos: Array.from(servicosTableBody.querySelectorAll('tr')).map(row => ({
                id: row.dataset.id,
                qtd: row.querySelector('.qtd-servico').value,
                valorUnitario: row.dataset.valor,
                tipo: row.dataset.tipo,
                subtotal: parseFloat(row.querySelector('.subtotal').textContent.replace('R$', '').replace(/\./g, '').replace(',', '.').replace('%','').trim())
            }))
        };
        
        if (!osData.clienteNome || !osData.equipamento || osData.servicos.length === 0) {
            alert('Cliente, Equipamento e pelo menos um Serviço/Desconto são obrigatórios.');
            return;
        }
        
        salvarBtn.disabled = true;
        salvarBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

        try {
            const response = await fetch(`${API_BASE_URL}/os_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(osData)
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Erro desconhecido ao salvar.');

            // Gerar PDF
            const pdfResponse = await fetch(`${API_BASE_URL}/gerar_pdf.php?id=${result.os_id}`);
            const pdfResult = await pdfResponse.json();
            if (pdfResult.success) {
                window.open(`../php/pdfs/${pdfResult.fileName}`, '_blank');
                limparBtn.click();
            } else {
                alert(`OS salva (Nº ${result.os_id}), mas houve um erro ao gerar o PDF: ${pdfResult.error}`);
            }

        } catch (error) {
            alert('Erro ao salvar OS: ' + error.message);
        } finally {
            salvarBtn.disabled = false;
            salvarBtn.innerHTML = '<i class="fas fa-file-pdf me-2"></i>Gerar PDF e Salvar OS';
        }
    });

    // Iniciar
    carregarServicos();
});