document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES ---
    const formEmailConfig = document.getElementById('form-email-config');
    const btnTestarConexao = document.getElementById('testar-conexao-btn');
    const btnEnviarTeste = document.getElementById('enviar-teste-btn');
    
    // Seletores da nova funcionalidade de teste real
    const btnAbrirModalOS = document.getElementById('btn-selecionar-os-modal');
    const btnEnviarTesteReal = document.getElementById('enviar-teste-real-btn');
    const inputInfoOS = document.getElementById('os-teste-real-info');
    const modalOS = new bootstrap.Modal(document.getElementById('modalSelecionarOS'));
    const tabelaOsModal = document.getElementById('tabela-os-modal');
    const filtroOsModal = document.getElementById('filtro-os-modal');
    
    let osSelecionadaId = null;

    // ===================================================================
    // FUNÇÕES DE CONFIGURAÇÃO DE E-MAIL (Salvar, Carregar)
    // ===================================================================

    const carregarConfigEmail = async () => {
        try {
            const response = await fetch(`../../php/configuracoes_api.php?tipo=email_completo`);
            if (!response.ok) throw new Error('Erro ao buscar configurações de e-mail.');
            
            const config = await response.json();

            if (config && Object.keys(config).length > 0) {
                document.getElementById('email_account_type').value = config.email_account_type || 'imap';
                document.getElementById('email_incoming_host').value = config.email_incoming_host || '';
                document.getElementById('smtp_host').value = config.smtp_host || '';
                document.getElementById('smtp_port').value = config.smtp_port || '';
                document.getElementById('smtp_user').value = config.smtp_user || '';
                document.getElementById('smtp_pass').placeholder = config.smtp_pass_exists ? 'Preenchido (digite para alterar)' : 'Senha do e-mail';
                document.getElementById('smtp_security').value = config.smtp_security || 'tls';
                document.getElementById('smtp_auth').checked = config.smtp_auth !== '0';
                document.getElementById('email_subject_template').value = config.email_subject_template || 'OS: (N_OS_tag) - Cliente: (Nome_cliente_tag)';
                document.getElementById('email_body_template').value = config.email_body_template || `Olá (Nome_cliente_tag),\n\nSua Ordem de Serviço de número (N_OS_tag) foi atualizada.\nStatus atual: (Status_OS_tag)\n\nAgradecemos a preferência.\n\nAtenciosamente,\nEquipe de Suporte`;
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
            tipo: 'email_completo',
            email_account_type: document.getElementById('email_account_type').value,
            email_incoming_host: document.getElementById('email_incoming_host').value,
            smtp_host: document.getElementById('smtp_host').value,
            smtp_port: document.getElementById('smtp_port').value,
            smtp_user: document.getElementById('smtp_user').value,
            smtp_pass: document.getElementById('smtp_pass').value,
            smtp_security: document.getElementById('smtp_security').value,
            smtp_auth: document.getElementById('smtp_auth').checked ? 1 : 0,
            email_subject_template: document.getElementById('email_subject_template').value,
            email_body_template: document.getElementById('email_body_template').value,
        };

        try {
            const response = await fetch(`../../php/configuracoes_api.php`, {
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
            document.getElementById('smtp_pass').placeholder = 'Preenchido (digite para alterar)';
        } catch (error) {
            console.error('Falha ao salvar configurações de e-mail:', error);
            alert(`Ocorreu um erro: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Salvar Todas as Configurações';
        }
    };

    // ===================================================================
    // FUNÇÕES DE TESTE DE E-MAIL
    // ===================================================================

    const testarConexaoSMTP = async () => {
        const btn = btnTestarConexao;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Testando...';

        const data = {
            // *** CORREÇÃO APLICADA AQUI ***
            tipo: 'email_completo', 
            acao: 'testar_smtp',
            smtp_host: document.getElementById('smtp_host').value,
            smtp_port: document.getElementById('smtp_port').value,
            smtp_user: document.getElementById('smtp_user').value,
            smtp_pass: document.getElementById('smtp_pass').value,
            smtp_security: document.getElementById('smtp_security').value,
            smtp_auth: document.getElementById('smtp_auth').checked ? 1 : 0,
        };

        if (!data.smtp_pass && document.getElementById('smtp_pass').placeholder.includes('alterar') === false) {
             alert('Para testar a conexão, a senha do e-mail precisa ser preenchida no campo "Senha". Ela não será salva com esta ação.');
             btn.disabled = false;
             btn.innerHTML = '<i class="fas fa-plug"></i> Testar Conexão (SMTP)';
             return;
        }

        try {
            const response = await fetch(`../../php/configuracoes_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Erro desconhecido no teste de conexão.');
            }
            alert(result.message);
        } catch (error) {
            console.error('Falha ao testar conexão SMTP:', error);
            alert(`Falha no teste: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plug"></i> Testar Conexão (SMTP)';
        }
    };

    const enviarEmailDeTesteSimples = async () => {
        const btn = btnEnviarTeste;
        const destinatario = document.getElementById('test_email_recipient').value;

        if (!destinatario) {
            alert('Por favor, informe um e-mail de destinatário para o teste.');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enviando...';

        const data = {
            tipo: 'email_completo',
            acao: 'enviar_teste_simples',
            destinatario: destinatario,
            assunto: document.getElementById('email_subject_template').value,
            corpo: document.getElementById('email_body_template').value,
        };

        try {
            const response = await fetch(`../../php/configuracoes_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Erro desconhecido ao enviar e-mail de teste.');
            }
            alert(result.message);
        } catch (error) {
            console.error('Falha ao enviar e-mail de teste:', error);
            alert(`Falha no envio: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar E-mail de Teste Simples';
        }
    };

    // ===================================================================
    // NOVA LÓGICA PARA TESTE REAL COM OS
    // ===================================================================

    const carregarOSParaModal = async () => {
        try {
            const response = await fetch('../../php/os_api.php');
            if (!response.ok) throw new Error('Falha ao buscar Ordens de Serviço.');
            const oss = await response.json();
            
            tabelaOsModal.innerHTML = ''; // Limpa a tabela
            if (oss.length === 0) {
                tabelaOsModal.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma OS encontrada.</td></tr>';
                return;
            }

            oss.forEach(os => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${os.id}</td>
                    <td>${os.cliente_nome}</td>
                    <td>${os.equipamento}</td>
                    <td><span class="badge bg-primary">${os.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary btn-selecionar-os" 
                                data-os-id="${os.id}" 
                                data-os-info="OS #${os.id} - ${os.cliente_nome}">
                            Selecionar
                        </button>
                    </td>
                `;
                tabelaOsModal.appendChild(tr);
            });
        } catch (error) {
            console.error(error);
            tabelaOsModal.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${error.message}</td></tr>`;
        }
    };
    
    const selecionarOS = (e) => {
        if (e.target.classList.contains('btn-selecionar-os')) {
            osSelecionadaId = e.target.dataset.osId;
            const osInfo = e.target.dataset.osInfo;
            
            inputInfoOS.value = osInfo;
            btnEnviarTesteReal.disabled = false;
            
            modalOS.hide();
        }
    };

    const filtrarOS = () => {
        const filtro = filtroOsModal.value.toLowerCase();
        const linhas = tabelaOsModal.getElementsByTagName('tr');
        for (let linha of linhas) {
            const textoLinha = linha.textContent.toLowerCase();
            linha.style.display = textoLinha.includes(filtro) ? '' : 'none';
        }
    };

    const enviarEmailTesteReal = async () => {
        if (!osSelecionadaId) {
            alert('Nenhuma OS foi selecionada para o teste.');
            return;
        }

        const btn = btnEnviarTesteReal;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enviando...';

        const data = {
            tipo: 'email_completo',
            acao: 'enviar_teste_real',
            os_id: osSelecionadaId
        };

        try {
            const response = await fetch(`../../php/configuracoes_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Erro desconhecido ao enviar e-mail de teste real.');
            }
            alert(result.message);
        } catch (error) {
            console.error('Falha ao enviar e-mail de teste real:', error);
            alert(`Falha no envio: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar E-mail de Teste Real';
        }
    };


    // --- EVENT LISTENERS ---
    formEmailConfig.addEventListener('submit', salvarConfigEmail);
    btnTestarConexao.addEventListener('click', testarConexaoSMTP);
    btnEnviarTeste.addEventListener('click', enviarEmailDeTesteSimples);
    
    // Listeners da nova funcionalidade
    btnAbrirModalOS.addEventListener('click', () => {
        carregarOSParaModal();
        modalOS.show();
    });
    tabelaOsModal.addEventListener('click', selecionarOS);
    filtroOsModal.addEventListener('keyup', filtrarOS);
    btnEnviarTesteReal.addEventListener('click', enviarEmailTesteReal);


    // --- INICIALIZAÇÃO ---
    carregarConfigEmail();
});