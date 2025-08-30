document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES ---
    const tableBodyUsuarios = document.getElementById('lista-usuarios');
    const usuarioModalElement = document.getElementById('usuarioModal');
    const usuarioModal = new bootstrap.Modal(usuarioModalElement);
    const formUsuario = document.getElementById('form-usuario');
    const modalTitleUsuario = document.getElementById('usuarioModalLabel');
    const campoSenhaUsuario = document.getElementById('usuario_senha');

    // --- ESTADO ---
    let editModeUsuario = false;
    let editIdUsuario = null;

    // ===================================================================
    // FUNÇÕES DE GERENCIAMENTO DE USUÁRIOS
    // ===================================================================
    const carregarUsuarios = async () => {
        tableBodyUsuarios.innerHTML = `<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm"></div> Carregando...</td></tr>`;
        try {
            const response = await fetch(`../${API_BASE_URL}/configuracoes_api.php?tipo=usuarios`);
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
            const response = await fetch(`../${API_BASE_URL}/configuracoes_api.php?tipo=usuarios&id=${id}`);
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
            const response = await fetch(`../${API_BASE_URL}/configuracoes_api.php`, {
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
                const response = await fetch(`../${API_BASE_URL}/configuracoes_api.php`, {
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

    // --- EVENT LISTENERS ---
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

    // --- INICIALIZAÇÃO ---
    carregarUsuarios();
});