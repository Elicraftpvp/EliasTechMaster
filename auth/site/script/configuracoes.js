document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES ---
    // Seção Usuários
    const tableBodyUsuarios = document.getElementById('lista-usuarios');
    const usuarioModalElement = document.getElementById('usuarioModal');
    const usuarioModal = new bootstrap.Modal(usuarioModalElement);
    const formUsuario = document.getElementById('form-usuario');
    const modalTitleUsuario = document.getElementById('usuarioModalLabel');
    const campoSenhaUsuario = document.getElementById('usuario_senha');

    // Seção E-mail
    const formEmailConfig = document.getElementById('form-email-config');
    const btnTestarEmail = document.getElementById('testar-email-btn');
    const tableBodyFilaEmail = document.getElementById('lista-fila-email');
    const btnRecarregarFila = document.getElementById('recarregar-fila-btn');

    // --- ESTADO ---
    let editModeUsuario = false;
    let editIdUsuario = null;

    // ===================================================================
    // FUNÇÕES DE CONFIGURAÇÃO DE E-MAIL
    // ===================================================================

    const carregarConfigEmail = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/configuracoes_api.php?tipo=email`);
            if (!response.ok) throw new Error('Erro ao buscar configurações de e-mail.');
            
            const config = await response.json();

            if (config && Object.keys(config).length > 0) {
                document.getElementById('smtp_host').value = config.smtp_host || '';
                document.getElementById('smtp_port').value = config.smtp_port || '';
                document.getElementById('smtp_user').value = config.smtp_user || '';
                document.getElementById('smtp_pass').placeholder = 'Preencha para alterar';
                document.getElementById('smtp_security').value = config.smtp_security || 'tls';
                document.getElementById('smtp_auth').checked = !!parseInt(config.smtp_auth);
                document.getElementById('smtp_from_name').value = config.smtp_from_name || '';
                document.getElementById('smtp_from_email').value = config.smtp_from_email || '';
            }
        } catch (error) {
            console.error('Falha ao carregar configurações de e-mail:', error);
            alert('Não foi possível carregar as configurações de e-mail.');
        }
    };

    const salvarConfigEmail = async (event) => {
        event.preventDefault();
        const btn = document.getElementById('salvar-email-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';

        const data = {
            _method: 'PUT',
            tipo: 'email',
            smtp_host: document.getElementById('smtp_host').value,
            smtp_port: document.getElementById('smtp_port').value,
            smtp_user: document.getElementById('smtp_user').value,
            smtp_pass: document.getElementById('smtp_pass').value,
            smtp_security: document.getElementById('smtp_security').value,
            smtp_auth: document.getElementById('smtp_auth').checked ? 1 : 0,
            smtp_from_name: document.getElementById('smtp_from_name').value,
            smtp_from_email: document.getElementById('smtp_from_email').value,
        };

        try {
            const response = await fetch(`${API_BASE_URL}/configuracoes_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Erro ao salvar configurações.');
            }
            alert(result.message);
            document.getElementById('smtp_pass').value = '';
        } catch (error) {
            console.error('Falha ao salvar configurações de e-mail:', error);
            alert(`Ocorreu um erro: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Salvar Configurações';
        }
    };

    const testarConexaoEmail = async () => {
        alert('Funcionalidade de teste de conexão ainda não implementada.');
    };

    const carregarFilaEmail = async () => {
        tableBodyFilaEmail.innerHTML = `<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm"></div> Carregando fila...</td></tr>`;
        try {
            const response = await fetch(`${API_BASE_URL}/configuracoes_api.php?tipo=fila_email`);
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


    // ===================================================================
    // FUNÇÕES DE GERENCIAMENTO DE USUÁRIOS (CÓDIGO EXISTENTE ADAPTADO)
    // ===================================================================

    const carregarUsuarios = async () => {
        tableBodyUsuarios.innerHTML = `<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm"></div> Carregando...</td></tr>`;
        try {
            const response = await fetch(`${API_BASE_URL}/configuracoes_api.php?tipo=usuarios`);
            if (!response.ok) throw new Error('Erro na requisição');
            const usuarios = await response.json();
            
            tableBodyUsuarios.innerHTML = '';
            if (usuarios.length === 0) {
                tableBodyUsuarios.innerHTML = `<tr><td colspan="5" class="text-center">Nenhum usuário cadastrado.</td></tr>`;
                return;
            }
            usuarios.forEach(u => {
                const row = `
                    <tr>
                        <td>${u.nome}</td>
                        <td>${u.email}</td>
                        <td>${u.telefone || 'Não informado'}</td>
                        <td>${new Date(u.data_cadastro).toLocaleDateString('pt-BR')}</td>
                        <td>
                            <button class="btn btn-sm btn-warning btn-edit-usuario" data-id="${u.id}" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-danger btn-delete-usuario" data-id="${u.id}" title="Excluir"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
                tableBodyUsuarios.innerHTML += row;
            });
        } catch (error) {
            tableBodyUsuarios.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar usuários.</td></tr>`;
            console.error('Falha ao carregar usuários:', error);
        }
    };

    const prepararEdicaoUsuario = async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/configuracoes_api.php?tipo=usuarios&id=${id}`);
            if (!response.ok) throw new Error('Usuário não encontrado');
            const usuario = await response.json();

            document.getElementById('usuario_nome').value = usuario.nome;
            document.getElementById('usuario_email').value = usuario.email;
            document.getElementById('usuario_telefone').value = usuario.telefone || '';
            document.getElementById('usuario_endereco').value = usuario.endereco || '';
            
            campoSenhaUsuario.value = '';
            campoSenhaUsuario.placeholder = 'Deixe em branco para não alterar';
            campoSenhaUsuario.removeAttribute('required');

            editModeUsuario = true;
            editIdUsuario = id;
            modalTitleUsuario.textContent = 'Editar Usuário';
            
            usuarioModal.show();
        } catch (error) {
            console.error('Erro ao buscar dados do usuário para edição:', error);
            alert('Não foi possível carregar os dados do usuário.');
        }
    };

    const resetarModalUsuario = () => {
        formUsuario.reset();
        editModeUsuario = false;
        editIdUsuario = null;
        modalTitleUsuario.textContent = 'Adicionar Usuário';
        campoSenhaUsuario.placeholder = '';
        campoSenhaUsuario.setAttribute('required', 'required');
    };

    const salvarUsuario = async () => {
        const data = {
            tipo: 'usuarios',
            id: editIdUsuario,
            nome: document.getElementById('usuario_nome').value,
            email: document.getElementById('usuario_email').value,
            senha: campoSenhaUsuario.value,
            telefone: document.getElementById('usuario_telefone').value,
            endereco: document.getElementById('usuario_endereco').value,
        };
        
        if (editModeUsuario) {
            data._method = 'PUT';
        }

        try {
            const response = await fetch(`${API_BASE_URL}/configuracoes_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Erro ao salvar usuário.');
            }
            
            alert(result.message);
            usuarioModal.hide();
            carregarUsuarios();
        } catch (error) {
            console.error('Falha ao salvar usuário:', error);
            alert(`Ocorreu um erro ao salvar: ${error.message}`);
        }
    };

    const excluirUsuario = async (id) => {
        if (confirm('Deseja realmente excluir este usuário?')) {
            try {
                const response = await fetch(`${API_BASE_URL}/configuracoes_api.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id, tipo: 'usuarios', _method: 'DELETE' })
                });
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.message);
                alert(result.message);
                carregarUsuarios();
            } catch (error) {
                console.error('Erro ao excluir usuário:', error);
                alert('Não foi possível excluir o usuário.');
            }
        }
    };


    // ===================================================================
    // EVENT LISTENERS
    // ===================================================================

    // Listeners da Seção de E-mail
    formEmailConfig.addEventListener('submit', salvarConfigEmail);
    btnTestarEmail.addEventListener('click', testarConexaoEmail);
    btnRecarregarFila.addEventListener('click', carregarFilaEmail);

    // Listeners da Seção de Usuários
    document.getElementById('salvar-usuario-btn').addEventListener('click', salvarUsuario);
    tableBodyUsuarios.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        if (target.classList.contains('btn-delete-usuario')) {
            excluirUsuario(id);
        } else if (target.classList.contains('btn-edit-usuario')) {
            prepararEdicaoUsuario(id);
        }
    });
    usuarioModalElement.addEventListener('hidden.bs.modal', resetarModalUsuario);


    // ===================================================================
    // INICIALIZAÇÃO
    // ===================================================================
    
    // Carrega os dados da primeira aba visível ao carregar a página
    carregarConfigEmail();

    // Opcional: Recarregar dados apenas quando o usuário clicar na aba
    const tabs = document.querySelectorAll('#config-tabs button[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', event => {
            const targetId = event.target.getAttribute('data-bs-target');
            if (targetId === '#email-queue') {
                carregarFilaEmail();
            } else if (targetId === '#usuarios') {
                carregarUsuarios();
            } else if (targetId === '#email-config') {
                carregarConfigEmail();
            }
        });
    });
});