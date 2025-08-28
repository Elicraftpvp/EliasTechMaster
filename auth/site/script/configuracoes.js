// script/configuracoes.js

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('lista-usuarios');
    const usuarioModalElement = document.getElementById('usuarioModal');
    const modal = new bootstrap.Modal(usuarioModalElement);
    const form = document.getElementById('form-usuario');
    const modalTitle = document.getElementById('usuarioModalLabel');
    const campoSenha = document.getElementById('usuario_senha');

    let editMode = false;
    let editId = null;

    const carregarUsuarios = async () => {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm"></div> Carregando...</td></tr>`;
        try {
            const response = await fetch(`${API_BASE_URL}/configuracoes_api.php`);
            if (!response.ok) throw new Error('Erro na requisição');
            const usuarios = await response.json();
            
            tableBody.innerHTML = '';
            if (usuarios.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Nenhum usuário cadastrado.</td></tr>`;
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
                            <button class="btn btn-sm btn-warning btn-edit" data-id="${u.id}" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-danger btn-delete" data-id="${u.id}" title="Excluir"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
                tableBody.innerHTML += row;
            });
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar usuários.</td></tr>`;
            console.error('Falha ao carregar usuários:', error);
        }
    };

    const prepararEdicao = async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/configuracoes_api.php?id=${id}`);
            if (!response.ok) throw new Error('Usuário não encontrado');
            const usuario = await response.json();

            document.getElementById('usuario_nome').value = usuario.nome;
            document.getElementById('usuario_email').value = usuario.email;
            document.getElementById('usuario_telefone').value = usuario.telefone || '';
            document.getElementById('usuario_endereco').value = usuario.endereco || '';
            
            campoSenha.value = '';
            campoSenha.placeholder = 'Deixe em branco para não alterar';
            campoSenha.removeAttribute('required');

            editMode = true;
            editId = id;
            modalTitle.textContent = 'Editar Usuário';
            
            modal.show();
        } catch (error) {
            console.error('Erro ao buscar dados do usuário para edição:', error);
            alert('Não foi possível carregar os dados do usuário.');
        }
    };

    const resetarModal = () => {
        form.reset();
        editMode = false;
        editId = null;
        modalTitle.textContent = 'Adicionar Usuário';
        campoSenha.placeholder = '';
        campoSenha.setAttribute('required', 'required');
    };

    // --- LISTENER DO BOTÃO SALVAR (COM CORREÇÃO) ---
    document.getElementById('salvar-usuario-btn').addEventListener('click', async () => {
        const data = {
            id: editId, // Envia o ID no corpo para PUT e DELETE
            nome: document.getElementById('usuario_nome').value,
            email: document.getElementById('usuario_email').value,
            senha: campoSenha.value,
            telefone: document.getElementById('usuario_telefone').value,
            endereco: document.getElementById('usuario_endereco').value,
        };
        
        // Se estiver em modo de edição, adiciona o sinal _method
        if (editMode) {
            data._method = 'PUT';
        }

        try {
            const response = await fetch(`${API_BASE_URL}/configuracoes_api.php`, {
                method: 'POST', // Sempre usa POST
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Erro ao salvar usuário.');
            }
            
            alert(result.message);
            modal.hide();
            carregarUsuarios();
        } catch (error) {
            console.error('Falha ao salvar usuário:', error);
            alert(`Ocorreu um erro ao salvar: ${error.message}`);
        }
    });

    // --- LISTENER DA TABELA (COM CORREÇÃO) ---
    tableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const id = target.dataset.id;

        if (target.classList.contains('btn-delete')) {
            if (confirm('Deseja realmente excluir este usuário?')) {
                try {
                    const response = await fetch(`${API_BASE_URL}/configuracoes_api.php`, {
                        method: 'POST', // Sempre usa POST
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: id, _method: 'DELETE' }) // Envia o sinal _method
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
        } else if (target.classList.contains('btn-edit')) {
            prepararEdicao(id);
        }
    });

    usuarioModalElement.addEventListener('hidden.bs.modal', resetarModal);
    carregarUsuarios();
});