document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES ---
    const tableBodyFilaEmail = document.getElementById('lista-fila-email');
    const btnRecarregarFila = document.getElementById('recarregar-fila-btn');

    // ===================================================================
    // FUNÇÕES DA FILA DE E-MAIL
    // ===================================================================
    const carregarFilaEmail = async () => {
        tableBodyFilaEmail.innerHTML = `<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm"></div> Carregando fila...</td></tr>`;
        try {
            const response = await fetch(`../${API_BASE_URL}/configuracoes_api.php?tipo=fila_email`);
            if (!response.ok) throw new Error('Erro na requisição');
            const fila = await response.json();
            
            tableBodyFilaEmail.innerHTML = '';
            if (fila.length === 0) {
                tableBodyFilaEmail.innerHTML = `<tr><td colspan="5" class="text-center">A fila de e-mails está vazia.</td></tr>`;
                return;
            }
            fila.forEach(item => {
                let statusBadge = '';
                switch(item.status) {
                    case 'pendente': statusBadge = '<span class="badge bg-warning">Pendente</span>'; break;
                    case 'enviado': statusBadge = '<span class="badge bg-success">Enviado</span>'; break;
                    case 'falhou': statusBadge = `<span class="badge bg-danger" title="${item.erro || 'Erro desconhecido'}">Falhou</span>`; break;
                    default: statusBadge = `<span class="badge bg-secondary">${item.status}</span>`;
                }

                const row = `
                    <tr>
                        <td>${item.destinatario}</td>
                        <td>${item.assunto}</td>
                        <td>${statusBadge}</td>
                        <td>${item.ultima_tentativa ? new Date(item.ultima_tentativa).toLocaleString('pt-BR') : 'Nunca'}</td>
                        <td>
                            <button class="btn btn-sm btn-primary btn-reenviar" title="Reenviar" data-id="${item.id}" ${item.status === 'enviado' ? 'disabled' : ''}><i class="fas fa-paper-plane"></i></button>
                            <button class="btn btn-sm btn-danger btn-excluir" title="Excluir" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
                tableBodyFilaEmail.innerHTML += row;
            });
        } catch (error) {
            tableBodyFilaEmail.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar a fila de e-mails.</td></tr>`;
            console.error('Falha ao carregar fila de e-mails:', error);
        }
    };

    // --- EVENT LISTENERS ---
    btnRecarregarFila.addEventListener('click', carregarFilaEmail);

    tableBodyFilaEmail.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const id = button.dataset.id;

        if (button.classList.contains('btn-reenviar')) {
            button.disabled = true;
            try {
                const response = await fetch(`../${API_BASE_URL}/configuracoes_api.php?tipo=fila_email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tipo: 'fila_email', acao: 'reenviar', id: id })
                });
                const res = await response.json();
                showToast(res.message, res.success ? 'success' : 'error');
                carregarFilaEmail();
            } catch (error) {
                showAlert('Erro ao reenviar e-mail.', 'error', 'Falha');
                button.disabled = false;
            }
        }

        if (button.classList.contains('btn-excluir')) {
            showConfirm('Deseja excluir este item da fila?', async () => {
                try {
                    const response = await fetch(`../${API_BASE_URL}/configuracoes_api.php?tipo=fila_email`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tipo: 'fila_email', id: id })
                    });
                    const res = await response.json();
                    showToast(res.message, res.success ? 'success' : 'error');
                    carregarFilaEmail();
                } catch (error) {
                    showAlert('Erro ao excluir item.', 'error', 'Erro');
                }
            }, 'Excluir da Fila');
        }
    });

    // --- INICIALIZAÇÃO ---
    carregarFilaEmail();
});