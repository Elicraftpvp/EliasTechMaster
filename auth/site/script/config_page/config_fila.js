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
                        <td>${new Date(item.ultima_tentativa).toLocaleString('pt-BR')}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" title="Reenviar" disabled><i class="fas fa-paper-plane"></i></button>
                            <button class="btn btn-sm btn-danger" title="Excluir" disabled><i class="fas fa-trash"></i></button>
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

    // --- INICIALIZAÇÃO ---
    carregarFilaEmail();
});