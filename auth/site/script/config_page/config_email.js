document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES ---
    const formEmailConfig = document.getElementById('form-email-config');
    const btnTestarEmail = document.getElementById('testar-email-btn');

    // ===================================================================
    // FUNÇÕES DE CONFIGURAÇÃO DE E-MAIL
    // ===================================================================

    const carregarConfigEmail = async () => {
        try {
            const response = await fetch(`../${API_BASE_URL}/configuracoes_api.php?tipo=email`);
            if (!response.ok) throw new Error('Erro ao buscar configurações de e-mail.');
            
            const config = await response.json();

            if (config && Object.keys(config).length > 0) {
                document.getElementById('email_account_type').value = config.email_account_type || 'imap';
                document.getElementById('email_incoming_host').value = config.email_incoming_host || '';
                document.getElementById('smtp_host').value = config.smtp_host || '';
                document.getElementById('smtp_port').value = config.smtp_port || '';
                document.getElementById('smtp_user').value = config.smtp_user || '';
                document.getElementById('smtp_pass').placeholder = 'Preenchido (digite para alterar)';
                document.getElementById('smtp_security').value = config.smtp_security || 'tls';
                document.getElementById('smtp_auth').checked = config.smtp_auth !== '0';
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
        };

        try {
            const response = await fetch(`../${API_BASE_URL}/configuracoes_api.php`, {
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
            btn.innerHTML = '<i class="fas fa-save"></i> Salvar Configurações';
        }
    };

    const testarConexaoEmail = async () => {
        const btn = btnTestarEmail;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Testando...';

        const data = {
            tipo: 'email',
            acao: 'testar',
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
        };

        if (!data.smtp_pass) {
             alert('Para testar a conexão, a senha do e-mail precisa ser preenchida no campo "Senha". Ela não será salva.');
             btn.disabled = false;
             btn.innerHTML = '<i class="fas fa-plug"></i> Testar Conexão (SMTP)';
             return;
        }

        try {
            const response = await fetch(`../${API_BASE_URL}/configuracoes_api.php`, {
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
            console.error('Falha ao testar conexão de e-mail:', error);
            alert(`Falha no teste: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plug"></i> Testar Conexão (SMTP)';
        }
    };

    // --- EVENT LISTENERS ---
    formEmailConfig.addEventListener('submit', salvarConfigEmail);
    btnTestarEmail.addEventListener('click', testarConexaoEmail);

    // --- INICIALIZAÇÃO ---
    carregarConfigEmail();
});