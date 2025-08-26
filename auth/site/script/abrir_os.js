// site/script/abrir_os.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('os-form');
    const clienteIdInput = document.getElementById('cliente_id');
    const clienteNomeInput = document.getElementById('cliente_nome');
    const clienteTelefoneInput = document.getElementById('cliente_telefone');
    const clienteEmailInput = document.getElementById('cliente_email');
    const searchResultsDiv = document.getElementById('search-results');
    
    const servicosSelect = document.getElementById('servicos-select');
    const servicosTableBody = document.getElementById('servicos-selecionados-body');
    const totalElement = document.getElementById('total-os');
    const btnAdicionarServico = document.getElementById('add-servico-btn');
    const btnSalvarOS = document.getElementById('salvar-os-btn');
    const btnLimpar = document.getElementById('limpar-form-btn');

    let listaDeServicos = [];
    let searchTimeout;

    const handleClientSearch = async (searchTerm) => {
        if (searchTerm.length < 2) {
            searchResultsDiv.style.display = 'none';
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/clientes_api.php?search=${encodeURIComponent(searchTerm)}`);
            const clientes = await response.json();
            searchResultsDiv.innerHTML = '';
            if (clientes.length > 0) {
                clientes.forEach(cliente => {
                    const item = document.createElement('div');
                    item.className = 'search-result-item';
                    item.textContent = `${cliente.nome} - ${cliente.telefone || 'N/A'}`;
                    item.dataset.id = cliente.id;
                    item.dataset.nome = cliente.nome;
                    item.dataset.telefone = cliente.telefone || '';
                    item.dataset.email = cliente.email || '';
                    searchResultsDiv.appendChild(item);
                });
                searchResultsDiv.style.display = 'block';
            } else {
                searchResultsDiv.style.display = 'none';
            }
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
        }
    };

    clienteNomeInput.addEventListener('input', (e) => {
        clienteIdInput.value = ''; // Limpa o ID se o usuário digitar um novo nome
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => handleClientSearch(e.target.value), 300);
    });

    searchResultsDiv.addEventListener('click', (e) => {
        const item = e.target.closest('.search-result-item');
        if (item) {
            clienteIdInput.value = item.dataset.id;
            clienteNomeInput.value = item.dataset.nome;
            clienteTelefoneInput.value = item.dataset.telefone;
            clienteEmailInput.value = item.dataset.email;
            searchResultsDiv.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-results-container')) {
            searchResultsDiv.style.display = 'none';
        }
    });

    const carregarServicos = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/servicos_api.php`);
            listaDeServicos = await response.json();
            servicosSelect.innerHTML = '<option selected disabled>Selecione um serviço...</option>';
            listaDeServicos.forEach(s => {
                const valorF = parseFloat(s.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                servicosSelect.innerHTML += `<option value="${s.id}">${s.nome} - ${valorF}</option>`;
            });
        } catch (error) {
            console.error("Erro ao carregar serviços:", error);
        }
    };

    const updateTotals = () => {
        let total = 0;
        servicosTableBody.querySelectorAll('tr').forEach(row => {
            const qtd = parseInt(row.querySelector('.qtd-servico').value) || 0;
            const valorUnitario = parseFloat(row.dataset.valor);
            const subtotal = qtd * valorUnitario;
            row.querySelector('.subtotal').innerText = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            total += subtotal;
        });
        totalElement.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    btnAdicionarServico.addEventListener('click', () => {
        const servicoId = servicosSelect.value;
        if (!servicoId || servicoId === 'Selecione um serviço...') return;
        const servico = listaDeServicos.find(s => s.id == servicoId);
        if (servicosTableBody.querySelector(`tr[data-id="${servico.id}"]`)) {
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
        servicosTableBody.innerHTML += row;
        updateTotals();
    });

    servicosTableBody.addEventListener('input', e => {
        if (e.target.classList.contains('qtd-servico')) updateTotals();
    });

    servicosTableBody.addEventListener('click', e => {
        if (e.target.classList.contains('remover-servico')) {
            e.target.closest('tr').remove();
            updateTotals();
        }
    });
    
    const limparFormulario = () => {
        form.reset();
        clienteIdInput.value = '';
        servicosTableBody.innerHTML = '';
        updateTotals();
    };

    btnLimpar.addEventListener('click', limparFormulario);

    btnSalvarOS.addEventListener('click', async () => {
        const osData = {
            clienteId: clienteIdInput.value,
            clienteNome: clienteNomeInput.value,
            clienteTelefone: clienteTelefoneInput.value,
            clienteEmail: clienteEmailInput.value,
            equipamento: document.getElementById('equipamento').value,
            problema: document.getElementById('problema').value,
            laudo: document.getElementById('laudo').value,
            total: parseFloat(totalElement.innerText.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()),
            servicos: Array.from(servicosTableBody.querySelectorAll('tr')).map(row => ({
                id: row.dataset.id,
                qtd: row.querySelector('.qtd-servico').value,
                valorUnitario: row.dataset.valor,
                subtotal: parseFloat(row.querySelector('.subtotal').innerText.replace('R$', '').replace(/\./g, '').replace(',', '.').trim())
            }))
        };

        if (!osData.clienteNome || !osData.equipamento || osData.servicos.length === 0) {
            alert('Preencha o nome do cliente, o equipamento e adicione pelo menos um serviço.');
            return;
        }

        btnSalvarOS.disabled = true;
        btnSalvarOS.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Salvando...`;

        try {
            const saveResponse = await fetch(`${API_BASE_URL}/os_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(osData)
            });
            const saveResult = await saveResponse.json();
            if (!saveResponse.ok) throw new Error(saveResult.error || `Falha ao salvar a OS. Status: ${saveResponse.status}`);
            
            alert('Ordem de Serviço salva com sucesso! ID: ' + saveResult.os_id);
            
            const pdfResponse = await fetch(`${API_BASE_URL}/gerar_pdf.php?id=${saveResult.os_id}`);
            const pdfResult = await pdfResponse.json();
            if(pdfResult.success) {
                window.open(`../php/pdfs/${pdfResult.fileName}`, '_blank');
            } else {
                alert('OS salva, mas houve um erro ao gerar o PDF: ' + pdfResult.error);
            }
            
            limparFormulario();

        } catch (error) {
            alert('Erro: ' + error.message);
        } finally {
            btnSalvarOS.disabled = false;
            btnSalvarOS.innerHTML = `<i class="fas fa-file-pdf me-2"></i>Gerar PDF e Salvar OS`;
        }
    });

    carregarServicos();
    updateTotals();
});