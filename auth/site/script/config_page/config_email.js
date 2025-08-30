document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES ---
    const formEmailConfig = document.getElementById('form-email-config');
    const btnTestarConexao = document.getElementById('testar-conexao-btn');
    const btnEnviarTeste = document.getElementById('enviar-teste-btn');

    // ===================================================================
    // FUNÇÕES DE CONFIGURAÇÃO DE E-MAIL
    // ===================================================================

    /**
     * Carrega todas as configurações de e-mail (servidor e template) do backend.
     */
    const carregarConfigEmail = async () => {
        try {
            // A API agora deve retornar tanto a config do servidor quanto o template
            const response = await fetch(`../../php/configuracoes_api.php?tipo=email_completo`);
            if (!response.ok) throw new Error('Erro ao buscar configurações de e-mail.');
            
            const config = await response.json();

            if (config && Object.keys(config).length > 0) {
                // Popula campos do servidor
                document.getElementById('email_account_type').value = config.email_account_type || 'imap';
                document.getElementById('email_incoming_host').value = config.email_incoming_host || '';
                document.getElementById('smtp_host').value = config.smtp_host || '';
                document.getElementById('smtp_port').value = config.smtp_port || '';
                document.getElementById('smtp_user').value = config.smtp_user || '';
                document.getElementById('smtp_pass').placeholder = config.smtp_pass_exists ? 'Preenchido (digite para alterar)' : 'Senha do e-mail';
                document.getElementById('smtp_security').value = config.smtp_security || 'tls';
                document.getElementById('smtp_auth').checked = config.smtp_auth !== '0';

                // Popula campos do template
                document.getElementById('email_subject_template').value = config.email_subject_template || 'OS: (N_OS_tag) - Cliente: (Nome_cliente_tag)';
                document.getElementById('email_body_template').value = config.email_body_template || `Olá (Nome_cliente_tag),\n\nSua Ordem de Serviço de número (N_OS_tag) foi atualizada.\nStatus atual: (Status_OS_tag)\n\nAgradecemos a preferência.\n\nAtenciosamente,\nEquipe de Suporte`;
            }
        } catch (error) {
            console.error('Falha ao carregar configurações de e-mail:', error);
            alert('Não foi possível carregar as configurações de e-mail.');
        }
    };

    /**
     * Salva todas as configurações de e-mail (servidor e template) no backend.
     */
    const salvarConfigEmail = async (event) => {
        event.preventDefault();
        const btn = document.getElementById('salvar-email-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';

        const data = {
            _method: 'PUT',
            tipo: 'email_completo', // Envia tudo de uma vez
            // Configs do Servidor
            email_account_type: document.getElementById('email_account_type').value,
            email_incoming_host: document.getElementById('email_incoming_host').value,
            smtp_host: document.getElementById('smtp_host').value,
            smtp_port: document.getElementById('smtp_port').value,
            smtp_user: document.getElementById('smtp_user').value,
            smtp_pass: document.getElementById('smtp_pass').value,
            smtp_security: document.getElementById('smtp_security').value,
            smtp_auth: document.getElementById('smtp_auth').checked ? 1 : 0,
            smtp_from_name: document.getElementById('smtp_from_name').value,
            smtp_from_email: document.getElementById('smtp_from_email').value,
            // Template do E-mail
            email_subject_template: document.getElementById('email_subject_template').value,
            email_body_template: document.getElementById('email_body_template').value,
        };

        try {
            const response = await fetch(`../../php/configuracoes_api.php`, {
                method: 'POST', // Usando POST para enviar o corpo com _method
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Erro ao salvar configurações.');
            }
            alert(result.message);
            document.getElementById('smtp_pass').value = ''; // Limpa o campo de senha por segurança
            document.getElementById('smtp_pass').placeholder = 'Preenchido (digite para alterar)';
        } catch (error) {
            console.error('Falha ao salvar configurações de e-mail:', error);
            alert(`Ocorreu um erro: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Salvar Configurações';
        }
    };

    /**
     * Testa a conexão com o servidor SMTP usando as credenciais fornecidas.
     */
    const testarConexaoSMTP = async () => {
        const btn = btnTestarConexao;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Testando...';

        const data = {
            acao: 'testar_smtp',
            smtp_host: document.getElementById('smtp_host').value,
            smtp_port: document.getElementById('smtp_port').value,
            smtp_user: document.getElementById('smtp_user').value,
            smtp_pass: document.getElementById('smtp_pass').value,
            smtp_security: document.getElementById('smtp_security').value,
            smtp_auth: document.getElementById('smtp_auth').checked ? 1 : 0,
        };

        // A senha é obrigatória para o teste, a menos que já exista uma salva
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

    /**
     * Envia um e-mail de teste usando o template e as configurações atuais.
     */
    const enviarEmailDeTeste = async () => {
        const btn = btnEnviarTeste;
        const destinatario = document.getElementById('test_email_recipient').value;

        if (!destinatario) {
            alert('Por favor, informe um e-mail de destinatário para o teste.');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enviando...';

        const data = {
            acao: 'enviar_teste',
            destinatario: destinatario,
            assunto: document.getElementById('email_subject_template').value,
            corpo: document.getElementById('email_body_template').value,
            // A API usará as configurações já salvas no servidor.
            // Se precisar testar com dados não salvos, eles devem ser enviados aqui.
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
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar E-mail de Teste';
        }
    };


    // --- EVENT LISTENERS ---
    formEmailConfig.addEventListener('submit', salvarConfigEmail);
    btnTestarConexao.addEventListener('click', testarConexaoSMTP);
    btnEnviarTeste.addEventListener('click', enviarEmailDeTeste);

    // --- INICIALIZAÇÃO ---
    carregarConfigEmail();
});